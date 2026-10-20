import { describe, expect, it } from "vitest";
import { to254, queryOutcome, queryReceipt, MPESA_QUERY_INTERVAL_MS, MPESA_WAIT_MS } from "@/lib/mpesa";

describe("M-Pesa phones", () => {
  it.each(["0712345678", "254712345678", "+254 712-345-678"])("normalizes %s", (phone) => expect(to254(phone)).toBe("254712345678"));
  it("accepts the 01 prefix", () => expect(to254("0112345678")).toBe("254112345678"));
  it.each(["071234567", "254612345678", "not a phone", "2547123456789"])("rejects %s", (phone) => expect(() => to254(phone)).toThrow("Enter a valid Safaricom number"));
});
describe("Daraja query outcomes", () => {
  it("confirms only a final zero result", () => expect(queryOutcome({ ResultCode: "0" })).toBe("paid"));
  it("does not confuse query acceptance with payment", () => expect(queryOutcome({ ResponseCode: "0" })).toBe("pending"));
  it.each(["9999", "", "5000"])("keeps processing/unknown code %s pending", (ResultCode) => expect(queryOutcome({ ResultCode })).toBe("pending"));
  it.each(["1032", "1037", "1", "2001"])("marks terminal %s failed", (ResultCode) => expect(queryOutcome({ ResultCode })).toBe("failed"));
  it("keeps provider errors unresolved", () => expect(queryOutcome({ errorMessage: "Request is being processed" })).toBe("pending"));
  it("never invents a query receipt", () => expect(queryReceipt({ ResultCode: "0" })).toBeNull());
  it("preserves an actual query receipt", () => expect(queryReceipt({ MpesaReceiptNumber: "TEST123456" })).toBe("TEST123456"));
  it("queries at most every ten seconds", () => expect(MPESA_QUERY_INTERVAL_MS).toBe(10000));
  it("waits two minutes before delayed confirmation", () => expect(MPESA_WAIT_MS).toBe(120000));
});