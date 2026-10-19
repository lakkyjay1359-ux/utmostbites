import { describe, expect, it } from "vitest";
import { addLine, changeDue, clampQty, lineTotal, matchCatalog, saleTotal, type PosCatalogItem } from "@/lib/pos";

const catalog: PosCatalogItem[] = [
  { item_type: "product", item_id: "1", name: "Samosa (Ndengu)", price: 30, variants: null },
  { item_type: "product", item_id: "2", name: "Samosa (Meat)", price: 50, variants: null },
  { item_type: "product", item_id: "3", name: "Fried Chicken", price: 200, variants: [{ label: "Quarter", price: 200 }, { label: "Half", price: 350 }] },
  { item_type: "combo", item_id: "4", name: "Morning Combo", price: 150, variants: null },
];

describe("pos helpers", () => {
  it("matches names case-insensitively and partially", () => {
    expect(matchCatalog(catalog, "sam").map((c) => c.name)).toEqual(["Samosa (Ndengu)", "Samosa (Meat)"]);
    expect(matchCatalog(catalog, "CHICKEN")).toHaveLength(1);
    expect(matchCatalog(catalog, "  ")).toEqual([]);
    expect(matchCatalog(catalog, "zzz")).toEqual([]);
  });
  it("adds a new line with quantity 1", () => {
    const lines = addLine([], catalog[0]!, null, 30);
    expect(lines).toEqual([{ item_type: "product", item_id: "1", name: "Samosa (Ndengu)", variant: null, unit_price: 30, qty: 1 }]);
  });
  it("merges the same item and variant instead of duplicating", () => {
    let lines = addLine([], catalog[2]!, "Half", 350);
    lines = addLine(lines, catalog[2]!, "Half", 350);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.qty).toBe(2);
  });
  it("keeps different variants on separate lines", () => {
    let lines = addLine([], catalog[2]!, "Quarter", 200);
    lines = addLine(lines, catalog[2]!, "Half", 350);
    expect(lines).toHaveLength(2);
  });
  it("clamps quantities to 1–50", () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(51)).toBe(50);
    expect(clampQty(3.6)).toBe(4);
    expect(clampQty(NaN)).toBe(1);
  });
  it("computes line and sale totals", () => {
    const lines = addLine(addLine([], catalog[0]!, null, 30), catalog[3]!, null, 150);
    expect(lineTotal(lines[0]!)).toBe(30);
    expect(saleTotal(lines)).toBe(180);
  });
  it("computes change due only when the cash covers the total", () => {
    expect(changeDue(180, 200)).toBe(20);
    expect(changeDue(180, 180)).toBe(0);
    expect(changeDue(180, 100)).toBeNull();
    expect(changeDue(180, null)).toBeNull();
  });
});
