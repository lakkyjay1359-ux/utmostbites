// One-time creation of the single owner admin account. Server-only.
// Never logs the password.
export type BootstrapResult = "already_done" | "created" | "existing_user_promoted" | "not_configured";

let inflight: Promise<BootstrapResult> | null = null;

export function runAdminBootstrap(): Promise<BootstrapResult> {
  if (!inflight) inflight = doRun().finally(() => { inflight = null; });
  return inflight;
}

export async function isBootstrapDone(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_bootstrap").select("done").eq("singleton", true).maybeSingle();
  return !!data?.done;
}

async function doRun(): Promise<BootstrapResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (await isBootstrapDone()) return "already_done";

  const email = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  const password = process.env["ADMIN_PASSWORD"];
  if (!email || !password) return "not_configured";

  let userId: string | null = null;
  let result: BootstrapResult = "created";

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created?.user) {
    userId = created.user.id;
  } else {
    // Already exists: find it, never touch its password.
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list, error: le } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (le) throw new Error(`Admin bootstrap: list users failed: ${le.message}`);
      userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (list.users.length < 200) break;
    }
    if (!userId) throw new Error(`Admin bootstrap: create user failed: ${error?.message ?? "unknown"}`);
    result = "existing_user_promoted";
  }

  const { error: fe } = await supabaseAdmin.rpc("finalize_admin_bootstrap", { _user_id: userId });
  if (fe) throw new Error(`Admin bootstrap: finalize failed: ${fe.message}`);
  console.log(`Admin bootstrap: ${result}`);
  return result;
}
