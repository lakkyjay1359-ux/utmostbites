import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMPLOYEE_EMAIL } from "./employee";

export const provisionEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: owner, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !owner) throw new Error("Only the owner can create the employee account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readError } = await supabaseAdmin.from("employee_access").select("user_id").eq("singleton", true).maybeSingle();
    if (readError) throw new Error("Could not check employee setup.");
    if (existing) return { ready: true };
    let userId: string | undefined;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Could not check employee account.");
      userId = data.users.find((u) => u.email?.toLowerCase() === EMPLOYEE_EMAIL)?.id;
      if (userId || data.users.length < 200) break;
    }
    if (!userId) {
      const password = process.env["EMPLOYEE_PASSWORD"];
      if (!password) throw new Error("Save EMPLOYEE_PASSWORD securely before creating the account.");
      const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: EMPLOYEE_EMAIL, password, email_confirm: true });
      if (error || !data.user) throw new Error("Employee account could not be created. Check the password meets the account security requirements.");
      userId = data.user.id;
    }
    const { error } = await supabaseAdmin.from("employee_access").upsert({ singleton: true, user_id: userId, email: EMPLOYEE_EMAIL }, { onConflict: "singleton", ignoreDuplicates: true });
    if (error) throw new Error("Could not save employee access.");
    return { ready: true };
  });