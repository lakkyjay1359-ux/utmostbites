export const BUSINESS = {
  name: "Utmost Bites Fast Arrivals",
  tagline: "Fuel for the Yala Hustle",
  established: 2024,
  phoneDisplay: "0794 567 401",
  phoneTel: "+254794567401",
  whatsapp: "254794567401",
  location: "Yala Town, Siaya County, Kenya",
};

export const telHref = `tel:${BUSINESS.phoneTel}`;

export function whatsappHref(message?: string) {
  const base = `https://wa.me/${BUSINESS.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

export const DEFAULT_CHECKOUT_PAYMENT = "mpesa" as const;

export const formatOrderNo = (n: number | null | undefined) => n == null ? "Awaiting payment" : `A${n}`;

export function parseOrderNo(value: string): number | null {
  const match = /^(?:a|#)?([1-9]\d*)$/i.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isSafeInteger(n) && n <= 2147483647 ? n : null;
}

// Delivery areas offered at checkout, spelled exactly as the owner spells them and listed alphabetically.
export const DELIVERY_AREAS = [
  "ACK",
  "Amor Heights",
  "Around manna highway",
  "Behind the School",
  "Centre 84",
  "Diana Hostels",
  "Helida",
  "Kwa Moha",
  "Manna Highway",
  "Marenyo",
  "Olivia",
  "Olympus",
  "Orange House",
  "Opembi",
  "River Front",
  "Rome",
  "Total",
  "White House",
  "Yalla Villa",
  "Yellow House",
];

// Hostel-style areas where the delivery person needs a room number to find the customer.
export const ROOM_AREAS = ["ACK", "Amor Heights", "Centre 84", "Diana Hostels", "Helida", "Marenyo", "Opembi"];

export const needsRoom = (area: string) => ROOM_AREAS.includes(area.trim());

const LOCATION_MAX = 200; // matches the 200-character limit the order schema puts on public.orders.location

// Builds the delivery note from the chosen area plus the optional exact spot (hostel, room or landmark).
export function deliveryLocation(area: string, exact: string) {
  const a = area.trim();
  const e = exact.trim();
  const note = a && e ? `${a} — ${e}` : a || e;
  return note.slice(0, LOCATION_MAX);
}
