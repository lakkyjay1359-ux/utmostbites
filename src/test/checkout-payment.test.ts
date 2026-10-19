import { expect, it } from "vitest";
import { DEFAULT_CHECKOUT_PAYMENT } from "@/lib/site";

it("defaults checkout payment to the M-Pesa phone prompt", () => {
  expect(DEFAULT_CHECKOUT_PAYMENT).toBe("mpesa");
});