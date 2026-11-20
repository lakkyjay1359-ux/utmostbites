// Owner phone alerts by SMS through Africa's Talking. Server-only.
// Needs three settings in Cloudflare: AT_USERNAME, AT_API_KEY (secret) and ALERT_PHONES
// (one or more numbers, separated by commas, e.g. 0712345678,0798765432).
// Optional: AT_SENDER_ID (an approved sender name). Anything missing means "do nothing".
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { to254 } from "./mpesa";
import { formatOrderNo } from "./site";

export type SmsKind = "new" | "paid";

type OrderRow = {
  code: string; order_no: number | null; total: number; customer_name: string; phone: string;
  fulfillment: string; location: string | null; payment: string; payment_ref: string | null;
};

const paymentLabel = (p: string) => p === "cash" ? "Cash" : p === "mpesa_on_delivery" ? "M-Pesa to staff" : "M-Pesa";

export function buildOrderSms(o: OrderRow, kind: SmsKind): string {
  const where = o.fulfillment === "delivery" ? `DELIVERY ${o.location ?? ""}`.trim() : "PICKUP";
  const head = kind === "paid"
    ? `PAID ${formatOrderNo(o.order_no)} (${o.code}) KSh ${o.total}${o.payment_ref ? ` ref ${o.payment_ref}` : ""}`
    : `NEW ORDER ${o.code} KSh ${o.total} - ${paymentLabel(o.payment)} on ${o.fulfillment}`;
  return `Utmost Bites: ${head}. ${where}. ${o.customer_name} ${o.phone}`.slice(0, 300);
}

const recipients = (): string[] =>
  (process.env["ALERT_PHONES"] ?? "").split(",").map((s) => s.trim()).filter(Boolean).flatMap((n) => {
    try { return ["+" + to254(n)]; } catch { return []; }
  });

/** Never throws: a messaging problem must not break checkout or payment confirmation. */
export async function sendOrderSms(orderId: string, kind: SmsKind): Promise<void> {
  try {
    const username = process.env["AT_USERNAME"];
    const apiKey = process.env["AT_API_KEY"];
    const to = recipients();
    if (!username || !apiKey || !to.length) return;
    const { data: order, error } = await supabaseAdmin.from("orders")
      .select("code, order_no, total, customer_name, phone, fulfillment, location, payment, payment_ref")
      .eq("id", orderId).maybeSingle();
    if (error || !order) { console.error("SMS alert: order not found"); return; }
    const body = new URLSearchParams({ username, to: to.join(","), message: buildOrderSms(order as OrderRow, kind) });
    const sender = process.env["AT_SENDER_ID"];
    if (sender) body.set("from", sender);
    const base = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
    const res = await fetch(`${base}/version1/messaging`, {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) console.error("SMS alert failed", res.status); // response body is not logged
  } catch (e) {
    console.error("SMS alert could not be sent", e instanceof Error ? e.message : "error");
  }
}
