import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { trackOrder } from "@/lib/orders.functions";
import { ksh } from "@/lib/site";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Order — Utmost Bites" },
      { name: "description", content: "Check the status of your Utmost Bites order." },
      { property: "og:title", content: "Track your order" },
      { property: "og:description", content: "Enter your order code and phone number." },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const track = useServerFn(trackOrder);
  const [code, setCode] = useState(""); const [phone, setPhone] = useState("");
  const [res, setRes] = useState<any>(null); const [err, setErr] = useState("");
  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold text-gold">Track your order</h1>
      <form className="mt-6 space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setErr(""); setRes(null);
        try { const r = await track({ data: { code, phone } }); r.found ? setRes(r.order) : setErr("No order found for that code and phone."); }
        catch { setErr("Check your order code (e.g. UBAB12CD) and phone."); }
      }}>
        <input required className={input} placeholder="Order code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input required className={input} placeholder="Phone used for order" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="w-full rounded-full bg-gold py-3 font-bold text-primary-foreground">Check status</button>
      </form>
      {err && <p className="mt-4 text-destructive">{err}</p>}
      {res && (
        <div className="panel mt-6 p-5">
          <p className="text-lg">Status: <strong className="text-primary">{res.status}</strong></p>
          <ul className="mt-3 text-sm">{res.order_items.map((i: any, k: number) => <li key={k}>{i.qty} × {i.name}{i.variant && ` (${i.variant})`} — {ksh(i.line_total)}</li>)}</ul>
          <p className="mt-3 font-bold">Total {ksh(res.total)}</p>
        </div>
      )}
    </div>
  );
}
