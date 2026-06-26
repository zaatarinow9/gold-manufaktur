"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { getAdminSessionContext } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SetPasswordActionState = {
  fieldErrors?: Record<string, string>;
  message: string;
};

function getSafeRedirectPath(locale: AppLocale, redirectTo: string, fallback: string) {
  if (
    redirectTo.startsWith(`/${locale}/admin`) &&
    !redirectTo.startsWith(`/${locale}/admin/login`) &&
    !redirectTo.startsWith(`/${locale}/admin/auth`)
  ) {
    return redirectTo;
  }

  return fallback;
}

export async function setPasswordAction(
  locale: AppLocale,
  _previousState: SetPasswordActionState,
  formData: FormData
): Promise<SetPasswordActionState> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  if (!z.string().min(8).safeParse(password).success) {
    fieldErrors.password = t("accountSetup.errors.passwordLength");
  }

  if (confirmPassword !== password) {
    fieldErrors.confirmPassword = t("accountSetup.errors.passwordMismatch");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "",
    };
  }

  const access = await getAdminSessionContext();

  if (access.state !== "authenticated" || !access.user) {
    return {
      fieldErrors: {},
      message: t("accountSetup.errors.sessionExpired"),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      fieldErrors: {},
      message: t("accountSetup.errors.updateFailed"),
    };
  }

  redirect(
    getSafeRedirectPath(
      locale,
      redirectTo,
      getRoleDashboardPath(locale, access.user.role)
    )
  );
}
