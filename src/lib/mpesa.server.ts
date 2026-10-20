// M-Pesa Daraja (Lipa Na M-Pesa Online / STK Push) helpers — Buy Goods (Till) flow.
// Server-only: reads MPESA_* secrets from the environment inside functions.
import { to254, type QueryResult } from "./mpesa";
export { to254 } from "./mpesa";

const baseUrl = () =>
  process.env["MPESA_ENV"] === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const key = process.env["MPESA_CONSUMER_KEY"];
  const secret = process.env["MPESA_CONSUMER_SECRET"];
  if (!key || !secret) throw new Error("M-Pesa is not configured yet.");
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    errorMessage?: string;
    ResponseDescription?: string;
  };
  if (!res.ok || !body.access_token) {
    console.error("Daraja token error", res.status, body.errorMessage || body.ResponseDescription || "Token unavailable");
    throw new Error(
      body.errorMessage || body.ResponseDescription || "Could not reach M-Pesa. Please try again."
    );
  }
  return body.access_token;
}

const nairobiTimestamp = () => {
  // Daraja expects YYYYMMDDHHmmss in East Africa Time (UTC+3, no DST).
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    now.getUTCFullYear().toString() +
    p(now.getUTCMonth() + 1) +
    p(now.getUTCDate()) +
    p(now.getUTCHours()) +
    p(now.getUTCMinutes()) +
    p(now.getUTCSeconds())
  );
};

// Normalize to 2547XXXXXXXX / 2541XXXXXXXX: strip +, spaces, dashes; leading 0 -> 254.

export async function stkPush(args: {
  phone: string; // any Kenyan format; normalized here
  amount: number;
  orderCode: string;
  callbackUrl: string;
}): Promise<{ checkoutRequestId: string }> {
  const storeNumber = process.env["MPESA_STORE_NUMBER"];
  const tillNumber = process.env["MPESA_TILL_NUMBER"];
  const txnType = process.env["MPESA_TXN_TYPE"];
  const passkey = process.env["MPESA_PASSKEY"];
  if (!storeNumber || !tillNumber || !txnType || !passkey) {
    throw new Error("M-Pesa is not configured yet.");
  }

  const timestamp = nairobiTimestamp();
  const password = btoa(`${storeNumber}${passkey}${timestamp}`);
  const phone254 = to254(args.phone);
  const token = await getAccessToken();

  console.error("Daraja STK push CallBackURL:", args.callbackUrl);

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: storeNumber,
      Password: password,
      Timestamp: timestamp,
      TransactionType: txnType,
      Amount: Math.max(1, Math.round(args.amount)),
      PartyA: phone254,
      PartyB: tillNumber,
      PhoneNumber: phone254,
      CallBackURL: args.callbackUrl,
      AccountReference: args.orderCode,
      TransactionDesc: `Utmost Bites order ${args.orderCode}`,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    CheckoutRequestID?: string;
    errorMessage?: string;
    CustomerMessage?: string;
  };
  if (!res.ok || body.ResponseCode !== "0" || !body.CheckoutRequestID) {
    console.error("Daraja STK push error", res.status, body.errorMessage || body.ResponseDescription || body.CustomerMessage || "Request rejected");
    throw new Error(
      body.errorMessage ||
        body.ResponseDescription ||
        body.CustomerMessage ||
        "M-Pesa request was rejected. Check the phone number and try again."
    );
  }
  return { checkoutRequestId: body.CheckoutRequestID };
}

export async function stkQuery(checkoutRequestId: string): Promise<QueryResult> {
  const storeNumber = process.env["MPESA_STORE_NUMBER"];
  const passkey = process.env["MPESA_PASSKEY"];
  if (!storeNumber || !passkey) throw new Error("M-Pesa is not configured yet.");
  const timestamp = nairobiTimestamp();
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: storeNumber, Password: btoa(`${storeNumber}${passkey}${timestamp}`), Timestamp: timestamp, CheckoutRequestID: checkoutRequestId }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({})) as QueryResult;
  if (!res.ok || body.errorMessage) {
    console.error("Daraja STK query error", res.status, body.errorMessage || body.ResultDesc || "Query unavailable");
    throw new Error(body.errorMessage || body.ResultDesc || "Could not check M-Pesa. Please try again.");
  }
  return body;
}
