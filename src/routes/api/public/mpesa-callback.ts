import { createFileRoute } from "@tanstack/react-router";

// Safaricom Daraja STK-push callback. Daraja sends no signature, so we only
// ever update an order whose stored mpesa_checkout_request_id matches the
// CheckoutRequestID in the payload — anything else is ignored.
export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ack = () =>
          new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
            headers: { "Content-Type": "application/json" },
          });
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return ack();
        }
        const cb = payload?.Body?.stkCallback;
        const checkoutId: string | undefined = cb?.CheckoutRequestID;
        if (!cb || typeof checkoutId !== "string") return ack();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (cb.ResultCode === 0) {
          const items: { Name: string; Value?: unknown }[] = cb.CallbackMetadata?.Item ?? [];
          const get = (n: string) => items.find((i) => i.Name === n)?.Value;
          const receipt = typeof get("MpesaReceiptNumber") === "string" ? (get("MpesaReceiptNumber") as string) : null;
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "paid", payment_ref: receipt })
            .eq("mpesa_checkout_request_id", checkoutId)
            .eq("payment_status", "pending");
        } else {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("mpesa_checkout_request_id", checkoutId)
            .eq("payment_status", "pending");
        }
        return ack();
      },
    },
  },
});
