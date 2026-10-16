import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { combosQuery } from "@/lib/menu";
import { ComboCard } from "@/components/site/ComboCard";

export const Route = createFileRoute("/combos")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://utmostbites.lovable.app/combos" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Combos — Utmost Bites Fast Arrivals" },
      { name: "description", content: "Morning Combo KSh 150 and Evening Combo KSh 260 in Yala Town." },
      { property: "og:title", content: "Combos — Utmost Bites" },
      { property: "og:description", content: "Great-value meal combos for every part of your day." },
    ],
    links: [{ rel: "canonical", href: "https://utmostbites.lovable.app/combos" }],
  }),
  component: CombosPage,
});

function CombosPage() {
  const { data, isLoading } = useQuery(combosQuery);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-center text-4xl font-bold text-gold">Combos</h1>
      {isLoading && <p className="mt-8 text-center text-muted-foreground">Loading…</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">{data?.map((c) => <ComboCard key={c.id} combo={c} />)}</div>
    </div>
  );
}
