import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { trackOrder } from "@/lib/orders.functions";
import { formatOrderNo, ksh } from "@/lib/site";
import { mpesaPaymentStatus } from "@/lib/mpesa.functions";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/site/CopyButton";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://utmostbites.lovable.app/track" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Track Order — Utmost Bites" },
      { name: "description", content: "Check the status of your Utmost Bites order." },
      { property: "og:title", content: "Track your order" },
      { property: "og:description", content: "Enter your order code and phone number." },
    ],
    links: [{ rel: "canonical", href: "https://utmostbites.lovable.app/track" }],
  }),
  component: TrackPage,
});

function TrackPage() {
  const track = useServerFn(trackOrder);
  const checkPayment = useServerFn(mpesaPaymentStatus);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState(""); const [phone, setPhone] = useState("");
  const [res, setRes] = useState<any>(null); const [err, setErr] = useState("");
  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold text-gold">Track your order</h1>
      <form className="mt-6 space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setErr(""); setRes(null);
        try { const r = await track({ data: { code, phone } }); r.found ? setRes(r.order) : setErr("No order found for that number and phone."); }
        catch { setErr("Check your order number (e.g. A12) and phone."); }
      }}>
        <input required className={input} placeholder="Order number or reference e.g. A12 / UB123456" value={code} onChange={(e) => setCode(e.target.value)} />
        <input required className={input} placeholder="Phone used for order" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="w-full rounded-full bg-gold py-3 font-bold text-primary-foreground">Check status</button>
      </form>
      {err && <p className="mt-4 text-destructive">{err}</p>}
      {res && (
        <div className="panel mt-6 p-5">
          <div className="mb-3 flex items-center gap-3"><strong className="select-all text-3xl text-gold">{res.order_no == null ? res.code : formatOrderNo(res.order_no)}</strong><CopyButton text={res.order_no == null ? res.code : formatOrderNo(res.order_no)} /></div>
          <p className="text-lg">Status: <strong className="text-primary">{res.status}</strong></p>
          <p className="mt-2">Payment: {res.payment_status}</p>
          {res.payment_note && <p className="mt-2 text-sm">{res.payment_note}</p>}
          {res.payment === "mpesa" && res.payment_status === "pending" && <Button variant="outline" className="mt-3" disabled={checking} onClick={async () => {
            setChecking(true); setErr("");
            try {
              const result = await checkPayment({ data: { code: res.code, phone } });
              if (result.found) { setRes({ ...res, order_no: result.orderNo, payment_status: result.paymentStatus, payment_ref: result.receipt, payment_note: result.note }); if (result.queryError) setErr(result.queryError); }
            } catch (e) { setErr(e instanceof Error ? e.message : "Could not check payment"); }
            finally { setChecking(false); }
          }}>{checking ? "Checking…" : "Check payment status"}</Button>}
          {res.payment_ref && <p className="mt-2 text-sm">M-Pesa receipt: <span className="select-all">{res.payment_ref}</span></p>}
          <ul className="mt-3 text-sm">{res.order_items.map((i: any, k: number) => <li key={k}>{i.qty} × {i.name}{i.variant && ` (${i.variant})`} — {ksh(i.line_total)}</li>)}</ul>
          <p className="mt-3 font-bold">Total {ksh(res.total)}</p>
        </div>
      )}
    </div>
  );
}
