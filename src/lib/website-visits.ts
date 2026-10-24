export const VISIT_IDLE_MS = 30 * 60_000;
export function isStorefrontPath(path: string) {
  return ["/", "/menu", "/combos", "/about", "/contact", "/cart", "/track"].includes(path);
}
export function shouldStartVisit(lastActivity: number, now: number) {
  return now - lastActivity >= VISIT_IDLE_MS;
}