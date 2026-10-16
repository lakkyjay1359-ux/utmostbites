import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Utmost Bites" }, { name: "description", content: "Set a new password for the Utmost Bites control room." }, { property: "og:title", content: "Reset password — Utmost Bites" }, { property: "og:description", content: "Set a new control room password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [msg, setMsg] = useState(""); const [done, setDone] = useState(false);
  const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5";
  if (done) return <p className="p-16 text-center">Password updated. <Link to="/admin" className="underline">Go to control room</Link></p>;
  return (
    <form className="mx-auto max-w-sm space-y-3 px-4 py-16" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      if (pw !== pw2) return setMsg("Passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) setMsg(error.message); else setDone(true);
    }}>
      <h1 className="text-2xl font-bold text-gold">Set a new password</h1>
      <input className={input} type="password" required minLength={8} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <input className={input} type="password" required minLength={8} placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      <button className="w-full rounded-full bg-gold py-2.5 font-bold text-primary-foreground">Save password</button>
    </form>
  );
}
