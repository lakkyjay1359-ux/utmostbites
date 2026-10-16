// M-Pesa Daraja (Lipa Na M-Pesa Online / STK Push) helpers.
// Server-only: reads MPESA_* secrets from the environment inside functions.

const baseUrl = () =>
  process.env["MPESA_ENV === "production"
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
  const body = (await res.json()) as { access_token?: string };
  if (!res.ok || !body.access_token) throw new Error("Could not reach M-Pesa. Please try again.");
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

export async function stkPush(args: {
  phone: string; // 07... or 01... Kenyan format
  amount: number;
  orderCode: string;
  callbackUrl: string;
}): Promise<{ checkoutRequestId: string }> {
  const shortcode = process.env["MPESA_SHORTCODE"];
  const passkey = process.env["MPESA_PASSKEY"];
  if (!shortcode || !passkey) throw new Error("M-Pesa is not configured yet.");

  const timestamp = nairobiTimestamp();
  const password = btoa(`${shortcode}${passkey}${timestamp}`);
  const phone254 = "254" + args.phone.slice(1);
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.max(1, Math.round(args.amount)),
      PartyA: phone254,
      PartyB: shortcode,
      PhoneNumber: phone254,
      CallBackURL: args.callbackUrl,
      AccountReference: args.orderCode,
      TransactionDesc: `Utmost Bites order ${args.orderCode}`,
    }),
  });
  const body = (await res.json()) as {
    ResponseCode?: string;
    CheckoutRequestID?: string;
    errorMessage?: string;
    CustomerMessage?: string;
  };
  if (!res.ok || body.ResponseCode !== "0" || !body.CheckoutRequestID) {
    throw new Error(body.errorMessage || body.CustomerMessage || "M-Pesa request was rejected. Check the phone number and try again.");
  }
  return { checkoutRequestId: body.CheckoutRequestID };
}
