import { describe, expect, it } from "vitest";
import { isStorefrontPath, shouldStartVisit } from "@/lib/website-visits";
import { isOnlineOrder } from "@/lib/admin-push";

describe("website visit sessions", () => {
  it("does not count admin dashboard visits", () => {
    expect(isStorefrontPath("/admin")).toBe(false);
    expect(isStorefrontPath("/menu")).toBe(true);
  });
  it("keeps navigation within one visit until 30 minutes idle", () => {
    expect(shouldStartVisit(1000, 1000 + 29 * 60_000)).toBe(false);
    expect(shouldStartVisit(1000, 1000 + 30 * 60_000)).toBe(true);
  });
});
describe("admin phone alerts", () => {
  it("alerts for online orders, not walk-in POS sales", () => {
    expect(isOnlineOrder("online")).toBe(true);
    expect(isOnlineOrder("pos")).toBe(false);
  });
});