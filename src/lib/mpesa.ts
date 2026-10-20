/** Pure Daraja parsing shared by server helpers and focused tests. */
export const MPESA_QUERY_INTERVAL_MS = 10_000;
export const MPESA_WAIT_MS = 120_000;
export function to254(phone: string): string {
  let d = phone.trim().replace(/[\s+-]/g, "");
  if (d.startsWith("0")) d = "254" + d.slice(1);
  if (!/^254[71]\d{8}$/.test(d)) throw new Error("Enter a valid Safaricom number, e.g. 0712 345 678.");
  return d;
}
export type QueryResult = {
  ResultCode?: string | number;
  ResultDesc?: string;
  ResponseCode?: string;
  errorCode?: string;
  errorMessage?: string;
  MpesaReceiptNumber?: string;
};
export function queryOutcome(result: QueryResult): "paid" | "failed" | "pending" {
  const code = String(result.ResultCode ?? "");
  if (code === "0") return "paid";
  // Only known terminal transaction outcomes; acceptance/processing/errors are not payment failures.
  if (["1", "2", "17", "26", "1032", "1037", "2001", "1019", "1025", "1026"].includes(code)) return "failed";
  return "pending";
}
export function queryReceipt(result: QueryResult): string | null {
  return typeof result.MpesaReceiptNumber === "string" && /^[A-Z0-9]{8,20}$/.test(result.MpesaReceiptNumber)
    ? result.MpesaReceiptNumber : null;
}