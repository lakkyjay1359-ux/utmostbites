import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatOrderNo, parseOrderNo, ksh } from "@/lib/site";
import { CopyButton } from "@/components/site/CopyButton";
import { DeleteControl } from "@/components/admin/DeleteControl";
import { CheckPaymentButton } from "@/components/admin/CheckPaymentButton";
import { WebsiteActivity } from "@/components/admin/WebsiteActivity";
import { IMAGE_KEYS, imageFor } from "@/lib/images";
import {
  ORDER_STATUSES, PAYMENT_STATUSES, canDeleteOrder, canDeleteStockMovement, statusLabel, paymentLabel, fmtNairobi, nairobiDate,
  periodRange, rangeToUtc, summarize, isSale, isOverduePayment, stockStatus, type Period, type SaleOrder,
} from "@/lib/admin";

const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const btn = "rounded-full bg-gold px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";
const btnGhost = "rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted";
const th = "px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground";
const td = "px-3 py-2 align-top";

const fail = (e: { message: string } | null) => { if (e) { toast.error(e.message); return true; } return false; };

function Card({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return <div className="panel p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone ?? "text-gold"}`}>{value}</p></div>;
}
function Badge({ children, tone = "border-border" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>;
}
const statusTone = (s: string) => s === "Received" ? "border-accent text-accent" : s === "Completed" ? "border-fresh text-fresh" : s === "Cancelled" ? "border-destructive text-destructive" : "border-primary text-primary";
const payTone = (s: string) => s === "paid" ? "border-fresh text-fresh" : s === "failed" || s === "refunded" ? "border-destructive text-destructive" : "border-border text-muted-foreground";
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4" onClick={onClose}>
      <div className="panel mt-10 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-gold">{title}</h3><button className="text-sm underline" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}
function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm"><thead className="border-b border-border"><tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{children}</tbody></table>
      {empty && <p className="p-6 text-center text-muted-foreground">Nothing here yet.</p>}
    </div>
  );
}

/* ---------- data ---------- */
type Order = SaleOrder & { order_no: number | null; customer_name: string; phone: string; fulfillment: string; location: string | null; instructions: string | null; payment_ref: string | null; payment_note: string | null; source: string; order_items: { name: string; variant: string | null; qty: number; unit_price: number; line_total: number }[] };
const useOrders = () => useQuery({
  queryKey: ["admin", "orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*, order_items(name,variant,qty,unit_price,line_total)").order("created_at", { ascending: false }).limit(300);
    if (error) throw error; return data as unknown as Order[];
  },
});
const useStock = () => useQuery({
  queryKey: ["admin", "stock"],
  queryFn: async () => { const { data, error } = await supabase.from("stock_items").select("*").order("name"); if (error) throw error; return data; },
});

/* ---------- dashboard ---------- */
export function DashboardView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: orders, isLoading } = useOrders();
  const { data: stock } = useStock();
  if (isLoading || !orders) return <p className="text-muted-foreground">Loading…</p>;
  const today = nairobiDate(Date.now());
  const todays = orders.filter((o) => nairobiDate(o.created_at) === today);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gold">Dashboard</h1>
      <WebsiteActivity />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="New orders" value={orders.filter((o) => o.status === "Received").length} tone="text-accent" />
        <Card label="Being prepared" value={orders.filter((o) => o.status === "Preparing").length} />
        <Card label="Completed today" value={todays.filter((o) => o.status === "Completed").length} tone="text-fresh" />
        <Card label="Today's sales" value={ksh(todays.filter(isSale).reduce((s, o) => s + o.total, 0))} />
        <Card label="Low-stock items" value={(stock ?? []).filter((s) => stockStatus(s.quantity, s.min_level) !== "In Stock").length} tone="text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-primary">Recent orders</h2>
      <OrderTable orders={orders.slice(0, 10)} onOpen={onOpen} />
    </div>
  );
}

function OrderTable({ orders, onOpen }: { orders: Order[]; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  return (
    <Table head={["Order", "Customer", "Total", "Payment", "Status", "Date & time", ""]} empty={!orders.length}>
      {orders.map((o) => (
        <tr key={o.id}>
          <td className={`${td} font-bold`}>{formatOrderNo(o.order_no)}{o.source === "pos" && <> <Badge tone="border-primary text-primary">Walk-in</Badge></>}</td><td className={td}>{o.customer_name}</td><td className={td}>{ksh(o.total)}</td>
          <td className={td}><p>{paymentLabel(o.payment)}</p><Badge tone={payTone(o.payment_status)}>{o.payment_status}</Badge>{o.payment_ref && <p className="select-all text-xs">{o.payment_ref}</p>}{o.payment_note && <p className="mt-1 text-xs">{o.payment_note}</p>}{o.payment === "mpesa" && o.payment_status === "pending" && <CheckPaymentButton id={o.id} />}</td>
          <td className={td}><Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge></td>
          <td className={`${td} whitespace-nowrap`}>{fmtNairobi(o.created_at)}</td>
          <td className={`${td} whitespace-nowrap`}><button className={btnGhost} onClick={() => onOpen(o.id)}>View</button>{" "}
            <DeleteControl label={`Delete order for ${o.customer_name}`} disabled={!canDeleteOrder(o.payment_status)} confirmation={`Delete the failed-payment order for ${o.customer_name}? This cannot be undone.`} onDelete={async () => {
              const { data, error } = await supabase.from("orders").delete().eq("id", o.id).eq("payment_status", "failed").select("id");
              if (error) throw new Error(error.message);
              if (!data?.length) throw new Error("Order was not deleted. Only failed payments can be deleted.");
              await qc.invalidateQueries({ queryKey: ["admin"] });
            }} /></td>
        </tr>
      ))}
    </Table>
  );
}

/* ---------- orders ---------- */
export function OrdersView({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const { data: orders, isLoading, error } = useOrders();
  const [filter, setFilter] = useState("all");
  const [source, setSource] = useState<"all" | "online" | "pos">("all");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !orders) return <p className="text-destructive">Couldn't load orders.</p>;
  const shown = orders.filter((o) => (filter === "all" || o.status === filter) && (source === "all" || o.source === source) && (!search.trim() || o.order_no === parseOrderNo(search)));
  const open = orders.find((o) => o.id === openId);
  const update = async (id: string, patch: Record<string, string>) => {
    const { error } = await supabase.from("orders").update(patch as never).eq("id", id);
    if (!fail(error)) { toast.success("Order updated"); qc.invalidateQueries({ queryKey: ["admin"] }); }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-gold">Orders</h1>
      <p className="text-sm text-muted-foreground">New orders appear here automatically.</p>
      <div className="flex flex-wrap gap-2">
        {["all", ...ORDER_STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={`${btnGhost} ${filter === s ? "bg-primary text-primary-foreground" : ""}`}>{s === "all" ? "All" : statusLabel(s)}</button>)}
        <span className="mx-1 border-l border-border" />
        {([["all", "All sources"], ["online", "Online"], ["pos", "Walk-in"]] as const).map(([v, l]) => <button key={v} onClick={() => setSource(v)} className={`${btnGhost} ${source === v ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>)}
      </div>
      <input className={input} aria-label="Search order number" placeholder="Search order number e.g. A12" value={search} onChange={(e) => setSearch(e.target.value)} />
      <OrderTable orders={shown} onOpen={setOpenId} />
      {open && (
        <Modal title={`Order ${formatOrderNo(open.order_no)}`} onClose={() => setOpenId(null)}>
          <div className="mb-4 flex items-center gap-3"><strong className="select-all text-3xl text-primary">{formatOrderNo(open.order_no)}</strong>{open.order_no != null && <CopyButton text={formatOrderNo(open.order_no)} />}</div>
          <dl className="grid grid-cols-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Customer</dt><dd className="col-span-2">{open.customer_name}</dd>
            <dt className="text-muted-foreground">Phone</dt><dd className="col-span-2"><a className="underline" href={`tel:${open.phone}`}>{open.phone}</a></dd>
            <dt className="text-muted-foreground">Placed</dt><dd className="col-span-2">{fmtNairobi(open.created_at)}</dd>
            <dt className="text-muted-foreground">Fulfilment</dt><dd className="col-span-2 capitalize">{open.fulfillment}{open.location ? ` — ${open.location}` : ""}</dd>
            {open.instructions && <><dt className="text-muted-foreground">Notes</dt><dd className="col-span-2">{open.instructions}</dd></>}
            <dt className="text-muted-foreground">Payment</dt><dd className="col-span-2">{paymentLabel(open.payment)} · <Badge tone={payTone(open.payment_status)}>{open.payment_status}</Badge></dd>
            <dt className="text-muted-foreground">M-Pesa receipt</dt><dd className="col-span-2 select-all">{open.payment_ref ?? "—"}</dd>
            {open.payment_note && <><dt className="text-muted-foreground">Payment note</dt><dd className="col-span-2">{open.payment_note}</dd></>}
          </dl>
          {open.payment === "mpesa" && open.payment_status === "pending" && <CheckPaymentButton id={open.id} />}
          <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
            {open.order_items.map((i, k) => <li key={k} className="flex justify-between py-1.5"><span>{i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ""}</span><span>{ksh(i.line_total)}</span></li>)}
            <li className="flex justify-between py-1.5 font-bold"><span>Total</span><span>{ksh(open.total)}</span></li>
          </ul>
          <label className="mt-4 block text-sm font-semibold">Order status
            <select className={`${input} mt-1`} value={open.status} onChange={(e) => update(open.id, { status: e.target.value })}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              {!ORDER_STATUSES.includes(open.status as never) && <option value={open.status}>{statusLabel(open.status)}</option>}
            </select></label>
          <label className="mt-3 block text-sm font-semibold">Payment status
            <select className={`${input} mt-1`} value={open.payment_status} onChange={(e) => {
              if (e.target.value === "paid" && !confirm(`Confirm you have received ${ksh(open.total)} for ${formatOrderNo(open.order_no)}?`)) return;
              update(open.id, { payment_status: e.target.value });
            }}>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <p className="mt-2 text-xs text-muted-foreground">Only mark as paid once the money has actually been received.</p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- menu management ---------- */
type Prod = { id?: string; name: string; description: string; price: number; variants: { label: string; price: number }[] | null; category_id: string | null; image_key: string | null; available: boolean; sort: number };
const parseVariants = (s: string) => {
  const v = s.split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [label, price] = x.split(":"); return { label: label?.trim(), price: Number(price) }; });
  return v.length ? v : null;
};

export function MenuView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "menu"],
    queryFn: async () => {
      const [c, p, k, s, i] = await Promise.all([
        supabase.from("categories").select("*").order("sort"), supabase.from("products").select("*").order("sort"),
        supabase.from("combos").select("*").order("sort"), supabase.from("stock_items").select("id,name,unit").order("name"),
        supabase.from("product_ingredients").select("*"),
      ]);
      return { cats: c.data ?? [], prods: (p.data ?? []) as unknown as Prod[], combos: k.data ?? [], stock: s.data ?? [], ingr: i.data ?? [] };
    },
  });
  const [edit, setEdit] = useState<Prod | null>(null);
  const [combo, setCombo] = useState<any | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "menu"] }); qc.invalidateQueries({ queryKey: ["menu"] }); qc.invalidateQueries({ queryKey: ["combos"] }); };
  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-gold">Menu Management</h1>
        <button className={btn} onClick={() => setEdit({ name: "", description: "", price: 0, variants: null, category_id: data.cats[0]?.id ?? null, image_key: null, available: true, sort: data.prods.length + 1 })}>Add product</button></div>
      <Table head={["Photo", "Product", "Category", "Price", "Available", ""]}>
        {data.prods.map((p) => (
          <tr key={p.id}>
            <td className={td}><img src={imageFor(p.image_key)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 rounded object-cover" /></td>
            <td className={`${td} font-semibold`}>{p.name}</td>
            <td className={td}>{data.cats.find((c) => c.id === p.category_id)?.name ?? "—"}</td>
            <td className={td}>{p.variants?.length ? p.variants.map((v) => `${v.label} ${ksh(v.price)}`).join(" · ") : ksh(p.price)}</td>
            <td className={td}><input type="checkbox" aria-label={`${p.name} available`} checked={p.available} onChange={async (e) => {
              if (!fail((await supabase.from("products").update({ available: e.target.checked }).eq("id", p.id!)).error)) refresh(); }} /></td>
            <td className={`${td} whitespace-nowrap`}><button className={btnGhost} onClick={() => setEdit(p)}>Edit</button>{" "}
              <button className={`${btnGhost} text-destructive`} onClick={async () => {
                if (!confirm(`Delete ${p.name}? Past orders keep their details.`)) return;
                if (!fail((await supabase.from("products").delete().eq("id", p.id!)).error)) { toast.success("Deleted"); refresh(); } }}>Delete</button></td>
          </tr>
        ))}
      </Table>

      <h2 className="text-xl font-bold text-primary">Combos</h2>
      <Table head={["Combo", "Includes", "Price", "Available", ""]}>
        {data.combos.map((c) => (
          <tr key={c.id}>
            <td className={`${td} font-semibold`}>{c.name}</td><td className={td}>{c.items.join(", ")}</td><td className={td}>{ksh(c.price)}</td>
            <td className={td}><input type="checkbox" aria-label={`${c.name} available`} checked={c.available} onChange={async (e) => {
              if (!fail((await supabase.from("combos").update({ available: e.target.checked }).eq("id", c.id)).error)) refresh(); }} /></td>
            <td className={td}><button className={btnGhost} onClick={() => setCombo(c)}>Edit</button></td>
          </tr>
        ))}
      </Table>

      {edit && <ProductForm p={edit} cats={data.cats} stock={data.stock} ingr={data.ingr.filter((i) => i.product_id === edit.id)} onClose={() => setEdit(null)} onSaved={refresh} />}
      {combo && <ComboForm c={combo} onClose={() => setCombo(null)} onSaved={refresh} />}
    </div>
  );
}

function ProductForm({ p, cats, stock, ingr, onClose, onSaved }: { p: Prod; cats: any[]; stock: any[]; ingr: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ ...p, variantsText: p.variants?.map((v) => `${v.label}:${v.price}`).join(", ") ?? "" });
  const [busy, setBusy] = useState(false);
  const [ing, setIng] = useState({ stock_item_id: "", qty: "" });
  const save = async () => {
    const variants = parseVariants(f.variantsText);
    if (f.name.trim().length < 2) return void toast.error("Enter a product name");
    if (variants?.some((v) => !v.label || !(v.price >= 0))) return void toast.error("Sizes must look like Quarter:200, Half:350");
    if (!(f.price >= 0)) return void toast.error("Enter a valid price");
    setBusy(true);
    const row = { name: f.name.trim(), description: f.description.trim(), price: variants ? variants[0]!.price : Math.round(f.price), variants, category_id: f.category_id, image_key: f.image_key, available: f.available, sort: f.sort };
    const { error } = p.id ? await supabase.from("products").update(row).eq("id", p.id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (!fail(error)) { toast.success("Saved — the menu is updated"); onSaved(); onClose(); }
  };
  return (
    <Modal title={p.id ? `Edit ${p.name}` : "Add product"} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Name<input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block">Description<textarea className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <label className="block">Price (KSh)<input type="number" min={0} className={input} value={f.price} disabled={!!f.variantsText.trim()} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></label>
        <label className="block">Sizes (optional, e.g. Quarter:200, Half:350)<input className={input} value={f.variantsText} onChange={(e) => setF({ ...f, variantsText: e.target.value })} /></label>
        <label className="block">Category<select className={input} value={f.category_id ?? ""} onChange={(e) => setF({ ...f, category_id: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div>Photo
          <div className="mt-1 grid grid-cols-6 gap-2">{IMAGE_KEYS.map((k) => (
            <button type="button" key={k} onClick={() => setF({ ...f, image_key: k })} className={`overflow-hidden rounded border-2 ${f.image_key === k ? "border-primary" : "border-transparent"}`}><img src={imageFor(k)} alt={k} width={80} height={80} loading="lazy" decoding="async" className="aspect-square w-full object-cover" /></button>
          ))}</div></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.available} onChange={(e) => setF({ ...f, available: e.target.checked })} /> Available to order</label>
        <button className={btn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>

        {p.id && (
          <div className="border-t border-border pt-3">
            <p className="font-semibold">Ingredients used per item (optional — deducts stock when an order starts Preparing)</p>
            <ul className="mt-2 space-y-1">{ingr.map((i) => { const s = stock.find((x) => x.id === i.stock_item_id); return (
              <li key={i.id} className="flex justify-between">{i.qty} {s?.unit} {s?.name}
                <button className="text-destructive underline" onClick={async () => { if (!fail((await supabase.from("product_ingredients").delete().eq("id", i.id)).error)) onSaved(); }}>Remove</button></li>); })}</ul>
            {stock.length ? (
              <div className="mt-2 flex gap-2">
                <select className={input} value={ing.stock_item_id} onChange={(e) => setIng({ ...ing, stock_item_id: e.target.value })}><option value="">Stock item…</option>{stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}</select>
                <input className={`${input} w-24`} type="number" min={0} step="any" placeholder="Qty" value={ing.qty} onChange={(e) => setIng({ ...ing, qty: e.target.value })} />
                <button className={btnGhost} onClick={async () => {
                  if (!ing.stock_item_id || !(Number(ing.qty) > 0)) return void toast.error("Pick an item and quantity");
                  if (!fail((await supabase.from("product_ingredients").upsert({ product_id: p.id!, stock_item_id: ing.stock_item_id, qty: Number(ing.qty) }, { onConflict: "product_id,stock_item_id" })).error)) { setIng({ stock_item_id: "", qty: "" }); onSaved(); }
                }}>Add</button>
              </div>) : <p className="text-muted-foreground">Add stock items first in Stock Management.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ComboForm({ c, onClose, onSaved }: { c: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: c.name, tagline: c.tagline, items: c.items.join(", "), price: c.price });
  return (
    <Modal title={`Edit ${c.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Name<input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block">Tagline<input className={input} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></label>
        <label className="block">Includes (comma separated)<input className={input} value={f.items} onChange={(e) => setF({ ...f, items: e.target.value })} /></label>
        <label className="block">Price (KSh)<input type="number" min={0} className={input} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></label>
        <button className={btn} onClick={async () => {
          if (!(f.price >= 0) || f.name.trim().length < 2) return void toast.error("Check name and price");
          const { error } = await supabase.from("combos").update({ name: f.name.trim(), tagline: f.tagline, items: f.items.split(",").map((x: string) => x.trim()).filter(Boolean), price: Math.round(f.price) }).eq("id", c.id);
          if (!fail(error)) { toast.success("Combo saved"); onSaved(); onClose(); }
        }}>Save</button>
      </div>
    </Modal>
  );
}

/* ---------- stock ---------- */
export function StockView() {
  const qc = useQueryClient();
  const { data: stock, isLoading } = useStock();
  const { data: moves } = useQuery({
    queryKey: ["admin", "moves"],
    queryFn: async () => (await supabase.from("stock_movements").select("*, stock_items(name,unit)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const [filter, setFilter] = useState<"all" | "Low Stock" | "Out of Stock">("all");
  const [restock, setRestock] = useState<any | null>(null);
  const [item, setItem] = useState<any | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  if (isLoading || !stock) return <p className="text-muted-foreground">Loading…</p>;
  const shown = stock.filter((s) => filter === "all" || stockStatus(s.quantity, s.min_level) === filter);
  const tone = (s: string) => s === "In Stock" ? "border-fresh text-fresh" : s === "Low Stock" ? "border-primary text-primary" : "border-destructive text-destructive";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-gold">Stock Management</h1>
        <button className={btn} onClick={() => setItem({ name: "", unit: "pcs", quantity: 0, min_level: 0, supplier: "" })}>Add stock item</button></div>
      <div className="flex gap-2">{(["all", "Low Stock", "Out of Stock"] as const).map((x) => <button key={x} onClick={() => setFilter(x)} className={`${btnGhost} ${filter === x ? "bg-primary text-primary-foreground" : ""}`}>{x === "all" ? "All" : x}</button>)}</div>
      <Table head={["Item", "Quantity", "Unit", "Minimum", "Status", "Last restocked", ""]} empty={!shown.length}>
        {shown.map((s) => { const st = stockStatus(s.quantity, s.min_level); return (
          <tr key={s.id}>
            <td className={`${td} font-semibold`}>{s.name}{s.supplier && <div className="text-xs text-muted-foreground">{s.supplier}</div>}</td>
            <td className={td}>{s.quantity}</td><td className={td}>{s.unit}</td><td className={td}>{s.min_level}</td>
            <td className={td}><Badge tone={tone(st)}>{st}</Badge></td>
            <td className={td}>{s.last_restocked_at ? fmtNairobi(s.last_restocked_at) : "—"}</td>
            <td className={`${td} whitespace-nowrap`}><button className={btn} onClick={() => setRestock(s)}>Restock</button>{" "}<button className={btnGhost} onClick={() => setItem(s)}>Edit</button>{" "}
              <DeleteControl label={`Delete stock item ${s.name}`} confirmation={`Delete ${s.name}, its movement history and ingredient links? This cannot be undone.`} onDelete={async () => {
                const { error } = await supabase.from("stock_items").delete().eq("id", s.id);
                if (error) throw new Error(error.message);
                await refresh();
              }} /></td>
          </tr>); })}
      </Table>

      <h2 className="text-xl font-bold text-primary">Stock movements</h2>
      <Table head={["Date", "Item", "Change", "Type", "Supplier", "Cost", "Notes", ""]} empty={!moves?.length}>
        {(moves ?? []).map((m: any) => (
          <tr key={m.id}><td className={td}>{m.moved_on}</td><td className={td}>{m.stock_items?.name}</td>
            <td className={`${td} font-semibold ${m.change < 0 ? "text-destructive" : "text-fresh"}`}>{m.change > 0 ? "+" : ""}{m.change} {m.stock_items?.unit}</td>
            <td className={td}>{m.kind.replace("_", " ")}</td><td className={td}>{m.supplier ?? "—"}</td><td className={td}>{m.cost != null ? ksh(m.cost) : "—"}</td><td className={td}>{m.notes ?? ""}</td>
            <td className={td}><DeleteControl label={`Delete stock movement ${m.stock_items?.name ?? "item"}`} disabled={!canDeleteStockMovement(m)} confirmation={`Delete this ${m.kind} entry for ${m.stock_items?.name ?? "item"}? Its quantity change will be reversed.`} onDelete={async () => {
              const { error } = await supabase.rpc("delete_manual_stock_movement", { _movement_id: m.id });
              if (error) throw new Error(error.message);
              await refresh();
            }} /></td></tr>
        ))}
      </Table>

      {restock && <RestockForm s={restock} onClose={() => setRestock(null)} onSaved={refresh} />}
      {item && <StockItemForm s={item} onClose={() => setItem(null)} onSaved={refresh} />}
    </div>
  );
}

function RestockForm({ s, onClose, onSaved }: { s: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ qty: "", date: nairobiDate(Date.now()), supplier: s.supplier ?? "", cost: "", notes: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Restock ${s.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Quantity added ({s.unit})<input type="number" min={0} step="any" className={input} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
        <label className="block">Date<input type="date" className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label className="block">Supplier<input className={input} value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></label>
        <label className="block">Purchase cost (KSh)<input type="number" min={0} className={input} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></label>
        <label className="block">Notes<input className={input} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        <button className={btn} disabled={busy} onClick={async () => {
          const q = Number(f.qty); if (!(q > 0)) return void toast.error("Enter the quantity added");
          setBusy(true);
          const m = await supabase.from("stock_movements").insert({ stock_item_id: s.id, change: q, kind: "restock", moved_on: f.date, supplier: f.supplier || null, cost: f.cost ? Number(f.cost) : null, notes: f.notes || null });
          const u = m.error ? m : await supabase.from("stock_items").update({ quantity: Number(s.quantity) + q, last_restocked_at: new Date(`${f.date}T12:00:00+03:00`).toISOString(), supplier: f.supplier || s.supplier }).eq("id", s.id);
          setBusy(false);
          if (!fail(u.error)) { toast.success("Restock recorded"); onSaved(); onClose(); }
        }}>{busy ? "Saving…" : "Record restock"}</button>
      </div>
    </Modal>
  );
}

function StockItemForm({ s, onClose, onSaved }: { s: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: s.name, unit: s.unit, quantity: String(s.quantity), min_level: String(s.min_level), supplier: s.supplier ?? "" });
  return (
    <Modal title={s.id ? `Edit ${s.name}` : "Add stock item"} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Name<input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block">Unit (e.g. kg, litres, pcs, packets)<input className={input} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></label>
        <label className="block">Current quantity<input type="number" min={0} step="any" className={input} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></label>
        <label className="block">Minimum stock level<input type="number" min={0} step="any" className={input} value={f.min_level} onChange={(e) => setF({ ...f, min_level: e.target.value })} /></label>
        <label className="block">Supplier<input className={input} value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></label>
        <button className={btn} onClick={async () => {
          const quantity = Number(f.quantity), min_level = Number(f.min_level);
          if (f.name.trim().length < 2 || !f.unit.trim() || !(quantity >= 0) || !(min_level >= 0)) return void toast.error("Check the name, unit and numbers");
          const row = { name: f.name.trim(), unit: f.unit.trim(), quantity, min_level, supplier: f.supplier || null };
          let error;
          if (s.id) {
            ({ error } = await supabase.from("stock_items").update(row).eq("id", s.id));
            const diff = quantity - Number(s.quantity);
            if (!error && diff) ({ error } = await supabase.from("stock_movements").insert({ stock_item_id: s.id, change: diff, kind: "adjust", notes: "Manual count update" }));
          } else {
            const r = await supabase.from("stock_items").insert(row).select("id").single(); error = r.error;
            if (!error && quantity) ({ error } = await supabase.from("stock_movements").insert({ stock_item_id: r.data!.id, change: quantity, kind: "adjust", notes: "Opening stock" }));
          }
          if (!fail(error ?? null)) { toast.success("Saved"); onSaved(); onClose(); }
        }}>Save</button>
      </div>
    </Modal>
  );
}

/* ---------- sales ---------- */
export function SalesView() {
  const [period, setPeriod] = useState<Period>("daily");
  const [day, setDay] = useState(nairobiDate(Date.now()));
  const [to, setTo] = useState(day);
  const range = periodRange(period, day, to);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "sales", range.from, range.to],
    queryFn: async () => {
      const u = rangeToUtc(range);
      const { data, error } = await supabase.from("orders").select("id,order_no,total,status,payment,payment_status,payment_ref,created_at,source").gte("created_at", u.start).lt("created_at", u.end).order("created_at");
      if (error) throw error; return data as (SaleOrder & { order_no: number | null; payment_ref: string | null; source: string })[];
    },
  });
  const { data: allOrders } = useOrders();
  const overdue = (allOrders ?? []).filter((o) => isOverduePayment(o));
  const sum = summarize(data ?? []);
  const byDay = new Map<string, SaleOrder[]>();
  for (const o of data ?? []) { const d = nairobiDate(o.created_at); byDay.set(d, [...(byDay.get(d) ?? []), o]); }
  const rows = [...byDay.entries()].map(([d, os]) => ({ d, ...summarize(os) }));

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Order", "Date (Nairobi)", "Total KSh", "Status", "Payment method", "Payment status", "Counts as sale", "M-Pesa receipt"].map(esc).join(",")];
    for (const o of data ?? []) lines.push([formatOrderNo(o.order_no), fmtNairobi(o.created_at), o.total, statusLabel(o.status), paymentLabel(o.payment), o.payment_status, isSale(o) ? "yes" : "no", o.payment_ref ?? ""].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `utmost-bites-sales-${range.from}_to_${range.to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gold">Sales Reports</h1>
      <div className="flex flex-wrap items-end gap-2">
        {(["daily", "weekly", "monthly", "yearly", "custom"] as const).map((p) => <button key={p} onClick={() => setPeriod(p)} className={`${btnGhost} capitalize ${period === p ? "bg-primary text-primary-foreground" : ""}`}>{p === "custom" ? "Custom range" : `${p} sales`}</button>)}
        <input type="date" aria-label="Date" className={`${input} w-auto`} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        {period === "custom" && <input type="date" aria-label="To date" className={`${input} w-auto`} value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />}
        <button className={btn} onClick={exportCsv} disabled={!data?.length}>Export CSV</button>
      </div>
      <p className="text-sm text-muted-foreground">{range.from === range.to ? range.from : `${range.from} to ${range.to}`} · Nairobi time. Sales = paid orders excluding cancelled orders; refunded, pending and failed payments never count.</p>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : error ? <p className="text-destructive">Couldn't load sales.</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card label="Sales" value={ksh(sum.revenue)} tone="text-fresh" />
            <Card label="Orders" value={sum.orders} /><Card label="Completed" value={sum.completed} />
            <Card label="Paid" value={sum.paid} /><Card label="Pending" value={sum.pending} /><Card label="Failed" value={sum.failed} tone="text-destructive" />
            <Card label="Cancelled" value={sum.cancelled} tone="text-destructive" /><Card label="Average order" value={ksh(sum.average)} />
          </div>
          {!!Object.keys(sum.byMethod).length && <p className="text-sm">By payment method: {Object.entries(sum.byMethod).map(([m, v]) => `${paymentLabel(m)} ${ksh(v)}`).join(" · ")}</p>}
          {(() => {
            const sold = (data ?? []).filter(isSale);
            const walkin = sold.filter((o) => o.source === "pos").reduce((s, o) => s + o.total, 0);
            const online = sold.filter((o) => o.source !== "pos").reduce((s, o) => s + o.total, 0);
            return <p className="text-sm">Walk-in {ksh(walkin)} · Online {ksh(online)}</p>;
          })()}
          <h2 className="text-xl font-bold text-primary">Pending payment over 10 minutes</h2>
          <Table head={["Order", "Customer", "Amount", "Payment", "Placed"]} empty={!overdue.length}>
            {overdue.map((o) => <tr key={o.id}><td className={td}>{formatOrderNo(o.order_no)}</td><td className={td}>{o.customer_name}</td><td className={td}>{ksh(o.total)}</td><td className={td}>{paymentLabel(o.payment)}</td><td className={td}>{fmtNairobi(o.created_at)}</td></tr>)}
          </Table>
          <h2 className="text-xl font-bold text-primary">Orders in this period</h2>
          <Table head={["Order", "Amount", "Payment", "Receipt", "Status"]} empty={!data?.length}>
            {(data ?? []).map((o) => <tr key={o.id}><td className={td}>{formatOrderNo(o.order_no)}</td><td className={td}>{ksh(o.total)}</td><td className={td}>{paymentLabel(o.payment)} · {o.payment_status}</td><td className={td}>{o.payment_ref ?? "—"}</td><td className={td}>{statusLabel(o.status)}</td></tr>)}
          </Table>
          <Table head={["Date", "Orders", "Sales", "Payment"]} empty={!rows.length}>
            {rows.map((r) => <tr key={r.d}><td className={td}>{r.d}</td><td className={td}>{r.orders}</td><td className={td}>{ksh(r.revenue)}</td>
              <td className={td}>{Object.entries(r.byMethod).map(([m, v]) => `${paymentLabel(m)} ${ksh(v)}`).join(" · ") || "—"}</td></tr>)}
          </Table>
        </>
      )}
    </div>
  );
}

/* ---------- settings ---------- */
const SETTING_FIELDS = [
  { key: "restaurant_name", label: "Restaurant name" }, { key: "contact_phone", label: "Contact phone" },
  { key: "location", label: "Location" }, { key: "currency", label: "Currency" },
  { key: "opening_hours", label: "Opening hours (shown in the footer; leave empty to hide)" },
];
export function SettingsView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "settings"], queryFn: async () => Object.fromEntries(((await supabase.from("settings").select("*")).data ?? []).map((r) => [r.key, r.value])) as Record<string, string> });
  const [f, setF] = useState<Record<string, string> | null>(null);
  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;
  const v = f ?? data;
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-3xl font-bold text-gold">Settings</h1>
      {SETTING_FIELDS.map((s) => <label key={s.key} className="block text-sm">{s.label}<input className={input} value={v[s.key] ?? ""} onChange={(e) => setF({ ...v, [s.key]: e.target.value })} /></label>)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v["accepting_orders"] !== "false"} onChange={(e) => setF({ ...v, accepting_orders: String(e.target.checked) })} /> Accept online orders</label>
      <button className={btn} onClick={async () => {
        const rows = [...SETTING_FIELDS.map((s) => s.key), "accepting_orders"].map((key) => ({ key, value: (v[key] ?? "").trim() }));
        if (!fail((await supabase.from("settings").upsert(rows)).error)) { toast.success("Settings saved"); setF(null); qc.invalidateQueries(); }
      }}>Save settings</button>
    </div>
  );
}
