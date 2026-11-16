import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function WebsiteActivity() {
  const visits = useQuery({
    queryKey: ["admin", "visits"], refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("website_visit_totals");
      if (error) throw error;
      return data as { total: number; today: number; since: string | null };
    },
  });
  return <section className="space-y-3" aria-label="Website activity">
    <div className="panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Website visits</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Today <span className="font-bold text-gold">{visits.data?.today ?? "…"}</span> · Total <span className="font-bold text-gold">{visits.data?.total ?? "…"}</span></p>
          <Button variant="ghost" size="icon" aria-label="Refresh website visits" title="Refresh website visits" disabled={visits.isFetching} onClick={() => { void visits.refetch(); }}><RefreshCw className={visits.isFetching ? "animate-spin" : ""} /></Button>
        </div>
      </div>
      {visits.isError && <p role="alert" className="mt-2 text-sm text-destructive">Could not load website visits. Please refresh to try again.</p>}
      <p className="mt-2 text-xs text-muted-foreground">{visits.data?.since ? `Counted since ${new Date(visits.data.since).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}` : "No visits recorded yet."}</p>
    </div>
  </section>;
}
