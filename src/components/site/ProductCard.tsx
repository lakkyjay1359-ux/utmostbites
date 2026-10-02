import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { imageFor } from "@/lib/images";
import { ksh } from "@/lib/site";
import type { Product } from "@/lib/menu";

export function QtyStepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center rounded-full border border-border">
      <button type="button" aria-label="Decrease quantity" className="flex h-9 w-9 items-center justify-center hover:text-primary disabled:opacity-40"
        disabled={value <= min} onClick={() => onChange(value - 1)}><Minus className="h-4 w-4" /></button>
      <span className="w-7 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="Increase quantity" className="flex h-9 w-9 items-center justify-center hover:text-primary disabled:opacity-40"
        disabled={value >= 50} onClick={() => onChange(value + 1)}><Plus className="h-4 w-4" /></button>
    </div>
  );
}

export function ProductCard({ product, fresh }: { product: Product; fresh?: boolean }) {
  const { add } = useCart();
  const variants = product.variants && product.variants.length ? product.variants : null;
  const [variant, setVariant] = useState(variants?.[0]?.label);
  const [qty, setQty] = useState(1);
  const price = variants ? variants.find((v) => v.label === variant)?.price ?? product.price : product.price;

  return (
    <article className={`group flex flex-col overflow-hidden panel ${fresh ? "border-fresh/60" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={imageFor(product.image_key)} alt={product.name} loading="lazy" width={816} height={816}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${product.available ? "" : "grayscale"}`} />
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-sm font-bold ${fresh ? "bg-fresh text-fresh-foreground" : "bg-gold text-primary-foreground"}`}>
          {ksh(price)}
        </span>
        {!product.available && (
          <span className="absolute inset-x-0 bottom-0 bg-accent py-1.5 text-center text-xs font-bold uppercase tracking-widest text-accent-foreground">Sold out today</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold text-primary">{product.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
        </div>
        {variants && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {variants.map((v) => (
              <button key={v.label} type="button" role="radio" aria-checked={variant === v.label} onClick={() => setVariant(v.label)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${variant === v.label ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                {v.label} · {ksh(v.price)}
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <QtyStepper value={qty} onChange={setQty} />
          <button type="button" disabled={!product.available}
            onClick={() => {
              add({ type: "product", id: product.id, name: product.name, variant, price, image_key: product.image_key }, qty);
              toast.success(`${qty} × ${product.name}${variant ? ` (${variant})` : ""} added`);
              setQty(1);
            }}
            className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-primary-foreground transition hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40">
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}
