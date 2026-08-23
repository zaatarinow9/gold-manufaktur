"use server";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
  savePublicVisualSettings,
  SiteSettingsError,
} from "@/lib/db/siteSettings";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import { buildOrderEntryLinkEmail } from "@/lib/email/orderEntryLinkEmail";
import { sendTransactionalEmail } from "@/lib/email/service";
import { companyInfo } from "@/lib/site";
import {
  archiveOrder,
  deleteOrder,
  getScopedOrderMaintenanceRecords,
  getScopedOrders,
  permanentlyDeleteOrders,
} from "@/lib/db/orders";
import { createRequiredAuditLog } from "@/lib/db/auditLogs";

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
const publicVisualSettingsSchema = z.object({
  promoPopup: z.object({
    enabled: z.boolean(),
    title: z.string().trim().max(160),
    description: z.string().trim().max(1200),
    ctaText: z.string().trim().max(80),
    ctaUrl: z.string().trim().url().or(z.literal("")),
    videoUrl: z.string().trim().url().or(z.literal("")),
    style: z.enum(["luxury", "image", "announcement"]),
    startsAt: z.string().trim().max(80),
    endsAt: z.string().trim().max(80),
    showOnce: z.boolean(),
  }),
});
const orderMaintenanceModeSchema = z.enum([
  "archive_completed",
  "clear_active",
  "delete_permanent",
]);
const orderMaintenanceExecutionSchema = z.object({
  confirmedOrdersOnly: z.literal(true),
  expectedCount: z.number().int().nonnegative(),
  mode: orderMaintenanceModeSchema,
  previewToken: z.string().trim().max(4096).default(""),
});

const PERMANENT_DELETE_PREVIEW_TOKEN_MODE = "permanent_delete_orders";
const PERMANENT_DELETE_PREVIEW_TOKEN_TTL_MS = 10 * 60 * 1000;

type OrderMaintenancePreviewResult = {
  count: number;
  message: string;
  ok: boolean;
  previewToken?: string;
};

type OrderMaintenanceExecutionResult = {
  count: number;
  message: string;
  ok: boolean;
  requiresPreview?: boolean;
};

type PermanentDeletePreviewTokenPayload = {
  c: number;
  e: number;
  h: string;
  m: string;
  u: string;
  em: string;
};

type PermanentDeletePreviewTokenFailureReason =
  | "count_mismatch"
  | "expired"
  | "hash_mismatch"
  | "invalid_signature"
  | "missing"
  | "mode_mismatch"
  | "user_mismatch";

let permanentDeletePreviewTokenSecret: Buffer | null = null;

function normalizeMaintenanceEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getPermanentDeletePreviewTokenSecret() {
  if (!permanentDeletePreviewTokenSecret) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

    if (!serviceRoleKey) {
      throw new Error("Missing required permanent delete preview token secret.");
    }

    permanentDeletePreviewTokenSecret = createHash("sha256")
      .update(`permanent-delete-preview:${serviceRoleKey}`)
      .digest();
  }

  return permanentDeletePreviewTokenSecret;
}

function getStableEligibleOrderIdsHash(orderIds: string[]) {
  const normalizedOrderIds = [...new Set(orderIds.map((value) => value.trim()).filter(Boolean))];

  normalizedOrderIds.sort((left, right) => left.localeCompare(right));

  return createHash("sha256")
    .update(normalizedOrderIds.join("\n"), "utf8")
    .digest("hex");
}

function encodePermanentDeletePreviewTokenPayload(
  payload: PermanentDeletePreviewTokenPayload
) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePermanentDeletePreviewTokenPayload(value: string) {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<PermanentDeletePreviewTokenPayload>;

    if (
      typeof parsed.c !== "number" ||
      typeof parsed.e !== "number" ||
      typeof parsed.h !== "string" ||
      typeof parsed.m !== "string" ||
      typeof parsed.u !== "string" ||
      typeof parsed.em !== "string"
    ) {
      return null;
    }

    return parsed as PermanentDeletePreviewTokenPayload;
  } catch {
    return null;
  }
}

function signPermanentDeletePreviewToken(encodedPayload: string) {
  return createHmac("sha256", getPermanentDeletePreviewTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isTimingSafeTokenMatch(expectedValue: string, providedValue: string) {
  const expected = Buffer.from(expectedValue, "utf8");
  const provided = Buffer.from(providedValue, "utf8");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

function createPermanentDeletePreviewToken(input: {
  count: number;
  orderIds: string[];
  userEmail: string;
  userId: string;
}) {
  const payload: PermanentDeletePreviewTokenPayload = {
    c: input.count,
    e: Date.now() + PERMANENT_DELETE_PREVIEW_TOKEN_TTL_MS,
    em: normalizeMaintenanceEmail(input.userEmail),
    h: getStableEligibleOrderIdsHash(input.orderIds),
    m: PERMANENT_DELETE_PREVIEW_TOKEN_MODE,
    u: input.userId.trim(),
  };
  const encodedPayload = encodePermanentDeletePreviewTokenPayload(payload);

  return `${encodedPayload}.${signPermanentDeletePreviewToken(encodedPayload)}`;
}

function validatePermanentDeletePreviewToken(input: {
  count: number;
  orderIds: string[];
  token: string;
  userEmail: string;
  userId: string;
}):
  | { ok: true }
  | { ok: false; reason: PermanentDeletePreviewTokenFailureReason } {
  const token = input.token.trim();

  if (!token) {
    return { ok: false, reason: "missing" };
  }

  const [encodedPayload, providedSignature] = token.split(".", 2);

  if (!encodedPayload || !providedSignature) {
    return { ok: false, reason: "invalid_signature" };
  }

  const expectedSignature = signPermanentDeletePreviewToken(encodedPayload);

  if (!isTimingSafeTokenMatch(expectedSignature, providedSignature)) {
    return { ok: false, reason: "invalid_signature" };
  }

  const payload = decodePermanentDeletePreviewTokenPayload(encodedPayload);

  if (!payload) {
    return { ok: false, reason: "invalid_signature" };
  }

  if (payload.e <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (payload.m !== PERMANENT_DELETE_PREVIEW_TOKEN_MODE) {
    return { ok: false, reason: "mode_mismatch" };
  }

  if (
    payload.u !== input.userId.trim() ||
    payload.em !== normalizeMaintenanceEmail(input.userEmail)
  ) {
    return { ok: false, reason: "user_mismatch" };
  }

  if (payload.c !== input.count) {
    return { ok: false, reason: "count_mismatch" };
  }

  if (payload.h !== getStableEligibleOrderIdsHash(input.orderIds)) {
    return { ok: false, reason: "hash_mismatch" };
  }

  return { ok: true };
}

function getPermanentDeletePreviewFailureMessage(
  reason: PermanentDeletePreviewTokenFailureReason
) {
  if (reason === "expired") {
    return "The permanent delete preview expired. Run the preview again before confirming.";
  }

  if (reason === "count_mismatch" || reason === "hash_mismatch") {
    return "The preview changed. Run the preview again before confirming.";
  }

  return "The permanent delete preview is invalid. Run the preview again before confirming.";
}

async function getOrderMaintenanceViewer(locale: AppLocale) {
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user || await isAdminDecoyEnabled()) return null;
  return access.user;
}

async function getEligibleMaintenanceOrders(locale: AppLocale, mode: z.infer<typeof orderMaintenanceModeSchema>) {
  const viewer = await getOrderMaintenanceViewer(locale);
  if (!viewer) return null;
  const orders =
    mode === "delete_permanent"
      ? await getScopedOrderMaintenanceRecords(viewer)
      : await getScopedOrders(viewer);
  return {
    viewer,
    orders: orders.filter((order) => {
      if (mode === "archive_completed") {
        return (
          !order.archivedAt &&
          !order.deletedAt &&
          ["delivered", "completed", "cancelled", "ready"].includes(order.status)
        );
      }

      if (mode === "clear_active") {
        return !order.archivedAt && !order.deletedAt;
      }

      return Boolean(order.archivedAt) || Boolean(order.deletedAt) || order.status === "archived";
    }),
  };
}

async function createRequiredMaintenanceAudit(input: { action: string; actorEmail: string; actorUserId: string; count: number; mode: string }) {
  await createRequiredAuditLog({ action: input.action, actorEmail: input.actorEmail, metadata: { actorUserId: input.actorUserId, affectedOrderCount: input.count, mode: input.mode, timestamp: new Date().toISOString() } });
}

export async function previewOrderMaintenanceAction(
  locale: AppLocale,
  mode: z.infer<typeof orderMaintenanceModeSchema>
): Promise<OrderMaintenancePreviewResult> {
  const parsed = orderMaintenanceModeSchema.safeParse(mode);

  if (!parsed.success) {
    return { message: "Unable to preview orders.", ok: false, count: 0 };
  }

  try {
    const eligible = await getEligibleMaintenanceOrders(locale, parsed.data);

    if (!eligible) {
      return { message: "Permission denied.", ok: false, count: 0 };
    }

    return {
      count: eligible.orders.length,
      message: "Preview ready.",
      ok: true,
      previewToken:
        parsed.data === "delete_permanent"
          ? createPermanentDeletePreviewToken({
              count: eligible.orders.length,
              orderIds: eligible.orders.map((order) => order.id),
              userEmail: eligible.viewer.email,
              userId: eligible.viewer.id,
            })
          : undefined,
    };
  } catch {
    return { message: "Unable to preview orders.", ok: false, count: 0 };
  }
}

export async function executeOrderMaintenanceAction(
  locale: AppLocale,
  input: z.infer<typeof orderMaintenanceExecutionSchema>
): Promise<OrderMaintenanceExecutionResult> {
  const parsed = orderMaintenanceExecutionSchema.safeParse(input);

  if (!parsed.success) {
    return { message: "Confirmation is invalid.", ok: false, count: 0 };
  }

  try {
    const eligible = await getEligibleMaintenanceOrders(locale, parsed.data.mode);
    if (!eligible) return { message: "Permission denied.", ok: false, count: 0 };

    if (eligible.orders.length !== parsed.data.expectedCount) {
      return {
        message: "The preview changed. Run the preview again before confirming.",
        ok: false,
        count: eligible.orders.length,
        requiresPreview: true,
      };
    }

    if (parsed.data.mode === "delete_permanent") {
      const previewTokenValidation = validatePermanentDeletePreviewToken({
        count: eligible.orders.length,
        orderIds: eligible.orders.map((order) => order.id),
        token: parsed.data.previewToken,
        userEmail: eligible.viewer.email,
        userId: eligible.viewer.id,
      });

      if (!previewTokenValidation.ok) {
        return {
          message: getPermanentDeletePreviewFailureMessage(
            previewTokenValidation.reason
          ),
          ok: false,
          count: eligible.orders.length,
          requiresPreview: true,
        };
      }
    }

    const auditAction =
      parsed.data.mode === "archive_completed"
        ? "bulk_archive_orders"
        : parsed.data.mode === "clear_active"
          ? "bulk_clear_active_orders"
          : "bulk_delete_orders_permanently";
    await createRequiredMaintenanceAudit({
      action: auditAction,
      actorEmail: eligible.viewer.email,
      actorUserId: eligible.viewer.id,
      count: eligible.orders.length,
      mode: parsed.data.mode,
    });

    if (parsed.data.mode === "delete_permanent") {
      await permanentlyDeleteOrders(
        eligible.viewer,
        eligible.orders.map((order) => order.id),
        { auditAction }
      );
    } else {
      for (const order of eligible.orders) {
        if (parsed.data.mode === "archive_completed") {
          await archiveOrder(eligible.viewer, order.id);
        } else {
          await deleteOrder(eligible.viewer, order.id);
        }
      }
    }

    revalidateSettingsViews();
    return { message: "Order maintenance completed.", ok: true, count: eligible.orders.length };
  } catch { return { message: "Unable to maintain orders.", ok: false, count: 0 }; }
}

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
    revalidatePath(`/${targetLocale}`);
    revalidatePath(`/${targetLocale}/admin`);
    revalidatePath(`/${targetLocale}/admin/archive`);
    revalidatePath(`/${targetLocale}/admin/my-tasks`);
    revalidatePath(`/${targetLocale}/admin/orders`);
    revalidatePath(`/${targetLocale}/admin/settings`);
    revalidatePath(`/${targetLocale}/shop`);
  });
}

export async function savePublicVisualSettingsAction(locale: AppLocale, input: z.infer<typeof publicVisualSettingsSchema>): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  if (!user) return { message: getSettingsActionCopy(locale).noAccess, ok: false };
  const blocked = await getDecoyBlockedResult(locale);
  if (blocked) return blocked;
  const parsed = publicVisualSettingsSchema.safeParse(input);
  if (!parsed.success) return { message: getSettingsActionCopy(locale).invalidEmail, ok: false };
  try { await savePublicVisualSettings(parsed.data); revalidateSettingsViews(); return { message: getSettingsActionCopy(locale).saved, ok: true }; }
  catch (error) { return { message: error instanceof Error ? error.message : getSettingsActionCopy(locale).saved, ok: false }; }
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
    const redactedLink = "[redacted order entry link]";
    const emailResult = await sendTransactionalEmail({
      html: email.html,
      logHtml: email.html.replaceAll(link, redactedLink),
      logMetadata: {
        actorEmail: user.email,
        expiresAt: parsed.data.expiresAt || null,
        kind: "order_entry_link_email",
      },
      logText: email.text.replaceAll(link, redactedLink),
      metadata: {
        actorEmail: user.email,
        expiresAt: parsed.data.expiresAt || null,
        kind: "order_entry_link_email",
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
