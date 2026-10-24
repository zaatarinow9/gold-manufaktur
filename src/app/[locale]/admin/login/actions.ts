"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { isAdminRole } from "@/lib/admin/roleAccess";
import { getClientIp } from "@/lib/security/http";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  fieldErrors?: Record<string, string>;
  message: string;
};

async function getLoginValidationCopy(
  locale: AppLocale,
  key: "emailInvalid" | "emailRequired" | "passwordRequired"
) {
  const t = await getTranslations({ locale, namespace: "Admin.login.validation" });
  return t(key);
}

export async function loginAction(
  locale: AppLocale,
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (!email) {
    fieldErrors.email = await getLoginValidationCopy(locale, "emailRequired");
  } else if (!z.string().email().safeParse(email).success) {
    fieldErrors.email = await getLoginValidationCopy(locale, "emailInvalid");
  }

  if (!password) {
    fieldErrors.password = await getLoginValidationCopy(locale, "passwordRequired");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "",
    };
  }

  const requestHeaders = await headers();
  const rateLimit = consumeRateLimit({
    key: `admin-login:${getClientIp(requestHeaders)}:${email.toLowerCase()}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      fieldErrors: {},
      message: t("login.invalidCredentials"),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      fieldErrors: {},
      message: t("login.invalidCredentials"),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      fieldErrors: {},
      message: t("login.invalidCredentials"),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    console.error(
      `[admin-login] Auth user ${user.id} (${user.email ?? "unknown_email"}) signed in without a profile row.`
    );
    await supabase.auth.signOut();

    return {
      fieldErrors: {},
      message: t("login.notices.accountNotConfigured"),
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();

    return {
      fieldErrors: {},
      message: t("login.notices.accountInactive"),
    };
  }

  if (!profile.role) {
    console.error(
      `[admin-login] Profile ${user.id} (${user.email ?? "unknown_email"}) is missing a role.`
    );
    await supabase.auth.signOut();

    return {
      fieldErrors: {},
      message: t("login.notices.accountNotConfigured"),
    };
  }

  if (!isAdminRole(profile.role)) {
    console.error(
      `[admin-login] Profile ${user.id} (${user.email ?? "unknown_email"}) has an unsupported role value.`
    );
    await supabase.auth.signOut();

    return {
      fieldErrors: {},
      message: t("login.notices.accountNotConfigured"),
    };
  }

  const safeRedirect =
    redirectTo.startsWith(`/${locale}/admin`) &&
    !redirectTo.startsWith(`/${locale}/admin/login`)
      ? redirectTo
      : getRoleDashboardPath(locale, profile.role);

  redirect(safeRedirect);
}

export async function logoutAction(locale: AppLocale) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/admin/login`);
}
