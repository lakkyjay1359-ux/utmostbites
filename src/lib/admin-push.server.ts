import { isOnlineOrder } from "./admin-push";

// Awaited after all order lines are saved; a messaging outage must not fail checkout.
export async function sendNewOrderAlert(order: { id: string; source: string }) {
  if (!isOnlineOrder(order.source)) return;
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!apiKey || !connectionKey) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: devices, error } = await supabaseAdmin.from("admin_push_devices").select("token,user_id");
  if (error) throw new Error("Unable to read notification devices");
  await Promise.all((devices ?? []).map(async (device) => {
    const { data: owner } = await supabaseAdmin.rpc("has_role", { _user_id: device.user_id, _role: "admin" });
    if (!owner) return;
    const response = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: device.token, notification: { title: "Utmost Bites — new order", body: "A new online order has been placed. Open Orders to view it." }, webpush: { notification: { icon: "/icons/app-192.png", tag: `order-${order.id}` }, fcm_options: { link: "https://utmostbites.shop/admin" } } } }),
    });
    if (!response.ok) {
      const body = await response.text();
      // Do not log the response body: it can contain device registration tokens.
      if (body.includes("UNREGISTERED")) await supabaseAdmin.from("admin_push_devices").delete().eq("token", device.token);
      console.error("Order notification delivery failed", response.status);
    }
  }));
}