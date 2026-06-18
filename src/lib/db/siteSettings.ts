import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const siteSettingKeys = {
  adminNotificationEmail: "admin_notification_email",
} as const;

async function upsertSiteTextSetting(key: string, value: string) {
  const supabase = await createSupabaseServerClient();
  const normalizedValue = value.trim() || null;
  const now = new Date().toISOString();
  const { error } = await supabase.from("site_settings").upsert(
    {
      key,
      updated_at: now,
      value_json: {},
      value_text: normalizedValue,
    },
    {
      onConflict: "key",
    }
  );

  if (error) {
    if (error.message.toLowerCase().includes("site_settings")) {
      throw new Error("SITE_SETTINGS_TABLE_MISSING");
    }

    throw new Error(`Unable to save site setting: ${error.message}`);
  }
}

export async function getSiteTextSetting(key: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value_text")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    if (error.message.toLowerCase().includes("site_settings")) {
      return "";
    }

    throw new Error(`Unable to load site setting: ${error.message}`);
  }

  return data?.value_text?.trim() ?? "";
}

export async function getAdminNotificationEmail() {
  return getSiteTextSetting(siteSettingKeys.adminNotificationEmail);
}

export async function saveAdminNotificationEmail(email: string) {
  return upsertSiteTextSetting(siteSettingKeys.adminNotificationEmail, email);
}
