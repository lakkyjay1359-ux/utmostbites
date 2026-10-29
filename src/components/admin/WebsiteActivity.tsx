import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { enableAdminPush } from "@/lib/admin-push";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
  const daily = useQuery({
    queryKey: ["admin", "visits-daily"], refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("website_visit_daily", { _days: 14 });
      if (error) throw error;
      return (data ?? []) as { day: string; visits: number }[];
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
  const chartData = (daily.data ?? []).map((d) => ({ ...d, label: new Date(d.day + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" }) }));
  return <section className="space-y-3" aria-label="Website activity">
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Website visits — last 14 days</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Today <span className="font-bold text-gold">{visits.data?.today ?? "…"}</span> · Total <span className="font-bold text-gold">{visits.data?.total ?? "…"}</span></p>
          <Button variant="ghost" size="icon" aria-label="Refresh website visits" title="Refresh website visits" disabled={daily.isFetching || visits.isFetching} onClick={() => { void daily.refetch(); void visits.refetch(); }}><RefreshCw className={daily.isFetching || visits.isFetching ? "animate-spin" : ""} /></Button>
        </div>
      </div>
      {daily.isPending ? <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Loading visits…</p> : daily.isError ? <p role="alert" className="text-sm text-destructive">Could not load website visits. Please refresh to try again.</p> :
        <ChartContainer config={{ visits: { label: "Visits", color: "var(--primary)" } }} className="h-56 w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
          </BarChart>
        </ChartContainer>}
      {daily.isSuccess && chartData.every((day) => Number(day.visits) === 0) && <p className="text-sm text-muted-foreground">No website visits recorded in the last 14 days.</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{visits.data?.since ? `Counted since ${new Date(visits.data.since).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}` : "No visits recorded yet."}</p>
      <Button variant="outline" disabled={busy} onClick={enable}>{enabled ? <Bell /> : <BellOff />}{busy ? "Enabling…" : enabled ? "Phone alerts enabled" : "Enable phone alerts"}</Button>
    </div>
  </section>;
}