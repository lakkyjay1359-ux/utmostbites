import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { imageFor } from "@/lib/images";
import { ksh } from "@/lib/site";
import type { Combo } from "@/lib/menu";

const ACCENTS: Record<string, { brush: string; dot: string }> = {
  gold: { brush: "bg-gold text-primary-foreground", dot: "bg-primary" },
  red: { brush: "bg-accent text-accent-foreground", dot: "bg-accent" },
  green: { brush: "bg-fresh text-fresh-foreground", dot: "bg-fresh" },
};

export function ComboCard({ combo }: { combo: Combo }) {
  const { add } = useCart();
  const a = ACCENTS[combo.accent] ?? { brush: "bg-gold text-primary-foreground", dot: "bg-primary" };
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-primary/50 bg-card">
      <div className="px-6 pt-6 text-center">
        <h3 className={`brush font-script text-3xl ${a.brush}`}>{combo.name}</h3>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-foreground/80">{combo.tagline}</p>
      </div>
      <img src={imageFor(combo.image_key)} alt={combo.name} loading="lazy" width={800} height={600} decoding="async" className={`mt-4 aspect-[4/3] w-full object-cover ${combo.available ? "" : "grayscale"}`} />
      <div className="flex flex-1 flex-col p-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">What's inside</p>
        <ul className="space-y-1.5">
          {combo.items.map((it) => (
            <li key={it} className="flex items-center gap-2 text-foreground"><span className={`h-2 w-2 rounded-full ${a.dot}`} />{it}</li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className={`brush font-script text-3xl ${a.brush}`}>{ksh(combo.price)}</span>
          <button type="button" disabled={!combo.available}
            onClick={() => { add({ type: "combo", id: combo.id, name: combo.name, price: combo.price, image_key: combo.image_key }); toast.success(`${combo.name} added`); }}
            className="rounded-full border-2 border-primary px-5 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40">
            {combo.available ? "Add combo" : "Unavailable"}
          </button>
        </div>
      </div>
    </article>
  );
}
