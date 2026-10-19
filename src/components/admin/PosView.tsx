import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS, formatOrderNo, ksh } from "@/lib/site";
import { fmtNairobi, nairobiDate, paymentLabel, stockStatus } from "@/lib/admin";
import { addLine, changeDue, clampQty, lineTotal, matchCatalog, saleTotal, type PosCatalogItem, type PosLine } from "@/lib/pos";

const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base";
const btn = "rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50";
const btnGhost = "rounded-full border border-border px-3 py-2 text-sm font-semibold hover:bg-muted";

type WalkinOrder = {
  id: string; order_no: number | null; total: number; payment: string; created_at: string;
  order_items: { name: string; variant: string | null; qty: number }[];
};
type Receipt = {
  order_no: number | null; total: number; payment: string; created_at: string;
  lines: PosLine[]; received: number | null; change: number | null; customer: string;
};

export function PosView() {
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [pendingVariant, setPendingVariant] = useState<PosCatalogItem | null>(null);
  const [lines, setLines] = useState<PosLine[]>([]);
  const [payment, setPayment] = useState<"cash" | "mpesa">("cash");
  const [received, setReceived] = useState("");
  const [mpesaRef, setMpesaRef] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const { data: catalog } = useQuery({
    queryKey: ["admin", "pos-catalog"],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("products").select("id,name,price,variants").eq("available", true).order("sort"),
        supabase.from("combos").select("id,name,price").eq("available", true).order("sort"),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      const items: PosCatalogItem[] = [
        ...(p.data ?? []).map((x) => ({ item_type: "product" as const, item_id: x.id, name: x.name, price: x.price, variants: (x.variants as PosCatalogItem["variants"]) ?? null })),
        ...(c.data ?? []).map((x) => ({ item_type: "combo" as const, item_id: x.id, name: x.name, price: x.price, variants: null })),
      ];
      return items;
    },
  });
  const { data: stockInfo } = useQuery({
    queryKey: ["admin", "pos-stock"],
    queryFn: async () => {
      const [s, i] = await Promise.all([supabase.from("stock_items").select("id,name,unit,quantity,min_level"), supabase.from("product_ingredients").select("product_id,stock_item_id,qty")]);
      return { stock: s.data ?? [], ingr: i.data ?? [] };
    },
  });
  const { data: todaySales } = useQuery({
    queryKey: ["admin", "pos-today"],
    queryFn: async () => {
      const start = new Date(`${nairobiDate(Date.now())}T00:00:00+03:00`).toISOString();
      const { data, error } = await supabase.from("orders").select("id,order_no,total,payment,created_at,order_items(name,variant,qty)").eq("source", "pos").gte("created_at", start).order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WalkinOrder[];
    },
  });

  const matches = useMemo(() => matchCatalog(catalog ?? [], q), [catalog, q]);
  const total = saleTotal(lines);
  const receivedNum = received.trim() === "" ? null : Number(received);
  const change = changeDue(total, receivedNum);

  // Warn (never block) when a line would push an ingredient below zero or to low stock.
  const stockWarnings = useMemo(() => {
    if (!stockInfo) return [];
    const used = new Map<string, number>();
    for (const l of lines.filter((x) => x.item_type === "product")) {
      for (const ing of stockInfo.ingr.filter((i) => i.product_id === l.item_id)) {
        used.set(ing.stock_item_id, (used.get(ing.stock_item_id) ?? 0) + Number(ing.qty) * l.qty);
      }
    }
    const warns: string[] = [];
    for (const [id, u] of used) {
      const s = stockInfo.stock.find((x) => x.id === id);
      if (!s) continue;
      const left = Number(s.quantity) - u;
      if (left < 0) warns.push(`${s.name}: this sale needs ${u} ${s.unit} but only ${s.quantity} ${s.unit} in stock`);
      else if (stockStatus(left, Number(s.min_level)) !== "In Stock") warns.push(`${s.name}: will be ${stockStatus(left, Number(s.min_level)).toLowerCase()} after this sale (${left} ${s.unit} left)`);
    }
    return warns;
  }, [lines, stockInfo]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const pick = (item: PosCatalogItem) => {
    if (item.variants?.length) { setPendingVariant(item); return; }
    setLines((ls) => addLine(ls, item, null, item.price));
    setQ(""); setHi(0); searchRef.current?.focus();
  };
  const pickVariant = (label: string, price: number) => {
    if (!pendingVariant) return;
    setLines((ls) => addLine(ls, pendingVariant, label, price));
    setPendingVariant(null); setQ(""); setHi(0); searchRef.current?.focus();
  };
  const setQty = (i: number, qty: number) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, qty: clampQty(qty) } : l)));
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, k) => k !== i));
  const clear = () => { setLines([]); setReceived(""); setMpesaRef(""); setCustName(""); setCustPhone(""); setCustOpen(false); setQ(""); searchRef.current?.focus(); };

  const complete = async () => {
    if (!lines.length || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_pos_sale", {
      _items: lines.map((l) => ({ item_type: l.item_type, item_id: l.item_id, variant: l.variant, qty: l.qty })),
      _payment: payment,
      _customer_name: custName || null,
      _phone: custPhone || null,
      _payment_ref: payment === "mpesa" ? mpesaRef || null : null,
    } as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; } // sale stays on screen
    const r = data as unknown as { order_no: number | null; total: number };
    setReceipt({ order_no: r.order_no, total: r.total, payment, created_at: new Date().toISOString(), lines, received: receivedNum, change, customer: custName.trim() || "Walk-in" });
    toast.success(`Sale ${formatOrderNo(r.order_no)} complete — ${ksh(r.total)}`);
    clear();
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) pick(matches[hi]!); }
  };

  const todayTotal = (todaySales ?? []).reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); void complete(); } }}>
      <h1 className="text-3xl font-bold text-gold">Point of Sale</h1>

      <div className="panel space-y-4 p-4">
        {/* search */}
        <div className="relative">
          <input ref={searchRef} className={input} placeholder="Search item e.g. samosa…" aria-label="Search item" value={q}
            onChange={(e) => { setQ(e.target.value); setHi(0); }} onKeyDown={onSearchKey} autoComplete="off" />
          {!!matches.length && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg" role="listbox">
              {matches.map((m, i) => (
                <li key={`${m.item_type}-${m.item_id}`}>
                  <button type="button" role="option" aria-selected={i === hi}
                    className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm ${i === hi ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onMouseEnter={() => setHi(i)} onClick={() => pick(m)}>
                    <span className="font-semibold">{m.name}{m.item_type === "combo" && <span className="ml-2 text-xs opacity-70">Combo</span>}</span>
                    <span>{m.variants?.length ? `from ${ksh(m.variants[0]!.price)}` : ksh(m.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* variant picker */}
        {pendingVariant && (
          <div className="rounded-lg border border-primary p-3">
            <p className="mb-2 text-sm font-semibold">Size for {pendingVariant.name}?</p>
            <div className="flex flex-wrap gap-2">
              {pendingVariant.variants!.map((v) => (
                <button key={v.label} type="button" className={btn} onClick={() => pickVariant(v.label, v.price)}>{v.label} · {ksh(v.price)}</button>
              ))}
              <button type="button" className={btnGhost} onClick={() => setPendingVariant(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* lines */}
        {lines.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {lines.map((l, i) => (
              <li key={`${l.item_type}-${l.item_id}-${l.variant}`} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 font-semibold">{l.name}{l.variant ? ` (${l.variant})` : ""}<span className="ml-2 text-sm text-muted-foreground">{ksh(l.unit_price)}</span></span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={`Reduce ${l.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg" onClick={() => setQty(i, l.qty - 1)}>−</button>
                  <input aria-label={`Quantity of ${l.name}`} inputMode="numeric" className="h-9 w-14 rounded-lg border border-input bg-background text-center" value={l.qty}
                    onChange={(e) => setQty(i, Number(e.target.value))} />
                  <button type="button" aria-label={`Increase ${l.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg" onClick={() => setQty(i, l.qty + 1)}>+</button>
                </span>
                <span className="w-20 text-right font-bold">{ksh(lineTotal(l))}</span>
                <button type="button" aria-label={`Remove ${l.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-muted" onClick={() => removeLine(i)}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Search above to add items to the sale.</p>}

        {!!stockWarnings.length && (
          <div className="rounded-lg border border-destructive p-3 text-sm text-destructive">
            {stockWarnings.map((w) => <p key={w}>⚠ {w}</p>)}
          </div>
        )}

        {/* payment */}
        <div className="flex flex-wrap items-center gap-2">
          {(["cash", "mpesa"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setPayment(m)} className={`${btnGhost} ${payment === m ? "bg-primary text-primary-foreground" : ""}`}>{m === "cash" ? "Cash" : "M-Pesa (till)"}</button>
          ))}
          {payment === "cash" && (
            <input className={`${input} w-40`} inputMode="numeric" placeholder="Amount received" aria-label="Amount received" value={received} onChange={(e) => setReceived(e.target.value)} />
          )}
          {payment === "mpesa" && (
            <input className={`${input} w-56`} placeholder="M-Pesa reference (optional)" aria-label="M-Pesa reference" value={mpesaRef} onChange={(e) => setMpesaRef(e.target.value)} />
          )}
        </div>
        {payment === "cash" && change != null && <p className="text-lg font-bold text-fresh">Change due: {ksh(change)}</p>}

        {/* customer */}
        <div>
          <button type="button" className="text-sm underline" onClick={() => setCustOpen((o) => !o)}>{custOpen ? "Hide customer details" : "Add customer details (optional)"}</button>
          {custOpen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input className={input} placeholder="Customer name (default: Walk-in)" aria-label="Customer name" value={custName} onChange={(e) => setCustName(e.target.value)} />
              <input className={input} inputMode="tel" placeholder="Phone (optional)" aria-label="Customer phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
            </div>
          )}
        </div>

        {/* total + actions — sticky on mobile */}
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-3">
          <p className="text-2xl font-bold text-gold">Total: {ksh(total)}</p>
          <button type="button" className={btn} disabled={!lines.length || busy} onClick={() => void complete()}>{busy ? "Saving…" : "Complete sale"}</button>
          <button type="button" className={btnGhost} onClick={clear} disabled={!lines.length && !received && !mpesaRef}>Clear</button>
          {receipt && <button type="button" className={`${btnGhost} flex items-center gap-1`} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print receipt {formatOrderNo(receipt.order_no)}</button>}
        </div>
      </div>

      {/* today's walk-in sales */}
      <section className="space-y-2">
        <h2 className="text-xl font-bold text-primary">Today's walk-in sales</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border"><tr>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Time</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Receipt</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Items</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Payment</th>
              <th className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {(todaySales ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtNairobi(o.created_at)}</td>
                  <td className="px-3 py-2 font-bold">{formatOrderNo(o.order_no)}</td>
                  <td className="px-3 py-2">{o.order_items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ")}</td>
                  <td className="px-3 py-2">{paymentLabel(o.payment)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{ksh(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!todaySales?.length && <p className="p-6 text-center text-muted-foreground">No walk-in sales yet today.</p>}
        </div>
        <p className="text-lg font-bold text-gold">Today so far: {ksh(todayTotal)}</p>
      </section>

      {/* print-only receipt */}
      {receipt && (
        <div className="print-receipt" aria-hidden="true">
          <p className="pr-name">{BUSINESS.name}</p>
          <p>{BUSINESS.location} · {BUSINESS.phoneDisplay}</p>
          <p>Receipt {formatOrderNo(receipt.order_no)} · {fmtNairobi(receipt.created_at)}</p>
          <p>Customer: {receipt.customer}</p>
          <hr />
          {receipt.lines.map((l, i) => (
            <p key={i} className="pr-line"><span>{l.qty}× {l.name}{l.variant ? ` (${l.variant})` : ""}</span><span>{ksh(lineTotal(l))}</span></p>
          ))}
          <hr />
          <p className="pr-line pr-total"><span>TOTAL</span><span>{ksh(receipt.total)}</span></p>
          <p>Paid by: {receipt.payment === "cash" ? "Cash" : "M-Pesa (till)"}</p>
          {receipt.payment === "cash" && receipt.received != null && <p>Received {ksh(receipt.received)}{receipt.change != null ? ` · Change ${ksh(receipt.change)}` : ""}</p>}
          <p>Asante! Fuel for the Yala Hustle.</p>
        </div>
      )}
    </div>
  );
}
