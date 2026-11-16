import { createFileRoute } from "@tanstack/react-router";
import { BUSINESS, telHref, whatsappHref } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://utmostbites.shop/contact" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Contact — Utmost Bites Fast Arrivals" },
      { name: "description", content: "Call or WhatsApp 0794 567 401 to order from Utmost Bites in Yala Town." },
      { property: "og:title", content: "Contact Utmost Bites" },
      { property: "og:description", content: "Call or WhatsApp us to order." },
    ],
    links: [{ rel: "canonical", href: "https://utmostbites.shop/contact" }],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-gold">Contact Us</h1>
      <p className="mt-4 text-muted-foreground">{BUSINESS.location}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href={telHref} className="rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground">Call {BUSINESS.phoneDisplay}</a>
        <a href={whatsappHref("Hi Utmost Bites! I'd like to order.")} target="_blank" rel="noreferrer" className="rounded-full bg-fresh px-6 py-3 font-bold text-fresh-foreground">WhatsApp us</a>
      </div>
    </div>
  ),
});
