import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_SECTIONS, allowedEmployeeSections, type EmployeeSection } from "@/lib/employee";
import { formatOrderNo, ksh } from "@/lib/site";
import { fmtNairobi } from "@/lib/admin";

type Row = { order_no?: number | null; customer_name?: string; phone?: string; fulfillment?: string; location?: string | null; total?: number; status?: string; payment_status?: string; created_at?: string; name?: string; quantity?: number; min_level?: number; unit?: string; price?: number; available?: boolean; variants?: { label: string; price: number }[] };
export function EmployeeRoom({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<EmployeeSection>("dashboard");
  const access = useQuery({ queryKey: ["employee", "access"], refetchInterval: 5000, queryFn: async () => {
    const { data, error } = await supabase.from("employee_access").select("enabled,sections").maybeSingle();
    if (error) throw error;
    return data;
  } });
  const sections = access.data?.enabled ? allowedEmployeeSections(access.data.sections) : [];
  const selected = sections.includes(tab) ? tab : sections[0];
  useEffect(() => { if (selected) setTab(selected); }, [selected]);
  const content = useQuery({ queryKey: ["employee", "section", selected], enabled: !!selected, refetchInterval: 5000, queryFn: async () => {
    if (!selected) throw new Error("Access denied");
    const { data, error } = await supabase.rpc("employee_section_data", { _section: selected });
    if (error) throw error;
    return data;
  } });
  const rows = Array.isArray(content.data) ? content.data as Row[] : [];
  const summary = content.data && !Array.isArray(content.data) ? content.data as Record<string, number> : {};
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gold">Employee dashboard</h1><Button variant="ghost" onClick={onLogout}><LogOut />Logout</Button></div>
    <nav className="flex flex-wrap gap-2">{EMPLOYEE_SECTIONS.filter((s) => sections.includes(s.id)).map((s) => <Button key={s.id} variant={selected === s.id ? "default" : "outline"} onClick={() => setTab(s.id)}>{s.label}</Button>)}</nav>
    {access.isPending ? <p>Loading…</p> : access.isError ? <p role="alert">Could not load access.</p> : !sections.length ? <p className="text-muted-foreground">{access.data?.enabled ? "No sections have been assigned yet." : "Employee access is disabled."}</p> : <>
      <h2 className="text-xl font-bold text-gold">{EMPLOYEE_SECTIONS.find((s) => s.id === selected)?.label}</h2>
      {content.isPending ? <p>Loading…</p> : content.isError ? <p role="alert" className="text-destructive">This section is no longer available.</p> : selected === "dashboard" ?
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["New orders",summary['newOrders']], ["Being prepared",summary['preparing']], ["Completed today",summary['completedToday']], ["Today's sales", ksh(summary['salesToday'] ?? 0)]].map(([label,value]) => <div key={label} className="border-b border-border py-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-bold text-gold">{value ?? 0}</dd></div>)}</dl> :
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border">{(selected === "orders" ? ["Order","Customer","Phone","Delivery / Pickup","Total","Payment","Status"] : selected === "stock" ? ["Item","Quantity","Minimum"] : selected === "menu" ? ["Item","Price","Available"] : ["Order","Date","Total","Status"]).map((h) => <th className="px-3 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,index) => <tr key={index} className="border-b border-border">{(selected === "orders" ? [formatOrderNo(r.order_no ?? null),r.customer_name,r.phone,[r.fulfillment,r.location].filter(Boolean).join(" — "), ksh(r.total ?? 0),r.payment_status,r.status] : selected === "stock" ? [r.name,`${r.quantity} ${r.unit}`,r.min_level] : selected === "menu" ? [r.name,r.variants?.length ? r.variants.map((v) => `${v.label} ${ksh(v.price)}`).join(" · ") : ksh(r.price ?? 0),r.available ? "Yes" : "Sold out"] : [formatOrderNo(r.order_no ?? null),r.created_at ? fmtNairobi(r.created_at) : "",ksh(r.total ?? 0),r.status]).map((v,i) => <td key={i} className="px-3 py-3">{v}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="py-6 text-muted-foreground">Nothing here yet.</p>}</div>}
    </>}
  </div>;
}