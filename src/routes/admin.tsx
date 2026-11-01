import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutDashboard, ShoppingCart, ClipboardList, UtensilsCrossed, Boxes, BarChart3, Settings, LogOut, Menu as MenuIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatOrderNo, ksh } from "@/lib/site";
import { DashboardView, OrdersView, MenuView, StockView, SalesView, SettingsView } from "@/components/admin/AdminViews";
import { PosView } from "@/components/admin/PosView";
import { EmployeeAccess } from "@/components/admin/EmployeeAccess";
import { EmployeeRoom } from "@/components/admin/EmployeeRoom";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Control Room — Utmost Bites" }, { name: "description", content: "Utmost Bites staff dashboard." }, { property: "og:title", content: "Control Room — Utmost Bites" }, { property: "og:description", content: "Utmost Bites private order and sales management." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pos", label: "Point of Sale", icon: ShoppingCart },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "menu", label: "Menu Management", icon: UtensilsCrossed },
  { id: "stock", label: "Stock Management", icon: Boxes },
  { id: "sales", label: "Sales Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type Tab = (typeof NAV)[number]["id"];

function AdminPage() {
  const [state, setState] = useState<"loading" | "out" | "denied" | "in" | "employee">("loading");
  const qc = useQueryClient();
  const logout = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); setState("out"); };
  const check = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setState("out");
    const { data: ok } = await supabase.rpc("claim_first_admin");
    if (ok) return setState("in");
    const { data: access } = await supabase.from("employee_access").select("user_id").eq("user_id", data.user.id).maybeSingle();
    setState(access ? "employee" : "denied");
  };
  useEffect(() => { check(); }, []);
  if (state === "loading") return <p className="p-16 text-center">Loading…</p>;
  if (state === "out") return <Login onDone={check} />;
  if (state === "denied") return <p className="p-16 text-center">This account has no staff access. <Button variant="link" onClick={logout}>Sign out</Button></p>;
  if (state === "employee") return <EmployeeRoom onLogout={logout} />;
  return <ControlRoom onLogout={logout} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  return (
    <form className="mx-auto max-w-sm space-y-3 px-4 py-16" onSubmit={async (e) => {
      e.preventDefault(); setMsg(""); setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      setBusy(false);
      if (error) setMsg(error.message); else onDone();
    }}>
      <h1 className="text-2xl font-bold text-gold">Staff login</h1>
      <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" required minLength={8} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      <button disabled={busy} className="w-full rounded-full bg-gold py-2.5 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="w-full text-sm underline" onClick={async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, { redirectTo: `${window.location.origin}/reset-password` });
        setMsg(error ? error.message : "If the owner account exists, a reset link was sent to the owner's email.");
      }}>Forgot password?</button>
    </form>
  );
}

const OWNER_EMAIL = "lewisirabu@gmail.com";

function ChangePassword() {
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);
  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  return (
    <form className="mt-8 max-w-sm space-y-3 rounded-xl border border-border p-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as { password: string });
      setBusy(false);
      if (error) toast.error(error.message); else { toast.success("Password changed"); setCur(""); setPw(""); }
    }}>
      <h2 className="font-bold text-gold">Change password</h2>
      <input className={input} type="password" required placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
      <input className={input} type="password" required minLength={8} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button disabled={busy} className="rounded-full bg-gold px-5 py-2 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}

function ControlRoom({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
        const o = p.new as { order_no: number | null; customer_name: string; total: number; source?: string };
        if (o.source !== "pos") toast.success(`New order ${formatOrderNo(o.order_no)} — ${o.customer_name} · ${ksh(o.total)}`, { duration: 10000 });
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (p) => {
        const o = p.new as { order_no: number | null; customer_name: string; total: number; source?: string };
        if (o.source !== "pos" && o.order_no != null && p.old['order_no'] == null) toast.success(`Paid order ${formatOrderNo(o.order_no)} — ${o.customer_name} · ${ksh(o.total)}`);
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const go = (t: Tab) => { setTab(t); setNavOpen(false); };
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <aside className={`${navOpen ? "fixed inset-0 z-40 block bg-background p-4" : "hidden"} w-56 shrink-0 md:static md:block md:p-0`}>
        <p className="mb-4 font-bold text-gold">Control Room</p>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${tab === n.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <n.icon className="h-4 w-4" />{n.label}</button>
          ))}
          <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-muted"><LogOut className="h-4 w-4" />Logout</button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <button className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm md:hidden" onClick={() => setNavOpen(true)}><MenuIcon className="h-4 w-4" /> Sections</button>
        {tab === "dashboard" && <DashboardView onOpen={(id) => { setOpenOrder(id); setTab("orders"); }} />}
        {tab === "pos" && <PosView />}
        {tab === "orders" && <OrdersView openId={openOrder} setOpenId={setOpenOrder} />}
        {tab === "menu" && <MenuView />}
        {tab === "stock" && <StockView />}
        {tab === "sales" && <SalesView />}
        {tab === "settings" && <><SettingsView /><EmployeeAccess /><ChangePassword /></>}
      </main>
    </div>
  );
}
