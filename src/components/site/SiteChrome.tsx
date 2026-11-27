import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu as MenuIcon, Phone, ShoppingBag, X, MessageCircle, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { BUSINESS, telHref, whatsappHref } from "@/lib/site";
import { hoursQuery } from "@/lib/menu";
import logo from "@/assets/logo.webp";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/menu", label: "Menu" },
  { to: "/combos", label: "Combos" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/track", label: "Track Order" },
] as const;

function DeliveryBanner() {
  return (
    <div role="marquee" aria-label="We offer free delivery!" className="overflow-hidden bg-primary text-primary-foreground">
      <div className="delivery-marquee flex w-max items-center py-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="flex items-center" aria-hidden={i > 0}>
            <span className="whitespace-nowrap px-8 text-sm font-bold uppercase tracking-widest sm:text-base">We offer free delivery!</span>
            <Star className="h-4 w-4 fill-current" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-accent/40 bg-background/90 backdrop-blur">
      <DeliveryBanner />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 leading-none" onClick={() => setOpen(false)}>
          <img src={logo} alt="Utmost Bites logo" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-wide text-gold whitespace-nowrap">UTMOST BITES AND CAFE</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Est. 2024</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm font-medium text-foreground/80 transition hover:text-primary"
              activeProps={{ className: "text-primary" }} activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={telHref} className="hidden items-center gap-2 rounded-full border border-primary/50 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 sm:flex">
            <Phone className="h-4 w-4" /> {BUSINESS.phoneDisplay}
          </a>
          <Link to="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-primary-foreground" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">{count}</span>
            )}
          </Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block py-2.5 font-medium text-foreground/90"
              activeProps={{ className: "text-primary" }} activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { data: hours } = useQuery(hoursQuery);
  return (
    <footer className="mt-20 border-t-2 border-accent bg-espresso">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl font-bold text-gold">UTMOST BITES AND CAFE FAST ARRIVALS</p>
          <p className="mt-1 font-script text-xl text-primary">{BUSINESS.tagline}</p>
          <p className="mt-4 text-sm text-muted-foreground">{BUSINESS.location}</p>
          {hours && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">Hours: {hours}</p>}
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/menu" className="hover:text-primary">Menu</Link></li>
            <li><Link to="/combos" className="hover:text-primary">Combos</Link></li>
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
            <li><Link to="/track" className="hover:text-primary">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Order</p>
          <ul className="space-y-2 text-sm">
            <li><a href={telHref} className="hover:text-primary">Call {BUSINESS.phoneDisplay}</a></li>
            <li><a href={whatsappHref("Hi Utmost Bites! I'd like to order.")} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp us</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Utmost Bites Fast Arrivals · Est. {BUSINESS.established}</p>
    </footer>
  );
}

export function FloatingContact() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3">
      <a href={whatsappHref("Hi Utmost Bites! I'd like to order.")} target="_blank" rel="noreferrer" aria-label="Order on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-fresh text-fresh-foreground shadow-lg transition hover:scale-105">
        <MessageCircle className="h-6 w-6" />
      </a>
      <a href={telHref} aria-label="Call Utmost Bites"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition hover:scale-105">
        <Phone className="h-6 w-6" />
      </a>
    </div>
  );
}
