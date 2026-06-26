"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import type { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  createManagedAdminUser,
  deleteManagedAdminUser,
  resendManagedAdminInvite,
  sendManagedAdminPasswordReset,
  type ManagedAdminRole,
  setManagedAdminUserActive,
  updateManagedAdminUser,
} from "@/lib/db/adminUsers";
import {
  buildOrderEntryUrl,
  rotateOrderEntryAccess,
  saveNotificationSettings,
  saveOrderEntrySettings,
  SiteSettingsError,
} from "@/lib/db/siteSettings";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import { buildOrderEntryLinkEmail } from "@/lib/email/orderEntryLinkEmail";
import { sendTransactionalEmail } from "@/lib/email/service";
import { companyInfo } from "@/lib/site";

const notificationSettingsSchema = z.object({
  adminNotificationEmail: z.string().trim().email().or(z.literal("")),
  ownerEmail: z.string().trim().email().or(z.literal("")),
  supportNotificationEmail: z.string().trim().email().or(z.literal("")),
});

const managedUserSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160),
  isActive: z.boolean().default(true),
  role: z.enum(["super_admin", "admin", "employee"]),
});

const orderEntrySchema = z.object({
  enabled: z.boolean(),
  expiresAt: z.string().trim().max(80).default(""),
});

const sendOrderEntryLinkEmailSchema = z.object({
  enabled: z.boolean(),
  expiresAt: z.string().trim().max(80).default(""),
  recipientEmail: z.string().trim().email().max(160),
});

type SettingsActionWithLink = AdminActionResult & {
  link?: string;
};

function getSettingsActionCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      invalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
      invalidName: "يرجى إدخال اسم واضح.",
      noAccess: "لا تملك صلاحية الوصول.",
      orderEntryRotated: "تم تدوير رابط إدخال الطلبات بنجاح.",
      orderEntrySendDisabled: "فعّل رابط إدخال الطلبات الخارجي قبل إرساله بالبريد الإلكتروني.",
      orderEntrySendFailed: "تعذر إرسال رابط إدخال الطلبات بالبريد الإلكتروني.",
      orderEntrySendSavedOnly:
        "تم تجهيز الرسالة، لكن الإرسال بالبريد الإلكتروني متوقف لأن إعداد SMTP غير مكتمل.",
      orderEntrySent: "تم إرسال رابط إدخال الطلبات بالبريد الإلكتروني.",
      privacyPhrase: "عبارة التفعيل غير صحيحة.",
      saved: "تم حفظ الإعدادات.",
      userCreated:
        "تم إنشاء المستخدم وإرسال رابط الدخول إذا كانت خدمة البريد متاحة.",
      userDeleted: "تمت إزالة المستخدم من النظام.",
      userInviteSent: "تم إنشاء رابط جديد للمستخدم.",
      userPasswordResetSent:
        "تم إنشاء رابط جديد لإعادة تعيين كلمة المرور.",
      userUpdated: "تم تحديث بيانات المستخدم.",
      userVisibilityChanged: "تم تحديث حالة المستخدم.",
    };
  }

  if (locale === "de") {
    return {
      invalidEmail: "Bitte geben Sie eine gueltige E-Mail-Adresse ein.",
      invalidName: "Bitte geben Sie einen gueltigen Anzeigenamen ein.",
      noAccess: "Kein Zugriff.",
      orderEntryRotated: "Der Auftragserfassungslink wurde neu erzeugt.",
      orderEntrySendDisabled:
        "Aktivieren Sie den externen Auftragserfassungslink, bevor Sie ihn per E-Mail versenden.",
      orderEntrySendFailed:
        "Der Auftragserfassungslink konnte per E-Mail nicht versendet werden.",
      orderEntrySendSavedOnly:
        "Die E-Mail wurde vorbereitet, aber nicht versendet, weil SMTP noch nicht vollstaendig eingerichtet ist.",
      orderEntrySent: "Der Auftragserfassungslink wurde per E-Mail versendet.",
      privacyPhrase: "Die Schutz-Passphrase ist ungueltig.",
      saved: "Die Einstellungen wurden gespeichert.",
      userCreated:
        "Der Benutzer wurde angelegt. Der Zugangslink wurde versendet oder protokolliert.",
      userDeleted: "Der Benutzer wurde aus dem System entfernt.",
      userInviteSent: "Ein neuer Zugangslink wurde erstellt.",
      userPasswordResetSent: "Der Passwort-Link wurde erstellt.",
      userUpdated: "Die Benutzerdaten wurden aktualisiert.",
      userVisibilityChanged: "Der Benutzerstatus wurde aktualisiert.",
    };
  }

  return {
    invalidEmail: "Please enter a valid email address.",
    invalidName: "Please enter a valid display name.",
    noAccess: "No access.",
    orderEntryRotated: "The external order-entry link was rotated.",
    orderEntrySendDisabled:
      "Enable the external order-entry link before sending it by email.",
    orderEntrySendFailed: "The external order-entry link could not be sent by email.",
    orderEntrySendSavedOnly:
      "The email was prepared, but delivery was skipped because SMTP is not fully configured.",
    orderEntrySent: "The external order-entry link was sent by email.",
    privacyPhrase: "The privacy passphrase is invalid.",
    saved: "Settings saved.",
    userCreated: "The user was created. The access link was sent or logged.",
    userDeleted: "The user was removed from the system.",
    userInviteSent: "A new access link was generated.",
    userPasswordResetSent: "A password reset link was generated.",
    userUpdated: "The user was updated.",
    userVisibilityChanged: "The user status was updated.",
  };
}

function revalidateSettingsViews() {
  routing.locales.forEach((targetLocale) => {
    revalidatePath(`/${targetLocale}/admin`);
    revalidatePath(`/${targetLocale}/admin/settings`);
  });
}

async function getDecoyBlockedResult(
  locale: AppLocale
): Promise<SettingsActionWithLink | null> {
  if (!(await isAdminDecoyEnabled())) {
    return null;
  }

  return {
    message: getAdminDecoyUnavailableMessage(locale),
    ok: false,
  };
}

async function requireSettingsAccess(locale: AppLocale) {
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return null;
  }

  return access.user;
}

function getValidationFailure(
  locale: AppLocale,
  message?: string
): AdminActionResult {
  const copy = getSettingsActionCopy(locale);
  return {
    message: message ?? copy.invalidEmail,
    ok: false,
  };
}

function isSuperAdminRole(role: ManagedAdminRole) {
  return role === "super_admin";
}

export async function saveNotificationSettingsAction(
  locale: AppLocale,
  input: z.infer<typeof notificationSettingsSchema>
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user) {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  const parsed = notificationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return getValidationFailure(locale);
  }

  try {
    await saveNotificationSettings(parsed.data);
    revalidateSettingsViews();
    return {
      message: copy.saved,
      ok: true,
    };
  } catch (error) {
    return {
      message:
        error instanceof SiteSettingsError
          ? error.messageForUi
          : error instanceof Error
            ? error.message
            : copy.invalidEmail,
      ok: false,
    };
  }
}

export async function saveOrderEntrySettingsAction(
  locale: AppLocale,
  input: z.infer<typeof orderEntrySchema>
): Promise<SettingsActionWithLink> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user) {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  const parsed = orderEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: copy.saved,
      ok: false,
    };
  }

  try {
    const token = await saveOrderEntrySettings(parsed.data);
    revalidateSettingsViews();
    return {
      link: buildOrderEntryUrl(locale, token),
      message: copy.saved,
      ok: true,
    };
  } catch (error) {
    return {
      message:
        error instanceof SiteSettingsError
          ? error.messageForUi
          : error instanceof Error
            ? error.message
            : copy.saved,
      ok: false,
    };
  }
}

export async function rotateOrderEntryAccessAction(
  locale: AppLocale,
  input: z.infer<typeof orderEntrySchema>
): Promise<SettingsActionWithLink> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user) {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  const parsed = orderEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: copy.saved,
      ok: false,
    };
  }

  try {
    const result = await rotateOrderEntryAccess({
      actorEmail: user.email,
      enabled: parsed.data.enabled,
      expiresAt: parsed.data.expiresAt,
    });
    revalidateSettingsViews();

    return {
      link: buildOrderEntryUrl(locale, result.token),
      message: copy.orderEntryRotated,
      ok: true,
    };
  } catch (error) {
    return {
      message:
        error instanceof SiteSettingsError
          ? error.messageForUi
          : error instanceof Error
            ? error.message
            : copy.saved,
      ok: false,
    };
  }
}

export async function sendOrderEntryLinkEmailAction(
  locale: AppLocale,
  input: z.infer<typeof sendOrderEntryLinkEmailSchema>
): Promise<SettingsActionWithLink> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user) {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  const parsed = sendOrderEntryLinkEmailSchema.safeParse(input);

  if (!parsed.success) {
    return getValidationFailure(locale);
  }

  if (!parsed.data.enabled) {
    return {
      message: copy.orderEntrySendDisabled,
      ok: false,
    };
  }

  try {
    const token = await saveOrderEntrySettings({
      enabled: parsed.data.enabled,
      expiresAt: parsed.data.expiresAt,
    });
    const link = buildOrderEntryUrl(locale, token);
    const email = buildOrderEntryLinkEmail({
      expiresAt: parsed.data.expiresAt,
      link,
    });
    const emailResult = await sendTransactionalEmail({
      html: email.html,
      metadata: {
        actorEmail: user.email,
        expiresAt: parsed.data.expiresAt || null,
        kind: "order_entry_link_email",
        link,
      },
      recipientEmail: parsed.data.recipientEmail,
      replyTo: companyInfo.emailDisplay,
      subject: email.subject,
      text: email.text,
    });

    revalidateSettingsViews();

    if (!emailResult.ok) {
      return {
        link,
        message: copy.orderEntrySendFailed,
        ok: false,
      };
    }

    if (emailResult.status !== "sent") {
      return {
        link,
        message: copy.orderEntrySendSavedOnly,
        ok: false,
      };
    }

    return {
      link,
      message: copy.orderEntrySent,
      ok: true,
    };
  } catch (error) {
    return {
      message:
        error instanceof SiteSettingsError
          ? error.messageForUi
          : error instanceof Error
            ? error.message
            : copy.orderEntrySendFailed,
      ok: false,
    };
  }
}

export async function createManagedAdminUserAction(
  locale: AppLocale,
  input: z.infer<typeof managedUserSchema>
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user || user.role !== "super_admin") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  const parsed = managedUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: copy.invalidName,
      ok: false,
    };
  }

  try {
    const result = await createManagedAdminUser(user.email, locale, parsed.data);
    revalidateSettingsViews();
    return {
      message:
        result.emailResult.status === "sent"
          ? copy.userCreated
          : copy.orderEntrySendSavedOnly,
      ok: result.emailResult.status === "sent",
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.invalidName,
      ok: false,
    };
  }
}

export async function updateManagedAdminUserAction(
  locale: AppLocale,
  userId: string,
  input: z.infer<typeof managedUserSchema>
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user || user.role !== "super_admin") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  const parsed = managedUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: copy.invalidName,
      ok: false,
    };
  }

  if (isSuperAdminRole(parsed.data.role) && user.id !== userId) {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  try {
    await updateManagedAdminUser(user.email, userId, parsed.data);
    revalidateSettingsViews();
    return {
      message: copy.userUpdated,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.invalidName,
      ok: false,
    };
  }
}

export async function resendManagedAdminInviteAction(
  locale: AppLocale,
  userId: string,
  input: {
    displayName: string;
    email: string;
    role: ManagedAdminRole;
  }
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user || user.role !== "super_admin") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  try {
    const result = await resendManagedAdminInvite(
      user.email,
      locale,
      userId,
      input.email,
      input.displayName,
      input.role
    );
    revalidateSettingsViews();
    return {
      message:
        result.status === "sent"
          ? copy.userInviteSent
          : copy.orderEntrySendSavedOnly,
      ok: result.status === "sent",
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.userInviteSent,
      ok: false,
    };
  }
}

export async function sendManagedAdminPasswordResetAction(
  locale: AppLocale,
  userId: string,
  input: {
    displayName: string;
    email: string;
    role: ManagedAdminRole;
  }
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user || user.role !== "super_admin") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  try {
    const result = await sendManagedAdminPasswordReset(
      user.email,
      locale,
      userId,
      input.email,
      input.displayName,
      input.role
    );
    revalidateSettingsViews();
    return {
      message:
        result.status === "sent"
          ? copy.userPasswordResetSent
          : copy.orderEntrySendSavedOnly,
      ok: result.status === "sent",
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : copy.userPasswordResetSent,
      ok: false,
    };
  }
}

export async function toggleManagedAdminUserActiveAction(
  locale: AppLocale,
  userId: string,
  nextState: boolean
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user || user.role !== "super_admin") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  try {
    await setManagedAdminUserActive(user.email, userId, nextState);
    revalidateSettingsViews();
    return {
      message: copy.userVisibilityChanged,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.userVisibilityChanged,
      ok: false,
    };
  }
}

export async function deleteManagedAdminUserAction(
  locale: AppLocale,
  userId: string
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = getSettingsActionCopy(locale);

  if (!user || user.role !== "super_admin") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  const blockedResult = await getDecoyBlockedResult(locale);

  if (blockedResult) {
    return blockedResult;
  }

  if (user.id === userId) {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  try {
    await deleteManagedAdminUser(user.email, userId);
    revalidateSettingsViews();
    return {
      message: copy.userDeleted,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.userDeleted,
      ok: false,
    };
  }
}
