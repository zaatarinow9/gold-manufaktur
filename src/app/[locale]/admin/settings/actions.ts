"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import type { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import { saveAdminNotificationEmail } from "@/lib/db/siteSettings";

const settingsSchema = z.object({
  adminNotificationEmail: z.string().trim().email().or(z.literal("")),
});

function getSettingsCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      invalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
      saved: "تم حفظ إعدادات الإشعارات.",
      tableMissing:
        "جدول الإعدادات غير متوفر بعد. شغّل الهجرة 0008_admin_workflow_cleanup.sql أولاً.",
    };
  }

  if (locale === "de") {
    return {
      invalidEmail: "Bitte geben Sie eine gueltige E-Mail-Adresse ein.",
      saved: "Die Benachrichtigungseinstellungen wurden gespeichert.",
      tableMissing:
        "Die Einstellungstabelle ist noch nicht verfuegbar. Fuehren Sie zuerst die Migration 0008_admin_workflow_cleanup.sql aus.",
    };
  }

  return {
    invalidEmail: "Please enter a valid email address.",
    saved: "Notification settings saved.",
    tableMissing:
      "The settings table is not available yet. Run migration 0008_admin_workflow_cleanup.sql first.",
  };
}

export async function saveAdminSettingsAction(
  locale: AppLocale,
  input: { adminNotificationEmail: string }
): Promise<AdminActionResult> {
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return {
      message: locale === "ar" ? "لا تملك صلاحية الوصول." : "No access.",
      ok: false,
    };
  }

  const copy = getSettingsCopy(locale);
  const result = settingsSchema.safeParse(input);

  if (!result.success) {
    return {
      fieldErrors: {
        adminNotificationEmail: copy.invalidEmail,
      },
      message: copy.invalidEmail,
      ok: false,
    };
  }

  try {
    await saveAdminNotificationEmail(result.data.adminNotificationEmail);

    routing.locales.forEach((targetLocale) => {
      revalidatePath(`/${targetLocale}/admin/settings`);
    });

    return {
      message: copy.saved,
      ok: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "SITE_SETTINGS_TABLE_MISSING") {
      return {
        fieldErrors: {
          adminNotificationEmail: copy.tableMissing,
        },
        message: copy.tableMissing,
        ok: false,
      };
    }

    return {
      message: error instanceof Error ? error.message : copy.tableMissing,
      ok: false,
    };
  }
}
