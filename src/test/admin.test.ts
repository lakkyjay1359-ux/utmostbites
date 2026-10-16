import { describe, expect, it } from "vitest";
import { isSale, isOverduePayment, nairobiDate, periodRange, stockStatus, summarize } from "@/lib/admin";

const o = (id: string, total: number, status: string, payment_status: string, payment = "cash") =>
  ({ id, total, status, payment_status, payment, created_at: "2026-10-15T10:00:00Z" });

describe("sales rules", () => {
  it("counts paid non-cancelled orders immediately as revenue", () => {
    const s = summarize([o("a", 100, "Completed", "paid"), o("b", 200, "Completed", "pending"), o("c", 300, "Cancelled", "paid"), o("d", 50, "Completed", "refunded"), o("e", 70, "Received", "paid", "mpesa")]);
    expect(s.revenue).toBe(170);
    expect(s.completed).toBe(3);
    expect(s.cancelled).toBe(1);
  });
  it("excludes cancelled and refunded orders", () => {
    expect(isSale(o("c", 300, "Cancelled", "paid"))).toBe(false);
    expect(isSale(o("r", 50, "Preparing", "refunded"))).toBe(false);
  });
  it("counts payment states and separates all three methods", () => {
    const s = summarize([o("a", 20, "Received", "paid"), o("b", 60, "Preparing", "paid", "mpesa"), o("c", 40, "Completed", "paid", "mpesa_on_delivery"), o("d", 10, "Received", "pending"), o("e", 10, "Received", "failed")]);
    expect(s.byMethod).toEqual({ cash: 20, mpesa: 60, mpesa_on_delivery: 40 });
    expect([s.paid, s.pending, s.failed]).toEqual([3, 1, 1]);
  });
  it("flags pending payment only after ten minutes", () => {
    const pending = o("a", 20, "Received", "pending");
    const start = new Date(pending.created_at).getTime();
    expect(isOverduePayment(pending, start + 600_000)).toBe(false);
    expect(isOverduePayment(pending, start + 600_001)).toBe(true);
    expect(isOverduePayment(o("b", 20, "Cancelled", "pending"), start + 600_001)).toBe(false);
  });
  it("does not double count the same order", () => {
    expect(summarize([o("a", 100, "Completed", "paid"), o("a", 100, "Completed", "paid")]).revenue).toBe(100);
  });
  it("uses Nairobi time for the day", () => {
    expect(nairobiDate("2026-10-15T22:30:00Z")).toBe("2026-10-16");
  });
  it("weekly period runs Monday to Sunday", () => {
    expect(periodRange("weekly", "2026-10-15")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });
  it("flags low stock at or below minimum", () => {
    expect(stockStatus(5, 5)).toBe("Low Stock");
    expect(stockStatus(0, 5)).toBe("Out of Stock");
    expect(stockStatus(6, 5)).toBe("In Stock");
  });
});
