"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  fieldErrors?: Record<string, string>;
  message: string;
};

function getLoginValidationCopy(
  locale: AppLocale,
  key: "emailInvalid" | "emailRequired" | "passwordRequired"
) {
  if (locale === "de") {
    switch (key) {
      case "emailInvalid":
        return "Bitte geben Sie eine gueltige E-Mail-Adresse ein.";
      case "emailRequired":
        return "Bitte geben Sie Ihre E-Mail-Adresse ein.";
      case "passwordRequired":
        return "Bitte geben Sie Ihr Passwort ein.";
    }
  }

  if (locale === "ar") {
    switch (key) {
      case "emailInvalid":
        return "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0635\u062d\u064a\u062d.";
      case "emailRequired":
        return "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.";
      case "passwordRequired":
        return "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.";
    }
  }

  switch (key) {
    case "emailInvalid":
      return "Please enter a valid email address.";
    case "emailRequired":
      return "Please enter your email address.";
    case "passwordRequired":
      return "Please enter your password.";
  }
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
    fieldErrors.email = getLoginValidationCopy(locale, "emailRequired");
  } else if (!z.string().email().safeParse(email).success) {
    fieldErrors.email = getLoginValidationCopy(locale, "emailInvalid");
  }

  if (!password) {
    fieldErrors.password = getLoginValidationCopy(locale, "passwordRequired");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "",
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
      message: t("common.noAccessText"),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      fieldErrors: {},
      message: t("common.noAccessText"),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || !profile.role) {
    await supabase.auth.signOut();

    return {
      fieldErrors: {},
      message: t("common.noAccessText"),
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
