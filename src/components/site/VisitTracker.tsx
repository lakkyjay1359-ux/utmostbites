import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isStorefrontPath, shouldStartVisit } from "@/lib/website-visits";

export function VisitTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isStorefrontPath(pathname) || window.top !== window.self || !["utmostbites.shop", "www.utmostbites.shop", "utmostbites.lovable.app"].includes(window.location.hostname)) return;
    let id: string;
    try {
      const previous = JSON.parse(sessionStorage.getItem("utmost-visit") ?? "null") as { id?: string; last?: number } | null;
      id = previous?.id && typeof previous.last === "number" && !shouldStartVisit(previous.last, Date.now()) ? previous.id : crypto.randomUUID();
      sessionStorage.setItem("utmost-visit", JSON.stringify({ id, last: Date.now() }));
    } catch { id = crypto.randomUUID(); }
    // RPC builders are lazy: consume the promise so the request actually runs.
    void Promise.resolve(supabase.rpc("record_website_visit", { _session_id: id }))
      .then(({ error }) => {
        if (error) console.error("Could not record website visit:", error.message);
      })
      .catch(() => console.error("Could not record website visit: connection unavailable"));
  }, [pathname]);
  return null;
}