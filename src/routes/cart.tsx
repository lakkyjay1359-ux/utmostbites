import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { ksh, whatsappHref } from "@/lib/site";
import { placeOrder } from "@/lib/orders.functions";
import { initiateMpesaPayment, mpesaPaymentStatus } from "@/lib/mpesa.functions";
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
  const [f, setF] = useState({ name: "", phone: "", fulfillment: "pickup" as "pickup" | "delivery", location: "", instructions: "", payment: "cash" as "cash" | "mpesa_on_delivery" | "mpesa" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string; total: number } | null>(null);
  const [mpesa, setMpesa] = useState<"idle" | "pushing" | "waiting" | "paid" | "failed">("idle");

  const summary = [
    "Hi Utmost Bites! My order:",
    ...cart.items.map((i) => `${i.qty} x ${i.name}${i.variant ? ` (${i.variant})` : ""} - ${ksh(i.qty * i.price)}`),
    `Total: ${ksh(cart.total)}`,
    f.name && `Name: ${f.name}`,
    `${f.fulfillment === "delivery" ? `Delivery to: ${f.location}` : "Pickup"}`,
  ].filter(Boolean).join("\n");

  if (done) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-gold">Order received!</h1>
      <p className="mt-4">Your order code is <strong className="text-primary">{done.code}</strong> · Total {ksh(done.total)}</p>
      <p className="mt-2 text-sm text-muted-foreground">Pay on {f.fulfillment === "delivery" ? "delivery" : "pickup"}. Save your code to track your order.</p>
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
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await submit({ data: { ...f, items: cart.items.map((i) => ({ type: i.type, id: i.id, variant: i.variant, qty: i.qty })) } });
      if (r.ok) { setDone({ code: r.code, total: r.total }); cart.clear(); } else setErr(r.error);
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
          <button type="button" key={v} onClick={() => setF({ ...f, fulfillment: v })} className={`flex-1 rounded-lg border py-2 capitalize ${f.fulfillment === v ? "border-primary bg-primary text-primary-foreground" : ""}`}>{v}</button>
        ))}</div>
        {f.fulfillment === "delivery" && <input required className={input} placeholder="Delivery location in Yala" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />}
        <textarea className={input} placeholder="Instructions (optional)" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
        <select className={input} value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value as any })}>
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
