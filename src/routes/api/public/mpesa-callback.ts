import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const callbackSchema = z.object({ Body: z.object({ stkCallback: z.object({
  CheckoutRequestID: z.string().min(1).max(150),
  ResultCode: z.number().int(), ResultDesc: z.string().max(1000),
  CallbackMetadata: z.object({ Item: z.array(z.object({ Name: z.string().max(80), Value: z.union([z.string().max(100), z.number()]).optional() })).max(20) }).optional(),
}) }) });

// Safaricom Daraja STK-push callback. Daraja sends no signature, so we only
// use the checkout ID only to locate the order, then independently query Daraja.
// An unsigned callback alone must never authorize a paid/failed transition.
export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ack = () =>
          new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
            headers: { "Content-Type": "application/json" },
          });
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return ack();
        }
        const parsed = callbackSchema.safeParse(payload);
        if (!parsed.success) return ack();
        const cb = parsed.data.Body.stkCallback;
        const checkoutId = cb.CheckoutRequestID;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order, error } = await supabaseAdmin.from("orders")
          .select("id").eq("mpesa_checkout_request_id", checkoutId).maybeSingle();
        if (error) { console.error("M-Pesa callback lookup error", error.message); return new Response("Retry later", { status: 503 }); }
        if (!order) { console.error("M-Pesa callback unmatched CheckoutRequestID:", checkoutId); return ack(); }
        try {
          const { reconcilePayment } = await import("@/lib/mpesa-reconcile.server");
          await reconcilePayment(order.id);
          // Query results provide the trusted status and failure description. Receipt metadata
          // is intentionally not persisted without a provider-authenticated receipt lookup.
        } catch (e) {
          console.error("M-Pesa callback verification error", e instanceof Error ? e.message : "Query unavailable");
          return new Response("Retry later", { status: 503 });
        }
        return ack();
      },
    },
  },
});
