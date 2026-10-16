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

export const formatOrderNo = (n: number | null | undefined) => n == null ? "Awaiting payment" : `A${n}`;

export function parseOrderNo(value: string): number | null {
  const match = /^(?:a|#)?([1-9]\d*)$/i.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isSafeInteger(n) && n <= 2147483647 ? n : null;
}
