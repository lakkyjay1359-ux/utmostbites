import { expect, it } from "vitest";
import { DELIVERY_AREAS, deliveryLocation } from "@/lib/site";

const OWNER_AREAS = [
  "ACK", "Amor Heights", "Around manna highway", "Behind the School", "Centre 84",
  "Diana Hostels", "Helida", "Kwa Moha", "Manna Highway", "Marenyo", "Olivia",
  "Olympus", "Opembi", "River Front", "Rome", "Total", "White House", "Yalla Villa", "Yellow House",
];

it("lists every delivery area the owner gave us", () => {
  expect(DELIVERY_AREAS).toHaveLength(OWNER_AREAS.length);
  for (const area of OWNER_AREAS) expect(DELIVERY_AREAS).toContain(area);
});

it("shows delivery areas in alphabetical order with no duplicates", () => {
  expect(DELIVERY_AREAS).toEqual([...DELIVERY_AREAS].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  expect(new Set(DELIVERY_AREAS).size).toBe(DELIVERY_AREAS.length);
});

it("builds the delivery note from the chosen area and the exact spot", () => {
  expect(deliveryLocation("ACK", "")).toBe("ACK");
  expect(deliveryLocation("ACK", " Room 12 ")).toBe("ACK — Room 12");
  expect(deliveryLocation("", "Behind the school gate")).toBe("Behind the school gate");
  expect(deliveryLocation("  ", "   ")).toBe("");
});

it("keeps the delivery note inside the limit the order schema accepts", () => {
  expect(deliveryLocation("Yellow House", "x".repeat(400)).length).toBeLessThanOrEqual(200);
});
