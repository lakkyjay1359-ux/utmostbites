import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { enableAdminPush } from "@/lib/admin-push";

export function WebsiteActivity() {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const visits = useQuery({
    queryKey: ["admin", "visits"], refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("website_visit_totals");
      if (error) throw error;
      return data as { total: number; today: number; since: string | null };
    },
  });
  async function enable() {
    setBusy(true);
    try {
      const token = await enableAdminPush();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      const { error } = await supabase.from("admin_push_devices").upsert({ token, user_id: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      setEnabled(true);
      toast.success("New-order alerts enabled on this phone");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not enable phone alerts"); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3" aria-label="Website activity">
    <div className="grid grid-cols-2 gap-3">
      {[{ label: "Website visits today", value: visits.data?.today }, { label: "Total website visits", value: visits.data?.total }].map((item) => <div className="panel p-4" key={item.label}><p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-bold text-gold">{visits.isError ? "Unavailable" : item.value?.toLocaleString() ?? "…"}</p></div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{visits.data?.since ? `Counted since ${new Date(visits.data.since).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}` : "Visit counting starts when this update goes live."}</p>
      <Button variant="outline" disabled={busy} onClick={enable}>{enabled ? <Bell /> : <BellOff />}{busy ? "Enabling…" : enabled ? "Phone alerts enabled" : "Enable phone alerts"}</Button>
    </div>
  </section>;
}