"use server";

import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { runFlowAction } from "@/lib/admin/flowActions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const everyone = ["super_admin", "admin", "employee", "marketing", "customer_service"] as const;

/** The signed-in person changes the name shown in the dashboard. */
export async function updateMyNameAction(locale: AppLocale, name: string) {
  return runFlowAction(locale, [...everyone], async (user) => {
    const fullName = z.string().trim().min(2).max(160).parse(name);
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    if (error) throw new Error("FAILED");
    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { full_name: fullName } });
    if (user.linkedEmployeeId) {
      await supabase.from("employees").update({ full_name: fullName }).eq("id", user.linkedEmployeeId);
    }
    return "profileSaved";
  });
}

/** Sets a new password for the signed-in person. */
export async function changeMyPasswordAction(locale: AppLocale, password: string) {
  return runFlowAction(locale, [...everyone], async () => {
    if (password.length < 8 || password.length > 128) throw new Error("PASSWORD_TOO_SHORT");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.code === "same_password" ? "PASSWORD_SAME" : "FAILED");
    return "passwordChanged";
  });
}
