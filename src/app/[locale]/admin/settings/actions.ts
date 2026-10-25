"use server";

import { revalidateDashboard } from "@/lib/admin/revalidate";

import { getTranslations } from "next-intl/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import type { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import type { AdminRole } from "@/types/admin";
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
  saveNotificationSettings,
  savePublicVisualSettings,
  SiteSettingsError,
} from "@/lib/db/siteSettings";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
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
  role: z.enum(["super_admin", "admin", "employee", "marketing", "customer_service"]),
});

const promoTextSchema = z.object({
  ar: z.string().trim().max(1200),
  de: z.string().trim().max(1200),
  en: z.string().trim().max(1200),
  fr: z.string().trim().max(1200),
  tr: z.string().trim().max(1200),
});
const publicVisualSettingsSchema = z.object({
  promoPopup: z.object({
    ctaText: promoTextSchema,
    ctaUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === "" || value.startsWith("/") || /^https?:\/\//i.test(value), "url"),
    description: promoTextSchema,
    enabled: z.boolean(),
    endsAt: z.string().trim().max(80),
    showOnce: z.boolean(),
    startsAt: z.string().trim().max(80),
    title: promoTextSchema,
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

async function getSettingsActionCopy(locale: AppLocale) {
  const t = await getTranslations({ locale, namespace: "Admin.settingsMessages" });

  return {
    invalidEmail: t("invalidEmail"),
    invalidName: t("invalidName"),
    noAccess: t("noAccess"),
    emailNotSent: t("emailNotSent"),
    privacyPhrase: t("privacyPhrase"),
    saved: t("saved"),
    userCreated: t("userCreated"),
    userDeleted: t("userDeleted"),
    userInviteSent: t("userInviteSent"),
    userPasswordResetSent: t("userPasswordResetSent"),
    userUpdated: t("userUpdated"),
    userVisibilityChanged: t("userVisibilityChanged"),
  };
}

function revalidateSettingsViews() {
  revalidateDashboard();
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
  const user = await requireSettingsAccess(locale, ["super_admin", "marketing"]);
  if (!user) return { message: (await getSettingsActionCopy(locale)).noAccess, ok: false };
  const blocked = await getDecoyBlockedResult(locale);
  if (blocked) return blocked;
  const parsed = publicVisualSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getTranslations({ locale, namespace: "Admin.flow.promo" });
    const badUrl = parsed.error.issues.some((issue) => issue.path.includes("ctaUrl"));
    return { message: badUrl ? t("badLink") : t("tooLong"), ok: false };
  }
  if (parsed.data.promoPopup.enabled && !Object.values(parsed.data.promoPopup.title).some(Boolean)) {
    const t = await getTranslations({ locale, namespace: "Admin.flow.promo" });
    return { message: t("titleRequired"), ok: false };
  }
  try { await savePublicVisualSettings(parsed.data); revalidateSettingsViews(); return { message: (await getSettingsActionCopy(locale)).saved, ok: true }; }
  catch (error) { return { message: error instanceof Error ? error.message : (await getSettingsActionCopy(locale)).saved, ok: false }; }
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

async function requireSettingsAccess(locale: AppLocale, roles: AdminRole[] = ["super_admin"]) {
  const access = await requireAdminAccess(locale, roles);

  if (access.state !== "authenticated" || !access.user) {
    return null;
  }

  return access.user;
}

async function getValidationFailure(
  locale: AppLocale,
  message?: string
): Promise<AdminActionResult> {
  const copy = (await getSettingsActionCopy(locale));
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
  const copy = (await getSettingsActionCopy(locale));

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
    return await getValidationFailure(locale);
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

export async function createManagedAdminUserAction(
  locale: AppLocale,
  input: z.infer<typeof managedUserSchema>
): Promise<AdminActionResult> {
  const user = await requireSettingsAccess(locale);
  const copy = (await getSettingsActionCopy(locale));

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
          : copy.emailNotSent,
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
  const copy = (await getSettingsActionCopy(locale));

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
  const copy = (await getSettingsActionCopy(locale));

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
          : copy.emailNotSent,
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
  const copy = (await getSettingsActionCopy(locale));

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
          : copy.emailNotSent,
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
  const copy = (await getSettingsActionCopy(locale));

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
  const copy = (await getSettingsActionCopy(locale));

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
