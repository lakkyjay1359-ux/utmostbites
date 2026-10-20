import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { to254 } from "./mpesa";

const normalizePhone = (p: string) => {
  const d = p.replace(/[\s-]/g, "");
  if (d.startsWith("+254")) return "0" + d.slice(4);
  if (d.startsWith("254")) return "0" + d.slice(3);
  return d;
};

const lookupSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^UB[A-Z0-9]{4,8}$/, "Invalid order code"),
  phone: z.string().trim().max(30).transform((p, ctx) => {
    try { return "0" + to254(p).slice(3); }
    catch (e) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: e instanceof Error ? e.message : "Invalid phone" }); return z.NEVER; }
  }),
});

export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => lookupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, code, total, phone, payment_status, status, mpesa_checkout_request_id")
      .eq("code", data.code)
      .maybeSingle();
    if (!order || order.phone !== phone) return { ok: false as const, error: "Order not found. Check the code and phone number." };
    if (order.payment_status === "paid") return { ok: false as const, error: "This order is already paid." };
    if (order.status === "Cancelled" || order.payment_status !== "pending") return { ok: false as const, error: "This order is not awaiting payment." };
    if (order.mpesa_checkout_request_id) {
      // Never send a second charge while the first attempt has an unresolved outcome.
      const { reconcilePayment } = await import("./mpesa-reconcile.server");
      try { await reconcilePayment(order.id); } catch { /* The safe response is still to avoid another charge. */ }
      return { ok: false as const, error: "An M-Pesa request already exists. Check payment status before paying again; do not resend if money was deducted." };
    }

    const { data: reserved, error: reserveError } = await supabaseAdmin.from("orders")
      .update({ mpesa_prompt_started_at: new Date().toISOString() })
      .eq("id", order.id).eq("payment_status", "pending").is("mpesa_checkout_request_id", null)
      .is("mpesa_prompt_started_at", null).select("id");
    if (reserveError || !reserved?.length) return { ok: false as const, error: reserveError?.message || "A payment request is already in progress. Do not pay again if money was deducted." };
    const origin = new URL(process.env["PUBLIC_SITE_URL"] || getRequestUrl().origin).origin;
    const callbackUrl = `${origin}/api/public/mpesa-callback`;
    console.error("M-Pesa callback URL:", callbackUrl);
    const { stkPush } = await import("./mpesa.server");
    try {
      const { checkoutRequestId } = await stkPush({
        phone,
        amount: order.total,
        orderCode: order.code,
        callbackUrl,
      });
      const { data: saved, error: saveError } = await supabaseAdmin
        .from("orders")
        .update({ mpesa_checkout_request_id: checkoutRequestId, payment: "mpesa", payment_note: null, mpesa_last_query_at: null })
        .eq("id", order.id).eq("payment_status", "pending").is("mpesa_checkout_request_id", null).select("id");
      if (saveError || !saved?.length) {
        console.error("M-Pesa checkout ID save error", saveError?.message || "Order changed before checkout ID was saved");
        return { ok: false as const, error: saveError?.message || "Could not save payment confirmation. If money was deducted, do not pay again; contact Utmost Bites." };
      }
      return { ok: true as const };
    } catch (e) {
      // A rejected request can be retried on the same order. Network errors are ambiguous,
      // so leave the reservation in place rather than risk charging twice.
      if (e instanceof Error && e.name === "DarajaRejection") {
        await supabaseAdmin.from("orders").update({ mpesa_prompt_started_at: null, payment_note: e.message })
          .eq("id", order.id).eq("payment_status", "pending").is("mpesa_checkout_request_id", null);
      }
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not start M-Pesa payment." };
    }
  });

export const mpesaPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => lookupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, phone, payment_status, payment_ref, payment_note, order_no")
      .eq("code", data.code)
      .maybeSingle();
    if (!order || order.phone !== normalizePhone(data.phone)) return { found: false as const };
    const { reconcilePayment } = await import("./mpesa-reconcile.server");
    let current;
    let queryError: string | null = null;
    try { current = await reconcilePayment(order.id); }
    catch (e) { queryError = e instanceof Error ? e.message : "Payment check unavailable"; }
    const result = current ?? order;
    return { found: true as const, paymentStatus: result.payment_status, receipt: result.payment_ref, orderNo: result.order_no, note: result.payment_note, queryError };
  });

export const adminCheckMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !allowed) throw new Error("Forbidden");
    const { reconcilePayment } = await import("./mpesa-reconcile.server");
    const order = await reconcilePayment(data.id);
    if (!order) throw new Error("Order not found");
    return { paymentStatus: order.payment_status, note: order.payment_note };
  });
