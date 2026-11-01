import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_EMAIL, EMPLOYEE_SECTIONS, allowedEmployeeSections } from "@/lib/employee";
import { provisionEmployee } from "@/lib/employee.functions";

export function EmployeeAccess() {
  const qc = useQueryClient();
  const createEmployee = useServerFn(provisionEmployee);
  const [busy, setBusy] = useState(false);
  const access = useQuery({ queryKey: ["admin", "employee-access"], queryFn: async () => {
    const { data, error } = await supabase.from("employee_access").select("*").eq("singleton", true).maybeSingle();
    if (error) throw error;
    return data;
  } });
  async function save(patch: { sections?: string[]; enabled?: boolean }) {
    setBusy(true);
    const { data, error } = await supabase.from("employee_access").update({ ...patch, updated_at: new Date().toISOString() }).eq("singleton", true).select("user_id");
    setBusy(false);
    if (error || !data?.length) return void toast.error("Could not save employee access.");
    await qc.invalidateQueries({ queryKey: ["admin", "employee-access"] });
    toast.success("Employee access saved");
  }
  return <section className="mt-8 space-y-4 border-t border-border pt-6" aria-label="Employee access">
    <h2 className="text-xl font-bold text-gold">Employee access</h2>
    <p className="break-all text-sm">{EMPLOYEE_EMAIL}</p>
    {access.isPending ? <p>Loading…</p> : access.isError ? <p role="alert">Could not load employee access.</p> : !access.data ?
      <Button disabled={busy} onClick={async () => { setBusy(true); try { await createEmployee(); await qc.invalidateQueries({ queryKey: ["admin", "employee-access"] }); toast.success("Employee account ready"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create employee"); } finally { setBusy(false); } }}>{busy ? "Creating…" : "Create employee account"}</Button> : <>
      <label className="flex items-center gap-3"><input type="checkbox" checked={access.data.enabled} disabled={busy} onChange={(e) => void save({ enabled: e.target.checked })} />Account enabled</label>
      <h3 className="text-sm font-semibold text-muted-foreground">Visible sections · view only</h3>
      <div className="grid gap-3 sm:grid-cols-2">{EMPLOYEE_SECTIONS.map((s) => <label key={s.id} className="flex items-center gap-3"><input type="checkbox" checked={access.data?.sections.includes(s.id) ?? false} disabled={busy} onChange={(e) => { const sections = access.data?.sections ?? []; void save({ sections: allowedEmployeeSections(e.target.checked ? [...sections, s.id] : sections.filter((id) => id !== s.id)) }); }} />{s.label}</label>)}</div>
    </>}
  </section>;
}