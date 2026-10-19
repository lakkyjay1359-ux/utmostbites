import { describe, expect, it } from "vitest";
import { canDeleteOrder, canDeleteStockMovement } from "@/lib/admin";

describe("admin deletion protections", () => {
  it("allows only failed-payment orders", () => {
    expect(canDeleteOrder("failed")).toBe(true);
    for (const status of ["pending", "paid", "refunded"]) expect(canDeleteOrder(status)).toBe(false);
  });
  it("allows deleting manual stock additions but protects order movements", () => {
    expect(canDeleteStockMovement({ kind: "adjust", order_id: null })).toBe(true);
    expect(canDeleteStockMovement({ kind: "restock", order_id: null })).toBe(true);
    expect(canDeleteStockMovement({ kind: "order_deduct", order_id: "order-id" })).toBe(false);
    expect(canDeleteStockMovement({ kind: "order_restore", order_id: null })).toBe(false);
  });
});