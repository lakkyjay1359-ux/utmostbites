import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

const phoneRe = /^(?:\+?254|0)(7|1)\d{8}$/;
const normalizePhone = (p: string) => {
  const d = p.replace(/[\s-]/g, "");
  if (d.startsWith("+254")) return "0" + d.slice(4);
  if (d.startsWith("254")) return "0" + d.slice(3);
  return d;
};

const lookupSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^UB[A-Z0-9]{4,8}$/, "Invalid order code"),
  phone: z.string().trim().regex(phoneRe, "Enter the phone used for the order"),
});

export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => lookupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, code, total, phone, payment_status")
      .eq("code", data.code)
      .maybeSingle();
    if (!order || order.phone !== phone) return { ok: false as const, error: "Order not found. Check the code and phone number." };
    if (order.payment_status === "paid") return { ok: false as const, error: "This order is already paid." };

    let origin = getRequestUrl().origin;
    // Safaricom must be able to reach the callback — localhost or preview URLs won't work.
    if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("id-preview")) {
      origin = "https://utmostbites.lovable.app";
    }
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
      await supabaseAdmin
        .from("orders")
        .update({ mpesa_checkout_request_id: checkoutRequestId, payment: "mpesa" })
        .eq("id", order.id);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not start M-Pesa payment." };
    }
  });

export const mpesaPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => lookupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("phone, payment_status, payment_ref")
      .eq("code", data.code)
      .maybeSingle();
    if (!order || order.phone !== normalizePhone(data.phone)) return { found: false as const };
    return { found: true as const, paymentStatus: order.payment_status, receipt: order.payment_ref };
  });
