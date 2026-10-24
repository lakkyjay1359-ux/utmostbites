export function isOnlineOrder(source: string) { return source === "online"; }
export async function enableAdminPush() {
  const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID;
  const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY;
  const config = {
    apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY,
    projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID,
    appId,
    messagingSenderId: appId?.split(":")[1] ?? "",
  };
  if (!config.apiKey || !config.projectId || !appId || !vapidKey || !config.messagingSenderId) throw new Error("Phone alerts need Firebase’s Include web push setup completed first.");
  if (window.top !== window.self) throw new Error("Open utmostbites.shop/admin in its own tab to enable phone alerts.");
  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  if (!("Notification" in window) || !(await isSupported())) throw new Error("This browser cannot receive phone alerts. On iPhone, add this app to your Home Screen first.");
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications for this site in your phone’s browser settings.");
  const { initializeApp, getApps } = await import("firebase/app");
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config).toString()}`);
  const token = await getToken(getMessaging(getApps()[0] ?? initializeApp(config)), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Phone registration failed. Please try again.");
  return token;
}