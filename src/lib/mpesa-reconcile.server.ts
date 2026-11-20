import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MPESA_QUERY_INTERVAL_MS, queryOutcome, queryReceipt } from "./mpesa";
import { stkQuery } from "./mpesa.server";
import { sendOrderSms } from "./sms-alert.server";

export async function reconcilePayment(id: string) {
  const { data: order, error } = await supabaseAdmin.from("orders")
    .select("id, payment, payment_status, mpesa_checkout_request_id, payment_ref, payment_note, order_no")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return null;
  if (order.payment !== "mpesa" || order.payment_status !== "pending" || !order.mpesa_checkout_request_id) return order;
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - MPESA_QUERY_INTERVAL_MS).toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin.from("orders")
    .update({ mpesa_last_query_at: now }).eq("id", id).eq("payment_status", "pending")
    .eq("mpesa_checkout_request_id", order.mpesa_checkout_request_id)
    .or(`mpesa_last_query_at.is.null,mpesa_last_query_at.lte.${cutoff}`).select("id");
  if (claimError) throw new Error(claimError.message);
  if (!claimed?.length) return order;
  const result = await stkQuery(order.mpesa_checkout_request_id);
  const outcome = queryOutcome(result);
  if (outcome !== "pending") {
    const receipt = queryReceipt(result);
    const { data: flipped, error: saveError } = await supabaseAdmin.from("orders").update({
      payment_status: outcome, payment_note: result.ResultDesc ?? null,
      ...(receipt ? { payment_ref: receipt } : {}),
    }).eq("id", id).eq("mpesa_checkout_request_id", order.mpesa_checkout_request_id).eq("payment_status", "pending").select("id");
    if (saveError) { console.error("M-Pesa query save error", saveError.message); throw new Error(saveError.message); }
    // Only the call that actually changed the status sends the alert, so it goes out once.
    if (outcome === "paid" && flipped?.length) await sendOrderSms(id, "paid");
  }
  const { data: current, error: readError } = await supabaseAdmin.from("orders")
    .select("id, payment, payment_status, mpesa_checkout_request_id, payment_ref, payment_note, order_no").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  return current;
}