import { createFileRoute } from "@tanstack/react-router";
import { BUSINESS } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://utmostbites.lovable.app/about" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "About — Utmost Bites Fast Arrivals" },
      { name: "description", content: "A Yala Town fast-food cafe serving fresh Kenyan favourites since 2024." },
      { property: "og:title", content: "About Utmost Bites" },
      { property: "og:description", content: "Fuel for the Yala Hustle since 2024." },
    ],
    links: [{ rel: "canonical", href: "https://utmostbites.lovable.app/about" }],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold text-gold">About Us</h1>
      <p className="mt-2 font-script text-2xl text-primary">{BUSINESS.tagline}</p>
      <p className="mt-6 leading-relaxed text-foreground/90">
        Utmost Bites Fast Arrivals opened in {BUSINESS.established} in {BUSINESS.location}. We serve fresh chapati, mahamri,
        samosas, smocha, fried chicken, smoothies and ready-to-cook chicken — fast, affordable and made with care for the people of Yala.
      </p>
    </div>
  ),
});
