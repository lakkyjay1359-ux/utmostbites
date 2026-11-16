import { combosQuery } from "@/lib/menu";
import { ComboCard } from "@/components/site/ComboCard";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { menuQuery } from "@/lib/menu";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://utmostbites.shop/menu" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Menu — Utmost Bites Fast Arrivals" },
      { name: "description", content: "Daily Favorites, Refreshing Bites & Brews and Ready to Cook — prices in KSh." },
      { property: "og:title", content: "Menu — Utmost Bites" },
      { property: "og:description", content: "Chapati, samosa, smocha, chips, fried chicken, smoothies and more." },
    ],
    links: [{ rel: "canonical", href: "https://utmostbites.shop/menu" }],
  }),
  component: MenuPage,
});

function MenuPage() {
  const { data, isLoading, error } = useQuery(menuQuery);
  const { data: combos } = useQuery(combosQuery);
  const [cat, setCat] = useState("all");
  if (isLoading) return <p className="p-16 text-center text-muted-foreground">Loading menu…</p>;
  if (error || !data) return <p className="p-16 text-center text-destructive">Couldn't load the menu. Please call or WhatsApp us.</p>;
  const cats = data.categories.filter((c) => cat === "all" || c.id === cat);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-center text-4xl font-bold text-gold">Our Menu</h1>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[{ id: "all", name: "All" }, ...data.categories].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{c.name}</button>
        ))}
      </div>
      {cats.map((c) => (
        <section key={c.id} className="mt-12">
          <h2 className="mb-6 border-b border-accent pb-2 text-2xl font-bold text-primary">{c.name}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.products.filter((p) => p.category_id === c.id).map((p) => (
              <ProductCard key={p.id} product={p} fresh={p.image_key === "smoothie"} />
            ))}
          </div>
        </section>
      ))}
      {cat === "all" && !!combos?.length && (
        <section className="mt-12">
          <h2 className="mb-6 border-b border-accent pb-2 text-2xl font-bold text-primary">Combos</h2>
          <div className="grid gap-6 md:grid-cols-2">{combos.map((c) => <ComboCard key={c.id} combo={c} />)}</div>
        </section>
      )}
    </div>
  );
}
