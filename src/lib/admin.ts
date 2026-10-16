// Shared admin helpers: statuses, Nairobi time, period ranges, sales maths.
export const ORDER_STATUSES = ["Received", "Confirmed", "Preparing", "Ready for Collection", "Out for Delivery", "Completed", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const statusLabel = (s: string) => (s === "Received" ? "New" : s === "Ready" ? "Ready for Collection" : s);
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export const paymentLabel = (m: string) => m === "mpesa" ? "M-Pesa (STK push)" : m === "mpesa_on_delivery" ? "M-Pesa on delivery" : "Cash";

const NAIROBI_OFFSET = 3 * 3600_000; // Africa/Nairobi is UTC+3 all year (no DST)
export const nairobiDate = (ts: string | number | Date) => new Date(new Date(ts).getTime() + NAIROBI_OFFSET).toISOString().slice(0, 10);
export const fmtNairobi = (ts: string) => new Date(ts).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" });

export type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** Inclusive Nairobi date range [from, to] for a period containing `day` (YYYY-MM-DD). */
export function periodRange(period: Period, day: string, customTo?: string): { from: string; to: string } {
  if (period === "daily") return { from: day, to: day };
  if (period === "weekly") {
    const dow = (new Date(day + "T00:00:00Z").getUTCDay() + 6) % 7; // Monday = 0
    const from = addDays(day, -dow);
    return { from, to: addDays(from, 6) };
  }
  if (period === "monthly") {
    const [y, m] = day.split("-").map(Number) as [number, number];
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${day.slice(0, 7)}-01`, to: `${day.slice(0, 7)}-${String(last).padStart(2, "0")}` };
  }
  if (period === "yearly") return { from: `${day.slice(0, 4)}-01-01`, to: `${day.slice(0, 4)}-12-31` };
  return customTo && customTo >= day ? { from: day, to: customTo } : { from: day, to: day };
}
/** UTC ISO bounds for a Nairobi date range. */
export const rangeToUtc = (r: { from: string; to: string }) => ({
  start: new Date(`${r.from}T00:00:00+03:00`).toISOString(),
  end: new Date(`${addDays(r.to, 1)}T00:00:00+03:00`).toISOString(),
});

export type SaleOrder = { id: string; total: number; status: string; payment: string; payment_status: string; created_at: string };
/** Revenue counts received payments except cancelled orders. */
export const isSale = (o: SaleOrder) => o.status !== "Cancelled" && o.payment_status === "paid";
export const isOverduePayment = (o: SaleOrder, now = Date.now()) => o.payment_status === "pending" && o.status !== "Cancelled" && now - new Date(o.created_at).getTime() > 10 * 60_000;

export function summarize(orders: SaleOrder[]) {
  const uniq = [...new Map(orders.map((o) => [o.id, o])).values()];
  const done = uniq.filter(isSale);
  const revenue = done.reduce((s, o) => s + o.total, 0);
  const byMethod: Record<string, number> = { cash: 0, mpesa: 0, mpesa_on_delivery: 0 };
  for (const o of done) byMethod[o.payment] = (byMethod[o.payment] ?? 0) + o.total;
  return {
    orders: uniq.length,
    completed: uniq.filter((o) => o.status === "Completed").length,
    paid: uniq.filter((o) => o.payment_status === "paid").length,
    pending: uniq.filter((o) => o.payment_status === "pending").length,
    failed: uniq.filter((o) => o.payment_status === "failed").length,
    cancelled: uniq.filter((o) => o.status === "Cancelled").length,
    revenue,
    average: done.length ? Math.round(revenue / done.length) : 0,
    byMethod,
  };
}

export function stockStatus(q: number, min: number) {
  if (q <= 0) return "Out of Stock" as const;
  if (q <= min) return "Low Stock" as const;
  return "In Stock" as const;
}
