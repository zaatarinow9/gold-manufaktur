"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import type { AppLocale } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  message: string;
};

export async function loginAction(
  locale: AppLocale,
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      message: t("common.noAccessText"),
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      message: error.message,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
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
      message: t("common.noAccessText"),
    };
  }

  redirect(`/${locale}/admin`);
}

export async function logoutAction(locale: AppLocale) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/admin/login`);
}
