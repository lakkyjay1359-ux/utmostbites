import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseOrderNo } from "./site";

const phoneRe = /^(?:\+?254|0)(7|1)\d{8}$/;
const normalizePhone = (p: string) => {
  const d = p.replace(/[\s-]/g, "");
  if (d.startsWith("+254")) return "0" + d.slice(4);
  if (d.startsWith("254")) return "0" + d.slice(3);
  return d;
};

const orderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(phoneRe, "Enter a valid Kenyan phone number"),
  fulfillment: z.enum(["delivery", "pickup"]),
  location: z.string().trim().max(200).optional().default(""),
  instructions: z.string().trim().max(500).optional().default(""),
  payment: z.enum(["cash", "mpesa_on_delivery", "mpesa"]),
  items: z.array(z.object({
    type: z.enum(["product", "combo"]),
    id: z.string().uuid(),
    variant: z.string().max(40).optional(),
    qty: z.number().int().min(1).max(50),
  })).min(1).max(40),
}).refine((d) => d.fulfillment === "pickup" || (d.location && d.location.length >= 3), {
  message: "Delivery location is required", path: ["location"],
});

export type PlaceOrderInput = z.input<typeof orderSchema>;

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acc } = await supabaseAdmin.from("settings").select("value").eq("key", "accepting_orders").maybeSingle();
    if (acc?.value === "false") return { ok: false as const, error: "We're not taking online orders right now. Please call or WhatsApp us." };
    const productIds = data.items.filter((i) => i.type === "product").map((i) => i.id);
    const comboIds = data.items.filter((i) => i.type === "combo").map((i) => i.id);
    const [pRes, cRes] = await Promise.all([
      productIds.length ? supabaseAdmin.from("products").select("id,name,price,variants,available").in("id", productIds) : Promise.resolve({ data: [], error: null }),
      comboIds.length ? supabaseAdmin.from("combos").select("id,name,price,available").in("id", comboIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (pRes.error || cRes.error) return { ok: false as const, error: "Could not load menu. Please try again." };

    const lines: { item_type: string; item_id: string; name: string; variant: string | null; unit_price: number; qty: number; line_total: number }[] = [];
    for (const it of data.items) {
      if (it.type === "product") {
        const p = (pRes.data as any[]).find((x) => x.id === it.id);
        if (!p || !p.available) return { ok: false as const, error: `${p?.name ?? "An item"} is currently unavailable.` };
        let price = p.price as number;
        let variant: string | null = null;
        const variants = p.variants as { label: string; price: number }[] | null;
        if (variants && variants.length) {
          const v = variants.find((x) => x.label === it.variant);
          if (!v) return { ok: false as const, error: `Choose a size for ${p.name}.` };
          price = v.price; variant = v.label;
        }
        lines.push({ item_type: "product", item_id: p.id, name: p.name, variant, unit_price: price, qty: it.qty, line_total: price * it.qty });
      } else {
        const c = (cRes.data as any[]).find((x) => x.id === it.id);
        if (!c || !c.available) return { ok: false as const, error: `${c?.name ?? "A combo"} is currently unavailable.` };
        lines.push({ item_type: "combo", item_id: c.id, name: c.name, variant: null, unit_price: c.price, qty: it.qty, line_total: c.price * it.qty });
      }
    }
    const total = lines.reduce((s, l) => s + l.line_total, 0);
    const phone = normalizePhone(data.phone);

    const { data: cust } = await supabaseAdmin.from("customers")
      .upsert({ name: data.name, phone }, { onConflict: "phone" }).select("id").single();

    const code = "UB" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data: order, error } = await supabaseAdmin.from("orders").insert({
      code, customer_id: cust?.id ?? null, customer_name: data.name, phone,
      fulfillment: data.fulfillment, location: data.fulfillment === "delivery" ? data.location : null,
      instructions: data.instructions || null, payment: data.payment, total,
    }).select("id, code").single();
    if (error || !order) {
      console.error("order insert failed", error);
      return { ok: false as const, error: "We couldn't save your order. Please order via WhatsApp or call us." };
    }
    const { error: liErr } = await supabaseAdmin.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (liErr) {
      console.error(liErr);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return { ok: false as const, error: "We couldn't save your order. Please order via WhatsApp or call us." };
    }
    return { ok: true as const, code: order.code, total, lines: lines.map((l) => ({ name: l.name, variant: l.variant, qty: l.qty, line_total: l.line_total })) };
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    code: z.string().trim().refine((s) => parseOrderNo(s) !== null, "Invalid order number"),
    phone: z.string().trim().regex(phoneRe, "Enter the phone used for the order"),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("orders")
      .select("id, order_no, status, total, fulfillment, payment_ref, payment_status, created_at, updated_at, phone, order_items(name, variant, qty, line_total)")
      .eq("order_no", parseOrderNo(data.code) ?? 0).eq("phone", normalizePhone(data.phone)).maybeSingle();
    if (!o || o.phone !== normalizePhone(data.phone)) return { found: false as const };
    const { phone: _p, id: _id, ...rest } = o;
    return { found: true as const, order: rest };
  });
