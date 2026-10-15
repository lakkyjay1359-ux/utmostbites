import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Boxes, BarChart3, Settings, LogOut, Menu as MenuIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ksh } from "@/lib/site";
import { DashboardView, OrdersView, MenuView, StockView, SalesView, SettingsView } from "@/components/admin/AdminViews";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Control Room — Utmost Bites" }, { name: "description", content: "Utmost Bites staff dashboard." }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "menu", label: "Menu Management", icon: UtensilsCrossed },
  { id: "stock", label: "Stock Management", icon: Boxes },
  { id: "sales", label: "Sales Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type Tab = (typeof NAV)[number]["id"];

function AdminPage() {
  const [state, setState] = useState<"loading" | "out" | "denied" | "in">("loading");
  const check = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setState("out");
    const { data: ok } = await supabase.rpc("claim_first_admin");
    setState(ok ? "in" : "denied");
  };
  useEffect(() => { check(); }, []);
  if (state === "loading") return <p className="p-16 text-center">Loading…</p>;
  if (state === "out") return <Login onDone={check} />;
  if (state === "denied") return <p className="p-16 text-center">This account is not an admin. <button className="underline" onClick={async () => { await supabase.auth.signOut(); setState("out"); }}>Sign out</button></p>;
  return <ControlRoom onLogout={async () => { await supabase.auth.signOut(); setState("out"); }} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const { data: hasAdmin } = useQuery({ queryKey: ["admin-exists"], queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true });
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
      {hasAdmin === false && (
        <button type="button" className="w-full text-sm underline" onClick={async () => {
          const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + "/admin" } });
          setMsg(error ? error.message : "Check your email to confirm, then sign in. The first account becomes admin.");
        }}>Create first admin account</button>
      )}
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
        const o = p.new as { code: string; customer_name: string; total: number };
        toast.success(`New order ${o.code} — ${o.customer_name} · ${ksh(o.total)}`, { duration: 10000 });
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
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
        {tab === "orders" && <OrdersView openId={openOrder} setOpenId={setOpenOrder} />}
        {tab === "menu" && <MenuView />}
        {tab === "stock" && <StockView />}
        {tab === "sales" && <SalesView />}
        {tab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
