// Pure helpers for the Point of Sale view.
export type PosCatalogItem = {
  item_type: "product" | "combo";
  item_id: string;
  name: string;
  price: number;
  variants: { label: string; price: number }[] | null;
};
export type PosLine = {
  item_type: "product" | "combo";
  item_id: string;
  name: string;
  variant: string | null;
  unit_price: number;
  qty: number;
};

/** Case-insensitive partial name match, capped at 8 suggestions. */
export function matchCatalog(catalog: PosCatalogItem[], q: string): PosCatalogItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return catalog.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 8);
}

/** Add an item to the sale; same item + same variant increments quantity instead of duplicating. */
export function addLine(lines: PosLine[], item: PosCatalogItem, variant: string | null, unitPrice: number): PosLine[] {
  const i = lines.findIndex((l) => l.item_type === item.item_type && l.item_id === item.item_id && l.variant === variant);
  if (i >= 0) {
    const next = [...lines];
    next[i] = { ...next[i]!, qty: Math.min(50, next[i]!.qty + 1) };
    return next;
  }
  return [...lines, { item_type: item.item_type, item_id: item.item_id, name: item.name, variant, unit_price: unitPrice, qty: 1 }];
}

/** Clamp a typed quantity to a whole number 1–50. */
export const clampQty = (n: number) => (Number.isFinite(n) ? Math.min(50, Math.max(1, Math.round(n))) : 1);

export const lineTotal = (l: PosLine) => l.unit_price * l.qty;
export const saleTotal = (lines: PosLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);

/** Change due, or null when the amount received doesn't cover the total (or wasn't given). */
export function changeDue(total: number, received: number | null): number | null {
  if (received == null || !Number.isFinite(received) || received < total) return null;
  return received - total;
}
