import { describe, expect, it } from "vitest";
import { nairobiDate, periodRange, stockStatus, summarize } from "@/lib/admin";

const o = (id: string, total: number, status: string, payment_status: string, payment = "cash") =>
  ({ id, total, status, payment_status, payment, created_at: "2026-10-15T10:00:00Z" });

describe("sales rules", () => {
  it("counts only completed and paid orders as revenue", () => {
    const s = summarize([o("a", 100, "Completed", "paid"), o("b", 200, "Completed", "pending"), o("c", 300, "Cancelled", "paid"), o("d", 50, "Completed", "refunded")]);
    expect(s.revenue).toBe(100);
    expect(s.completed).toBe(1);
    expect(s.cancelled).toBe(1);
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
