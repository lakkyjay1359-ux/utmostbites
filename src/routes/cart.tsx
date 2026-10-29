import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Scooter, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { DEFAULT_CHECKOUT_PAYMENT, DELIVERY_AREAS, deliveryLocation, formatOrderNo, ksh, needsRoom, whatsappHref } from "@/lib/site";
import { CopyButton } from "@/components/site/CopyButton";
import { placeOrder } from "@/lib/orders.functions";
import { initiateMpesaPayment, mpesaPaymentStatus } from "@/lib/mpesa.functions";
import { Button } from "@/components/ui/button";
import { MPESA_WAIT_MS } from "@/lib/mpesa";
import { QtyStepper } from "@/components/site/ProductCard";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://utmostbites.lovable.app/cart" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Cart & Checkout — Utmost Bites" },
      { name: "description", content: "Review your order and check out for delivery or pickup." },
      { property: "og:title", content: "Cart — Utmost Bites" },
      { property: "og:description", content: "Checkout your Utmost Bites order." },
    ],
    links: [{ rel: "canonical", href: "https://utmostbites.lovable.app/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const submit = useServerFn(placeOrder);
  const payMpesa = useServerFn(initiateMpesaPayment);
  const checkPaid = useServerFn(mpesaPaymentStatus);
  const [f, setF] = useState({ name: "", phone: "", fulfillment: "pickup" as "pickup" | "delivery", area: "", room: "", location: "", instructions: "", payment: DEFAULT_CHECKOUT_PAYMENT as "cash" | "mpesa_on_delivery" | "mpesa" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string; total: number; orderNo: number | null; receipt: string | null; lines: { name: string; variant: string | null; qty: number; line_total: number }[] } | null>(null);
  const [mpesa, setMpesa] = useState<"idle" | "pushing" | "waiting" | "delayed" | "paid" | "failed">("idle");

  const [paymentPending, setPaymentPending] = useState(true);
  const [waitStarted, setWaitStarted] = useState(0);

  const sendPrompt = async (code: string) => {
    setErr(""); setMpesa("pushing"); setBusy(true); setWaitStarted(Date.now());
    try {
      const p = await payMpesa({ data: { code, phone: f.phone } });
      if (!p.ok) { setErr(p.error); setMpesa("delayed"); return; }
      setMpesa("waiting");
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not send M-Pesa prompt."); setMpesa("delayed"); }
    finally { setBusy(false); }
  };

  // Keep pending cash orders and slow callbacks up to date without creating a number early.
  useEffect(() => {
    if (!done || done.orderNo != null) return;
    let stopped = false;
    const remaining = MPESA_WAIT_MS - (Date.now() - waitStarted);
    const delayedTimer = waitStarted && paymentPending ? setTimeout(() => setMpesa("delayed"), Math.max(0, remaining)) : undefined;
    const timer = setInterval(async () => {
      try {
        const s = await checkPaid({ data: { code: done.code, phone: f.phone } });
        if (!stopped && s.found && s.queryError) setErr(s.queryError);
        if (!stopped && s.found && s.paymentStatus === "paid" && s.orderNo != null) {
          setDone((d) => d ? { ...d, orderNo: s.orderNo, receipt: s.receipt } : d);
          setPaymentPending(false);
          if (f.payment === "mpesa") setMpesa("paid");
        } else if (!stopped && s.found && s.paymentStatus === "failed") {
          setPaymentPending(false); setMpesa("failed"); setErr(s.note || "The M-Pesa payment did not go through.");
        } else if (!stopped && waitStarted && Date.now() - waitStarted >= MPESA_WAIT_MS) {
          setMpesa("delayed");
        }
      } catch { /* Retry on the next poll. */ }
    }, 5000);
    return () => { stopped = true; clearInterval(timer); clearTimeout(delayedTimer); };
  }, [done?.code, done?.orderNo, f.phone, f.payment, checkPaid, waitStarted, paymentPending]);

  const summary = [
    "Hi Utmost Bites! My order:",
    ...cart.items.map((i) => `${i.qty} x ${i.name}${i.variant ? ` (${i.variant})` : ""} - ${ksh(i.qty * i.price)}`),
    `Total: ${ksh(cart.total)}`,
    f.name && `Name: ${f.name}`,
    `${f.fulfillment === "delivery" ? `Delivery to: ${deliveryLocation(f.area, exactSpot(f))}` : "Pickup"}`,
  ].filter(Boolean).join("\n");

  if (done) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-gold">{done.orderNo != null ? "Order confirmed!" : "Order received!"}</h1>
      {done.orderNo != null ? <div className="mt-4 flex flex-wrap items-center justify-center gap-3"><strong className="select-all text-4xl text-primary">{formatOrderNo(done.orderNo)}</strong><CopyButton text={formatOrderNo(done.orderNo)} /></div> : <p className="mt-4 text-muted-foreground">Your order number will appear when payment is received.</p>}
      {done.orderNo == null && <div className="mt-3 flex flex-wrap items-center justify-center gap-2"><span className="select-all">Order reference: {done.code}</span><CopyButton text={done.code} /></div>}
      <p className="mt-4">Total {ksh(done.total)}</p>
      {done.receipt && <p className="mt-2 text-sm">M-Pesa receipt: <span className="select-all">{done.receipt}</span></p>}
      {done.orderNo != null && <div className="mt-4"><CopyButton label="Copy order details" text={[
        `Order ${formatOrderNo(done.orderNo)}`,
        ...done.lines.map((i) => `${i.qty} × ${i.name}${i.variant ? ` (${i.variant})` : ""} — ${ksh(i.line_total)}`),
        `Total: ${ksh(done.total)}`,
        `M-Pesa receipt: ${done.receipt ?? "Not applicable"}`,
      ].join("\n")} /></div>}
      {f.payment === "mpesa" ? (
        <div className="mt-4">
          {mpesa === "paid" ? (
            <p className="font-semibold text-fresh">Payment received — thank you! Your order is being prepared.</p>
          ) : mpesa === "failed" ? (
            <p className="text-sm text-destructive">{err || "The M-Pesa payment didn't go through."} Contact Utmost Bites before trying another payment if money was deducted.</p>
          ) : mpesa === "delayed" ? (
            <div className="space-y-3 text-sm"><p>We haven’t received confirmation yet. If M-Pesa took your money, don’t pay again — enter your order number or the reference above and phone on the Track page.</p>{err && <p className="text-destructive">{err}</p>}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {mpesa === "pushing" ? "Sending M-Pesa prompt…" : "Check your phone and enter your M-Pesa PIN to complete payment…"}
            </p>
          )}
          {paymentPending && mpesa === "delayed" && <Button className="mt-4 h-auto whitespace-normal" disabled={busy} onClick={() => sendPrompt(done.code)}>Resend M-Pesa prompt</Button>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Pay on {f.fulfillment === "delivery" ? "delivery" : "pickup"}. Your number is assigned after payment.</p>
      )}
      <Link to="/track" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-bold text-primary-foreground">Track order</Link>
    </div>
  );

  if (!cart.items.length) return (
    <div className="px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-gold">Your cart is empty</h1>
      <Link to="/menu" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-bold text-primary-foreground">Browse menu</Link>
    </div>
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const exact = exactSpot(f);
    const location = f.fulfillment === "delivery" ? deliveryLocation(f.area, exact) : "";
    if (f.fulfillment === "delivery" && !location) { setErr("Choose your area or type your exact location."); return; }
    if (f.fulfillment === "delivery" && needsRoom(f.area) && !f.room.trim()) { setErr("Add the room number."); return; }
    setBusy(true);
    try {
      const details = { name: f.name, phone: f.phone, fulfillment: f.fulfillment, instructions: f.instructions, payment: f.payment };
      const r = await submit({ data: { ...details, location, items: cart.items.map((i) => ({ type: i.type, id: i.id, variant: i.variant, qty: i.qty })) } });
      if (r.ok) {
        setDone({ code: r.code, total: r.total, lines: r.lines, orderNo: null, receipt: null }); cart.clear();
        if (f.payment === "mpesa") {
          await sendPrompt(r.code);
        }
      } else setErr(r.error);
    } catch (x: any) {
      setErr(x?.message?.includes("phone") ? "Enter a valid Kenyan phone number." : "Please check your details (name, phone, delivery location).");
    } finally { setBusy(false); }
  };

  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2">
      <section>
        <h1 className="text-3xl font-bold text-gold">Your Cart</h1>
        <ul className="mt-6 space-y-3">
          {cart.items.map((i) => (
            <li key={i.key} className="panel flex items-center justify-between gap-3 p-4">
              <div><p className="font-semibold">{i.name}{i.variant && ` (${i.variant})`}</p><p className="text-sm text-muted-foreground">{ksh(i.price)} each</p></div>
              <div className="flex items-center gap-3">
                <QtyStepper value={i.qty} onChange={(n) => cart.setQty(i.key, n)} />
                <span className="w-20 text-right font-bold">{ksh(i.qty * i.price)}</span>
                <button onClick={() => cart.remove(i.key)} aria-label="Remove"><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right text-xl font-bold text-primary">Total {ksh(cart.total)}</p>
        <button onClick={cart.clear} className="mt-2 text-sm text-muted-foreground underline">Clear cart</button>
      </section>
      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <h2 className="text-2xl font-bold text-primary">Checkout</h2>
        <input required className={input} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input required className={input} placeholder="Phone e.g. 0712345678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <div className="flex gap-2">{(["pickup", "delivery"] as const).map((v) => (
          <button type="button" key={v} onClick={() => setF({ ...f, fulfillment: v })} className={`flex-1 rounded-lg border py-2 capitalize ${f.fulfillment === v ? "border-primary bg-primary text-primary-foreground" : ""}`}>
            <span className="inline-flex items-center justify-center gap-2">{v === "delivery" && <Scooter className="h-4 w-4 text-accent" aria-hidden />}{v}</span>
          </button>
        ))}</div>
        {f.fulfillment === "delivery" && (
          <div className="space-y-3">
            <p className="text-lg font-bold text-primary">Where should our delivery person bring it?</p>
            <select className={input} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} aria-label="Delivery area">
              <option value="">Choose your area</option>
              {DELIVERY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {needsRoom(f.area) && <input required className={input} placeholder="Room number" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} />}
            <input className={input} placeholder="Or type your exact location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <p className="text-sm text-muted-foreground">Hostel, room or landmark. Delivery: Free within Yala.</p>
          </div>
        )}
        <textarea className={input} placeholder="Instructions (optional)" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
        <select className={input} value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value as any })}>
          <option value="mpesa">M-Pesa now (Lipa na M-Pesa prompt)</option>
          <option value="cash">Cash on {f.fulfillment}</option>
          <option value="mpesa_on_delivery">M-Pesa to staff on {f.fulfillment}</option>
        </select>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-gold py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Placing order…" : `Place order · ${ksh(cart.total)}`}</button>
        <a href={whatsappHref(summary)} target="_blank" rel="noreferrer" className="block w-full rounded-full bg-fresh py-3 text-center font-bold text-fresh-foreground">Order via WhatsApp instead</a>
      </form>
    </div>
  );
}
