import { describe, expect, it } from "vitest";
import { formatOrderNo, parseOrderNo } from "@/lib/site";

describe("order numbers", () => {
  it("formats integer numbers with the A prefix", () => {
    expect([1, 2, 3, 12].map(formatOrderNo)).toEqual(["A1", "A2", "A3", "A12"]);
  });
  it("does not display a number before payment", () => {
    expect(formatOrderNo(null)).toBe("Awaiting payment");
  });
  it.each(["A12", "a12", "#12", "12"])("accepts %s as order 12", (input) => {
    expect(parseOrderNo(input)).toBe(12);
  });
  it.each(["0", "-12", "12.5", "A", "UB12", "2147483648"])("rejects invalid number %s", (input) => {
    expect(parseOrderNo(input)).toBeNull();
  });
});