import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  key: string;
  type: "product" | "combo";
  id: string;
  name: string;
  variant?: string | undefined;
  price: number;
  qty: number;
  image_key?: string | null;
};

type Ctx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const STORAGE = "utmost-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<Ctx>(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.price, 0),
    add: (item, qty = 1) => {
      const key = `${item.type}:${item.id}:${item.variant ?? ""}`;
      setItems((prev) => {
        const ex = prev.find((p) => p.key === key);
        if (ex) return prev.map((p) => (p.key === key ? { ...p, qty: Math.min(50, p.qty + qty) } : p));
        return [...prev, { ...item, key, qty }];
      });
    },
    setQty: (key, qty) =>
      setItems((prev) => (qty <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => (p.key === key ? { ...p, qty: Math.min(50, qty) } : p)))),
    remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
    clear: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
