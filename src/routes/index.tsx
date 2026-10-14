import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import heroShop from "@/assets/food/hero-shop.jpg";
import { BUSINESS, telHref } from "@/lib/site";
import { combosQuery } from "@/lib/menu";
import { ComboCard } from "@/components/site/ComboCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Utmost Bites Fast Arrivals — Fuel for the Yala Hustle" },
      { name: "description", content: "Chapati, smocha, fried chicken, smoothies and combos in Yala Town, Siaya County. Order online, call or WhatsApp." },
      { property: "og:title", content: "Utmost Bites Fast Arrivals — Yala Town" },
      { property: "og:description", content: "Fuel for the Yala Hustle. Order online for delivery or pickup." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: combos } = useQuery(combosQuery);
  return (
    <>
      <section className="relative overflow-hidden border-b-2 border-accent">
        <img src={heroShop} alt="Container shopfront in Yala Town with three stalls, the middle one is Utmost Bites" width={1600} height={1000} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:py-32">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Est. {BUSINESS.established} · Yala Town</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-extrabold leading-tight text-gold sm:text-7xl">Utmost Bites Fast Arrivals</h1>
          <p className="mt-4 font-script text-3xl text-primary">{BUSINESS.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="rounded-full bg-gold px-7 py-3.5 font-bold text-primary-foreground shadow-glow">Order Now</Link>
            <a href={telHref} className="flex items-center gap-2 rounded-full border-2 border-accent bg-accent/20 px-7 py-3.5 font-bold"><Phone className="h-5 w-5" /> Call Now</a>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-gold">Combos</h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
          {combos?.map((c) => <ComboCard key={c.id} combo={c} />)}
        </div>
      </section>
    </>
  );
}
