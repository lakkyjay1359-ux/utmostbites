import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import hero640 from "@/assets/food/hero-serving-640.webp";
import hero1024 from "@/assets/food/hero-serving-1024.webp";
import hero1600 from "@/assets/food/hero-serving-1600.webp";

const HERO_SRCSET = `${hero640} 640w, ${hero1024} 1024w, ${hero1600} 1600w`;
import { BUSINESS, telHref } from "@/lib/site";
import { menuQuery } from "@/lib/menu";
import { ProductCard } from "@/components/site/ProductCard";
import { QuoteRotator } from "@/components/site/QuoteRotator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Utmost Bites and Cafe Fast Arrivals — Fuel for the Yala Hustle" },
      { name: "description", content: "Utmost Bites and Cafe Fast Arrivals in Yala Town, Siaya County: chapati, smocha, rolex, fried chicken, smoothies and more. Order online, call or WhatsApp." },
      { property: "og:title", content: "Utmost Bites and Cafe Fast Arrivals — Yala Town" },
      { property: "og:description", content: "Fuel for the Yala Hustle. Order online for delivery or pickup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://utmostbites.shop/" },
    ],
    links: [
      { rel: "canonical", href: "https://utmostbites.shop/" },
    ],
  }),
  component: Index,
});

const POPULAR = ["kebab", "smocha", "kfc-mtaani"];

function Index() {
  const { data, isLoading, isError } = useQuery(menuQuery);
  const popular = POPULAR.map((k) => data?.products.find((p) => p.image_key === k)).filter(Boolean) as NonNullable<typeof data>["products"];
  return (
    <>
      <section className="relative overflow-hidden border-b-2 border-accent">
        <img src={hero1600} srcSet={HERO_SRCSET} sizes="100vw" fetchPriority="high" loading="eager" decoding="async" alt="Young man in an Utmost Bites T-shirt serving customers at the shop counter" width={1600} height={1073} className="absolute inset-0 h-full w-full bg-espresso object-cover" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-24 sm:pb-12 sm:pt-32">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Est. {BUSINESS.established} · Yala Town</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold uppercase leading-tight text-gold sm:text-6xl lg:text-7xl">Utmost Bites and Cafe Fast Arrivals</h1>
          <p className="mt-4 font-script text-3xl text-primary">{BUSINESS.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="rounded-full bg-gold px-7 py-3.5 font-bold text-primary-foreground shadow-glow">Order Now</Link>
            <a href={telHref} className="flex items-center gap-2 rounded-full border-2 border-accent bg-accent/20 px-7 py-3.5 font-bold"><Phone className="h-5 w-5" /> Call Now</a>
          </div>
          <QuoteRotator />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-gold">Our Popular Bites</h2>
        {isLoading && <p className="mt-8 text-center text-muted-foreground">Loading…</p>}
        {isError && <p className="mt-8 text-center text-destructive">Couldn't load the menu right now.</p>}
        <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="mt-10 text-center">
          <Link to="/menu" className="inline-flex rounded-full border-2 border-accent bg-gold px-8 py-3.5 font-bold uppercase tracking-wide text-primary-foreground shadow-glow">View more on our menu</Link>
        </div>
      </section>
    </>
  );
}
