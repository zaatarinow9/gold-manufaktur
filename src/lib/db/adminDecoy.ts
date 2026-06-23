import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/types/admin";

const ADMIN_DECOY_SINGLETON_KEY = "main";
const DEFAULT_ADMIN_DECOY_RECOVERY_EMAIL = "service@goldhelwah.de";

export type AdminDecoyActor = {
  email?: string | null;
  ip?: string | null;
  source?: string | null;
  userAgent?: string | null;
  userId?: string | null;
};

type AdminDecoyControlRow = {
  created_at: string;
  expires_at: string | null;
  gate_enabled: boolean;
  gate_token_hash: string | null;
  id: string;
  is_decoy_enabled: boolean;
  last_rotated_at: string | null;
  last_used_at: string | null;
  singleton_key: string;
  token_version: number;
  updated_at: string;
  updated_by: string | null;
};

export type AdminDecoyControlRecord = {
  createdAt: string;
  expiresAt: string;
  gateEnabled: boolean;
  gateTokenHash: string;
  id: string;
  isDecoyEnabled: boolean;
  lastRotatedAt: string;
  lastUsedAt: string;
  singletonKey: string;
  tokenVersion: number;
  updatedAt: string;
  updatedBy: string;
};

type AdminDecoyAuditLogRow = {
  action: string;
  actor_email: string | null;
  actor_user_id: string | null;
  created_at: string;
  id: string;
  ip: string | null;
  metadata: Record<string, unknown>;
  user_agent: string | null;
};

type AdminDecoyClient = ReturnType<typeof createSupabaseAdminClient> & {
  from: (table: "admin_decoy_control") => {
    insert: (
      value: Partial<AdminDecoyControlRow>
    ) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: AdminDecoyControlRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: AdminDecoyControlRow | null;
          error: { message: string } | null;
        }>;
        single: () => Promise<{
          data: AdminDecoyControlRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (
      value: Partial<AdminDecoyControlRow>
    ) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: AdminDecoyControlRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

type AdminDecoyAuditClient = ReturnType<typeof createSupabaseAdminClient> & {
  from: (table: "admin_decoy_audit_logs") => {
    insert: (
      value: Partial<AdminDecoyAuditLogRow>
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function createAdminDecoyClient() {
  return createSupabaseAdminClient() as unknown as AdminDecoyClient;
}

function createAdminDecoyAuditClient() {
  return createSupabaseAdminClient() as unknown as AdminDecoyAuditClient;
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function getAdminDecoyPepper() {
  return normalizeText(process.env.ADMIN_DECOY_PEPPER);
}

function getAdminDecoyPinHash() {
  return normalizeText(process.env.ADMIN_DECOY_PIN_HASH).toLowerCase();
}

function getAdminDecoyOwnerEmails() {
  return (process.env.ADMIN_DECOY_OWNER_EMAILS ?? "")
    .split(/[,\n;]/u)
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

function isTimingSafeMatch(expectedValue: string, providedValue: string) {
  if (!expectedValue || !providedValue) {
    return false;
  }

  const expected = Buffer.from(expectedValue, "utf8");
  const provided = Buffer.from(providedValue, "utf8");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

function mapAdminDecoyControl(row: AdminDecoyControlRow): AdminDecoyControlRecord {
  return {
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? "",
    gateEnabled: row.gate_enabled,
    gateTokenHash: row.gate_token_hash ?? "",
    id: row.id,
    isDecoyEnabled: row.is_decoy_enabled,
    lastRotatedAt: row.last_rotated_at ?? "",
    lastUsedAt: row.last_used_at ?? "",
    singletonKey: row.singleton_key,
    tokenVersion: row.token_version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? "",
  };
}

function getAdminDecoySiteBaseUrl() {
  const explicit =
    normalizeText(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeText(process.env.SITE_URL);

  if (explicit) {
    return explicit.replace(/\/+$/u, "");
  }

  const vercelProduction = normalizeText(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  );

  if (vercelProduction) {
    return `https://${vercelProduction.replace(/^https?:\/\//u, "")}`;
  }

  const vercelPreview = normalizeText(process.env.VERCEL_URL);

  if (vercelPreview) {
    return `https://${vercelPreview.replace(/^https?:\/\//u, "")}`;
  }

  return "http://localhost:3000";
}

function normalizeBaseUrl(value?: string | null) {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/\/+$/u, "") : "";
}

function getActorLabel(actor?: AdminDecoyActor) {
  return (
    normalizeEmail(actor?.email) ||
    normalizeText(actor?.userId) ||
    normalizeText(actor?.source) ||
    "system"
  );
}

function normalizeExpiresAt(value?: string | null) {
  const trimmed = normalizeText(value);

  if (!trimmed) {
    return null;
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function isExpired(expiresAt?: string | null) {
  const normalized = normalizeExpiresAt(expiresAt);

  if (!normalized) {
    return false;
  }

  return Date.parse(normalized) <= Date.now();
}

export function isAdminDecoyConfigured() {
  return Boolean(getAdminDecoyPepper() && getAdminDecoyPinHash());
}

export function hashAdminDecoyValue(value: string) {
  const pepper = getAdminDecoyPepper();
  const normalizedValue = value.trim();

  if (!pepper || !normalizedValue) {
    return "";
  }

  return createHash("sha256")
    .update(`${normalizedValue}:${pepper}`)
    .digest("hex");
}

async function ensureAdminDecoyControlRow() {
  const supabase = createAdminDecoyClient();
  const { data, error } = await supabase
    .from("admin_decoy_control")
    .select("*")
    .eq("singleton_key", ADMIN_DECOY_SINGLETON_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load admin decoy control: ${error.message}`);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("admin_decoy_control")
    .insert({
      singleton_key: ADMIN_DECOY_SINGLETON_KEY,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Unable to create admin decoy control row: ${insertError?.message ?? "unknown_error"}`
    );
  }

  return inserted;
}

async function updateAdminDecoyControl(
  value: Partial<AdminDecoyControlRow>
): Promise<AdminDecoyControlRecord> {
  await ensureAdminDecoyControlRow();
  const supabase = createAdminDecoyClient();
  const { data, error } = await supabase
    .from("admin_decoy_control")
    .update({
      ...value,
      updated_at: new Date().toISOString(),
    })
    .eq("singleton_key", ADMIN_DECOY_SINGLETON_KEY)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to update admin decoy control: ${error?.message ?? "unknown_error"}`
    );
  }

  return mapAdminDecoyControl(data);
}

export async function getAdminDecoyControl() {
  return mapAdminDecoyControl(await ensureAdminDecoyControlRow());
}

export async function isAdminDecoyEnabled() {
  try {
    return (await getAdminDecoyControl()).isDecoyEnabled;
  } catch {
    return false;
  }
}

export function getAdminDecoyUnavailableMessage(locale: AppLocale) {
  if (locale === "ar") {
    return "التحديث غير متاح الآن.";
  }

  if (locale === "de") {
    return "Aktualisierung derzeit nicht verfuegbar.";
  }

  if (locale === "fr") {
    return "La mise a jour est indisponible pour le moment.";
  }

  if (locale === "tr") {
    return "Guncelleme su anda kullanilamiyor.";
  }

  return "Update unavailable right now.";
}

export function buildAdminDecoyGatePath(locale: string, token: string) {
  const normalizedLocale = routing.locales.includes(locale as AppLocale)
    ? locale
    : "de";

  return `/${normalizedLocale}/admin/system-check/${token}`;
}

export function buildAdminDecoyGateUrl(
  locale: string,
  token: string,
  baseUrl?: string | null
) {
  return `${normalizeBaseUrl(baseUrl) || getAdminDecoySiteBaseUrl()}${buildAdminDecoyGatePath(
    locale,
    token
  )}`;
}

export function getAdminDecoyRecoveryEmail() {
  return (
    normalizeEmail(process.env.ADMIN_DECOY_RECOVERY_EMAIL) ||
    DEFAULT_ADMIN_DECOY_RECOVERY_EMAIL
  );
}

export function canUseAdminDecoyGate(
  currentUser: Pick<AdminUser, "email" | "role"> | null | undefined
) {
  if (!currentUser) {
    return false;
  }

  if (currentUser.role === "super_admin") {
    return true;
  }

  return getAdminDecoyOwnerEmails().includes(normalizeEmail(currentUser.email));
}

export function assertCanUseDecoyGate(
  currentUser: Pick<AdminUser, "email" | "role"> | null | undefined
) {
  if (!canUseAdminDecoyGate(currentUser)) {
    throw new Error("ADMIN_DECOY_FORBIDDEN");
  }
}

export function verifyAdminDecoyPin(pin: string) {
  const expectedHash = getAdminDecoyPinHash();
  const providedHash = hashAdminDecoyValue(pin);

  if (!expectedHash || !providedHash) {
    return false;
  }

  return isTimingSafeMatch(expectedHash, providedHash);
}

export async function validateAdminDecoyGateToken(
  token: string,
  options?: { touchLastUsed?: boolean }
) {
  if (!isAdminDecoyConfigured()) {
    return false;
  }

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return false;
  }

  const control = await getAdminDecoyControl();

  if (!control.gateEnabled || !control.gateTokenHash || isExpired(control.expiresAt)) {
    return false;
  }

  const providedHash = hashAdminDecoyValue(normalizedToken);
  const isValid = isTimingSafeMatch(control.gateTokenHash, providedHash);

  if (isValid && options?.touchLastUsed !== false) {
    await updateAdminDecoyControl({
      last_used_at: new Date().toISOString(),
    });
  }

  return isValid;
}

export async function logAdminDecoyAudit(
  action: string,
  actor?: AdminDecoyActor,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = createAdminDecoyAuditClient();
    const { error } = await supabase.from("admin_decoy_audit_logs").insert({
      action,
      actor_email: normalizeEmail(actor?.email) || null,
      actor_user_id: normalizeText(actor?.userId) || null,
      ip: normalizeText(actor?.ip) || null,
      metadata: metadata ?? {},
      user_agent: normalizeText(actor?.userAgent) || null,
    });

    if (error) {
      console.warn(`[adminDecoy] Unable to write audit log: ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `[adminDecoy] Unable to write audit log: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function toggleAdminDecoyMode(
  actor: AdminDecoyActor,
  desiredState: boolean
) {
  const control = await updateAdminDecoyControl({
    is_decoy_enabled: desiredState,
    updated_by: getActorLabel(actor),
  });

  await logAdminDecoyAudit(
    desiredState ? "decoy_sync_enabled" : "decoy_sync_disabled",
    actor,
    {
      isDecoyEnabled: desiredState,
      tokenVersion: control.tokenVersion,
    }
  );

  return control;
}

export async function enableAdminDecoyMode(actor: AdminDecoyActor) {
  return toggleAdminDecoyMode(actor, true);
}

export async function disableAdminDecoyMode(actor: AdminDecoyActor) {
  return toggleAdminDecoyMode(actor, false);
}

export async function updateAdminDecoyExpiry(
  actor: AdminDecoyActor,
  expiresAt?: string | null
) {
  const control = await updateAdminDecoyControl({
    expires_at: normalizeExpiresAt(expiresAt),
    updated_by: getActorLabel(actor),
  });

  await logAdminDecoyAudit("decoy_gate_expiry_updated", actor, {
    expiresAt: control.expiresAt || null,
    tokenVersion: control.tokenVersion,
  });

  return control;
}

export async function rotateAdminDecoyGate(
  actor: AdminDecoyActor,
  options?: { baseUrl?: string | null; expiresAt?: string | null; locale?: string }
) {
  if (!isAdminDecoyConfigured()) {
    throw new Error("ADMIN_DECOY_UNAVAILABLE");
  }

  const currentControl = await getAdminDecoyControl();
  const nextTokenVersion = Math.max(currentControl.tokenVersion, 0) + 1;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashAdminDecoyValue(token);
  const rotatedAt = new Date().toISOString();
  const locale = routing.locales.includes(options?.locale as AppLocale)
    ? (options?.locale as AppLocale)
    : "de";
  const control = await updateAdminDecoyControl({
    expires_at: normalizeExpiresAt(options?.expiresAt),
    gate_enabled: true,
    gate_token_hash: tokenHash,
    last_rotated_at: rotatedAt,
    token_version: nextTokenVersion,
    updated_by: getActorLabel(actor),
  });
  const fullUrl = buildAdminDecoyGateUrl(locale, token, options?.baseUrl);

  return {
    control,
    fullUrl,
    token,
  };
}

export async function disableAdminDecoyGate(actor: AdminDecoyActor) {
  const control = await updateAdminDecoyControl({
    gate_enabled: false,
    gate_token_hash: null,
    updated_by: getActorLabel(actor),
  });

  await logAdminDecoyAudit("decoy_gate_disabled", actor, {
    tokenVersion: control.tokenVersion,
  });

  return control;
}
