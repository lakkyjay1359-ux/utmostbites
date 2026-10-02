import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ksh } from "@/lib/site";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Utmost Bites" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const STATUSES = ["Received", "Preparing", "Ready", "Completed", "Cancelled"] as const;

function AdminPage() {
  const [state, setState] = useState<"loading" | "out" | "denied" | "in">("loading");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState("");
  const [orders, setOrders] = useState<any[]>([]); const [products, setProducts] = useState<any[]>([]);

  const check = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setState("out");
    const { data: ok } = await supabase.rpc("claim_first_admin");
    setState(ok ? "in" : "denied");
  };
  const load = async () => {
    const [o, p] = await Promise.all([
      supabase.from("orders").select("*, order_items(name,variant,qty)").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("*").order("sort"),
    ]);
    setOrders(o.data ?? []); setProducts(p.data ?? []);
  };
  useEffect(() => { check(); }, []);
  useEffect(() => { if (state === "in") load(); }, [state]);

  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  if (state === "loading") return <p className="p-16 text-center">Loading…</p>;
  if (state === "out") return (
    <form className="mx-auto max-w-sm space-y-3 px-4 py-16" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message); else check();
    }}>
      <h1 className="text-2xl font-bold text-gold">Staff login</h1>
      <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" required minLength={8} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      <button className="w-full rounded-full bg-gold py-2.5 font-bold text-primary-foreground">Sign in</button>
      <button type="button" className="w-full text-sm underline" onClick={async () => {
        const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + "/admin" } });
        setMsg(error ? error.message : "Check your email to confirm, then sign in. The first account becomes admin.");
      }}>Create first admin account</button>
    </form>
  );
  if (state === "denied") return <p className="p-16 text-center">This account is not an admin. <button className="underline" onClick={async () => { await supabase.auth.signOut(); setState("out"); }}>Sign out</button></p>;

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== "Cancelled");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-gold">Dashboard</h1>
        <button className="underline" onClick={async () => { await supabase.auth.signOut(); setState("out"); }}>Sign out</button></div>
      <p className="mt-2">Today: {todays.length} orders · {ksh(todays.reduce((s, o) => s + o.total, 0))}</p>
      <h2 className="mt-8 text-xl font-bold text-primary">Orders</h2>
      <div className="mt-3 space-y-2">{orders.map((o) => (
        <div key={o.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div><strong>{o.code}</strong> · {o.customer_name} · {o.phone} · {o.fulfillment}{o.location && ` → ${o.location}`} · {ksh(o.total)}
            <div className="text-muted-foreground">{o.order_items.map((i: any) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ")}</div></div>
          <select className="rounded border border-input bg-background px-2 py-1" value={o.status} onChange={async (e) => {
            await supabase.from("orders").update({ status: e.target.value as any, updated_at: new Date().toISOString() }).eq("id", o.id); load();
          }}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>))}
        {!orders.length && <p className="text-muted-foreground">No orders yet.</p>}
      </div>
      <h2 className="mt-10 text-xl font-bold text-primary">Products</h2>
      <div className="mt-3 space-y-2">{products.map((p) => (
        <div key={p.id} className="panel flex flex-wrap items-center gap-3 p-3 text-sm">
          <span className="flex-1 font-semibold">{p.name}</span>
          {!p.variants && <input type="number" min={0} defaultValue={p.price} className="w-24 rounded border border-input bg-background px-2 py-1"
            onBlur={async (e) => { await supabase.from("products").update({ price: Number(e.target.value) }).eq("id", p.id); load(); }} />}
          <label className="flex items-center gap-1"><input type="checkbox" checked={p.available} onChange={async (e) => {
            await supabase.from("products").update({ available: e.target.checked }).eq("id", p.id); load(); }} /> Available</label>
          <button className="text-destructive" onClick={async () => { if (confirm(`Delete ${p.name}?`)) { await supabase.from("products").delete().eq("id", p.id); load(); } }}>Delete</button>
        </div>))}
      </div>
    </div>
  );
}
