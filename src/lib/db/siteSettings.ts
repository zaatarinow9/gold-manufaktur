import "server-only";

import { cache } from "react";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { getDecoySettingsSnapshot } from "@/lib/admin/decoyData";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import type { Json } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { createAuditLog } from "./auditLogs";

const siteSettingsTableName = "site_settings";
const requiredSiteSettingsColumns = [
  "key",
  "value_json",
  "value_text",
  "created_at",
  "updated_at",
] as const;

type SiteSettingsIssueCode =
  | "column_missing"
  | "inspection_failed"
  | "service_role_missing"
  | "table_missing";

export class SiteSettingsError extends Error {
  code: SiteSettingsIssueCode;
  messageForUi: string;

  constructor(code: SiteSettingsIssueCode, messageForUi: string) {
    super(code);
    this.code = code;
    this.messageForUi = messageForUi;
  }
}

export type SiteSettingsDiagnostics = {
  available: boolean;
  environmentLabel: string;
  issueCode: SiteSettingsIssueCode | null;
  message: string | null;
  missingColumns: string[];
  missingEnvVars: string[];
  siteBaseUrl: string;
  suggestedMigration: string | null;
  tableName: string;
};

export type SmtpStatus = {
  configured: boolean;
  fromAddress: string;
  fromName: string;
  missing: string[];
};

export type AdminSettingsSnapshot = {
  adminNotificationEmail: string;
  diagnostics: SiteSettingsDiagnostics;
  orderEntryEnabled: boolean;
  orderEntryExpiresAt: string;
  orderEntryToken: string;
  orderEntryTokenHint: string;
  orderEntryRotatedAt: string;
  ownerEmail: string;
  privacyModeEnabled: boolean;
  privacyModeReason: string;
  privacyModeUpdatedAt: string;
  smtpStatus: SmtpStatus;
  supportNotificationEmail: string;
};

type UpsertSiteSettingInput = {
  key: string;
  valueJson?: Json;
  valueText?: string | null;
};

export const siteSettingKeys = {
  adminNotificationEmail: "admin_notification_email",
  orderEntryEnabled: "order_entry_enabled",
  orderEntryExpiresAt: "order_entry_expires_at",
  orderEntryTokenHash: "order_entry_token_hash",
  orderEntryTokenSealed: "order_entry_token_sealed",
  orderEntryToken: "order_entry_token",
  orderEntryTokenHint: "order_entry_token_hint",
  orderEntryRotatedAt: "order_entry_rotated_at",
  ownerEmail: "owner_email",
  privacyModeEnabled: "privacy_mode_enabled",
  privacyModeReason: "privacy_mode_reason",
  privacyModeUpdatedAt: "privacy_mode_updated_at",
  supportNotificationEmail: "support_notification_email",
} as const;

const siteSettingsRequiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const siteSettingsSuggestedMigration = "0008_admin_workflow_cleanup.sql";

function normalizeSettingText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeBooleanText(value: string | null | undefined) {
  return normalizeSettingText(value).toLowerCase() === "true";
}

function getSiteSettingsEnvironmentLabel() {
  const vercelEnv = process.env.VERCEL_ENV?.trim();

  if (vercelEnv === "production") {
    return "Vercel production";
  }

  if (vercelEnv === "preview") {
    return "Vercel preview";
  }

  if (vercelEnv === "development") {
    return "Vercel development";
  }

  return process.env.NODE_ENV === "production"
    ? "Node production"
    : "Local development";
}

function getMissingSiteSettingsEnvVars() {
  return siteSettingsRequiredEnvVars.filter(
    (name) => !(process.env[name]?.trim() ?? "")
  );
}

export function getSiteBaseUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/+$/u, "");
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelProduction) {
    return `https://${vercelProduction.replace(/^https?:\/\//u, "")}`;
  }

  const vercelPreview = process.env.VERCEL_URL?.trim();

  if (vercelPreview) {
    return `https://${vercelPreview.replace(/^https?:\/\//u, "")}`;
  }

  return "http://localhost:3000";
}

function getSmtpStatus(): SmtpStatus {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = process.env.SMTP_PORT?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const password =
    process.env.SMTP_PASSWORD?.trim() ?? process.env.SMTP_PASS?.trim() ?? "";
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS?.trim() ??
    process.env.SMTP_FROM_EMAIL?.trim() ??
    process.env.SMTP_FROM?.trim() ??
    user;
  const fromName = process.env.EMAIL_FROM_NAME?.trim() ?? "GoldHelwah GmbH";
  const missing = [
    !host ? "SMTP_HOST" : null,
    !port ? "SMTP_PORT" : null,
    !user ? "SMTP_USER" : null,
    !password ? "SMTP_PASSWORD" : null,
    !fromAddress ? "EMAIL_FROM_ADDRESS" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    configured: missing.length === 0,
    fromAddress,
    fromName,
    missing,
  };
}

function createSiteSettingsDiagnosticsBase() {
  return {
    environmentLabel: getSiteSettingsEnvironmentLabel(),
    missingColumns: [],
    missingEnvVars: getMissingSiteSettingsEnvVars(),
    siteBaseUrl: getSiteBaseUrl(),
    suggestedMigration: null,
    tableName: siteSettingsTableName,
  } satisfies Omit<
    SiteSettingsDiagnostics,
    "available" | "issueCode" | "message"
  >;
}

const getSiteSettingsDiagnostics = cache(
  async (): Promise<SiteSettingsDiagnostics> => {
    const base = createSiteSettingsDiagnosticsBase();

    if (base.missingEnvVars.length > 0) {
      return {
        ...base,
        available: false,
        issueCode: "service_role_missing",
        message: `Admin settings use the server-side Supabase service client. Missing environment variables: ${base.missingEnvVars.join(", ")}.`,
      };
    }

    try {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase
        .from(siteSettingsTableName)
        .select(requiredSiteSettingsColumns.join(","))
        .limit(1);

      if (!error) {
        return {
          ...base,
          available: true,
          issueCode: null,
          message: null,
        };
      }

      const normalizedMessage = error.message.toLowerCase();
      const missingColumnMatch =
        error.message.match(/could not find the '([^']+)' column/i) ??
        error.message.match(/column ["']?([^"']+)["']? does not exist/i);

      if (
        normalizedMessage.includes("could not find the table") ||
        normalizedMessage.includes("relation") && normalizedMessage.includes("does not exist")
      ) {
        return {
          ...base,
          available: false,
          issueCode: "table_missing",
          message: `public.${siteSettingsTableName} was not found in the Supabase project connected to ${base.environmentLabel}. Apply ${siteSettingsSuggestedMigration} to that project or point this deployment at the migrated database.`,
          suggestedMigration: siteSettingsSuggestedMigration,
        };
      }

      if (missingColumnMatch?.[1]) {
        return {
          ...base,
          available: false,
          issueCode: "column_missing",
          message: `public.${siteSettingsTableName} is missing the required column ${missingColumnMatch[1]} in ${base.environmentLabel}. Apply ${siteSettingsSuggestedMigration} to this database.`,
          missingColumns: [missingColumnMatch[1]],
          suggestedMigration: siteSettingsSuggestedMigration,
        };
      }

      return {
        ...base,
        available: false,
        issueCode: "inspection_failed",
        message: `Unable to inspect public.${siteSettingsTableName} for ${base.environmentLabel}: ${error.message}`,
      };
    } catch (error) {
      return {
        ...base,
        available: false,
        issueCode: "inspection_failed",
        message:
          error instanceof Error
            ? `Unable to inspect public.${siteSettingsTableName} for ${base.environmentLabel}: ${error.message}`
            : "Site settings are unavailable because the Supabase admin client could not be created.",
      };
    }
  }
);

async function assertSiteSettingsAvailable() {
  const diagnostics = await getSiteSettingsDiagnostics();

  if (!diagnostics.available) {
    throw new SiteSettingsError(
      diagnostics.issueCode ?? "table_missing",
      diagnostics.message ??
        `public.${siteSettingsTableName} is unavailable for ${diagnostics.environmentLabel}.`
    );
  }
}

async function readSiteSettings(keys: string[]) {
  await assertSiteSettingsAvailable();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(siteSettingsTableName)
    .select("key, value_json, value_text")
    .in("key", keys);

  if (error) {
    throw new Error(`Unable to load site settings: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((row) => [
      row.key,
      {
        valueJson: row.value_json,
        valueText: row.value_text,
      },
    ])
  );
}

async function ensureSiteSettingsRows(keys: string[]) {
  const rows = await readSiteSettings(keys);
  const missingKeys = keys.filter((key) => !rows.has(key));

  if (missingKeys.length === 0) {
    return rows;
  }

  await saveSiteSettings(
    missingKeys.map((key) => ({
      key,
      valueText: null,
    }))
  );

  return readSiteSettings(keys);
}

async function upsertSiteSetting(input: UpsertSiteSettingInput) {
  await assertSiteSettingsAvailable();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from(siteSettingsTableName).upsert(
    {
      key: input.key,
      updated_at: new Date().toISOString(),
      value_json: input.valueJson ?? {},
      value_text: input.valueText ?? null,
    },
    {
      onConflict: "key",
    }
  );

  if (error) {
    throw new Error(`Unable to save site setting: ${error.message}`);
  }
}

async function saveSiteSettings(inputs: UpsertSiteSettingInput[]) {
  for (const input of inputs) {
    await upsertSiteSetting(input);
  }
}

function generateOrderEntryToken() {
  return randomBytes(24).toString("base64url");
}

function getTokenHint(token: string) {
  if (token.length <= 8) {
    return token;
  }

  return token.slice(-8);
}

function stringsMatch(expectedValue: string, providedValue: string) {
  const expected = Buffer.from(expectedValue, "utf8");
  const provided = Buffer.from(providedValue, "utf8");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

function getOrderEntryTokenSecret() {
  const secret =
    process.env.ORDER_ENTRY_TOKEN_SECRET?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    "";

  if (!secret) {
    throw new Error("Missing order-entry token secret.");
  }

  return secret;
}

function getOrderEntryTokenEncryptionKey() {
  return createHash("sha256")
    .update(getOrderEntryTokenSecret(), "utf8")
    .digest();
}

function hashOrderEntryToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function sealOrderEntryToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getOrderEntryTokenEncryptionKey(),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

function unsealOrderEntryToken(sealedToken: string) {
  const payload = Buffer.from(sealedToken, "base64url");

  if (payload.length <= 28) {
    throw new Error("Malformed sealed order-entry token payload.");
  }

  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getOrderEntryTokenEncryptionKey(),
    iv
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

type SiteSettingRowMap = Map<
  string,
  {
    valueJson: Json | null;
    valueText: string | null;
  }
>;

type OrderEntryTokenState = {
  token: string;
  tokenHash: string;
  tokenHint: string;
};

async function getOrderEntryTokenState(
  rows: SiteSettingRowMap
): Promise<OrderEntryTokenState> {
  const legacyToken = normalizeSettingText(
    rows.get(siteSettingKeys.orderEntryToken)?.valueText
  );
  const sealedToken = normalizeSettingText(
    rows.get(siteSettingKeys.orderEntryTokenSealed)?.valueText
  );
  const storedTokenHash = normalizeSettingText(
    rows.get(siteSettingKeys.orderEntryTokenHash)?.valueText
  );
  const storedTokenHint = normalizeSettingText(
    rows.get(siteSettingKeys.orderEntryTokenHint)?.valueText
  );

  if (sealedToken) {
    try {
      const token = unsealOrderEntryToken(sealedToken);
      const tokenHash = hashOrderEntryToken(token);
      const tokenHint = storedTokenHint || getTokenHint(token);

      if (
        legacyToken ||
        !storedTokenHash ||
        !stringsMatch(storedTokenHash, tokenHash) ||
        storedTokenHint !== tokenHint
      ) {
        await saveSiteSettings([
          {
            key: siteSettingKeys.orderEntryToken,
            valueText: null,
          },
          {
            key: siteSettingKeys.orderEntryTokenHash,
            valueText: tokenHash,
          },
          {
            key: siteSettingKeys.orderEntryTokenHint,
            valueText: tokenHint,
          },
        ]);
      }

      return {
        token,
        tokenHash,
        tokenHint,
      };
    } catch (error) {
      console.error(
        `[site-settings] Unable to read sealed order-entry token: ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    }
  }

  if (legacyToken) {
    const tokenHash = hashOrderEntryToken(legacyToken);
    const tokenHint = storedTokenHint || getTokenHint(legacyToken);

    await saveSiteSettings([
      {
        key: siteSettingKeys.orderEntryToken,
        valueText: null,
      },
      {
        key: siteSettingKeys.orderEntryTokenHash,
        valueText: tokenHash,
      },
      {
        key: siteSettingKeys.orderEntryTokenHint,
        valueText: tokenHint,
      },
      {
        key: siteSettingKeys.orderEntryTokenSealed,
        valueText: sealOrderEntryToken(legacyToken),
      },
    ]);

    return {
      token: legacyToken,
      tokenHash,
      tokenHint,
    };
  }

  return {
    token: "",
    tokenHash: storedTokenHash,
    tokenHint: storedTokenHint,
  };
}

async function persistOrderEntryToken(input: {
  enabled: boolean;
  expiresAt: string;
  rotatedAt: string;
  token: string;
}) {
  const normalizedExpiresAt = normalizeSettingText(input.expiresAt) || null;
  const tokenHash = hashOrderEntryToken(input.token);
  const tokenHint = getTokenHint(input.token);

  await saveSiteSettings([
    {
      key: siteSettingKeys.orderEntryEnabled,
      valueText: input.enabled ? "true" : "false",
    },
    {
      key: siteSettingKeys.orderEntryExpiresAt,
      valueText: normalizedExpiresAt,
    },
    {
      key: siteSettingKeys.orderEntryToken,
      valueText: null,
    },
    {
      key: siteSettingKeys.orderEntryTokenHash,
      valueText: tokenHash,
    },
    {
      key: siteSettingKeys.orderEntryTokenHint,
      valueText: tokenHint,
    },
    {
      key: siteSettingKeys.orderEntryTokenSealed,
      valueText: sealOrderEntryToken(input.token),
    },
    {
      key: siteSettingKeys.orderEntryRotatedAt,
      valueText: input.rotatedAt,
    },
  ]);
}

export async function getSiteSettingsAvailability() {
  return getSiteSettingsDiagnostics();
}

export async function getSiteTextSetting(key: string) {
  try {
    const rows = await ensureSiteSettingsRows([key]);
    return normalizeSettingText(rows.get(key)?.valueText);
  } catch (error) {
    if (error instanceof SiteSettingsError) {
      return "";
    }

    throw error;
  }
}

export async function getSiteBooleanSetting(key: string) {
  return normalizeBooleanText(await getSiteTextSetting(key));
}

export async function getAdminNotificationEmail() {
  return getSiteTextSetting(siteSettingKeys.adminNotificationEmail);
}

export async function getSupportNotificationEmail() {
  return getSiteTextSetting(siteSettingKeys.supportNotificationEmail);
}

export async function getOwnerEmail() {
  return getSiteTextSetting(siteSettingKeys.ownerEmail);
}

export async function saveAdminNotificationEmail(email: string) {
  return upsertSiteSetting({
    key: siteSettingKeys.adminNotificationEmail,
    valueText: normalizeSettingText(email) || null,
  });
}

export async function getAdminSettingsSnapshot(): Promise<AdminSettingsSnapshot> {
  if (await isAdminDecoyEnabled()) {
    return getDecoySettingsSnapshot();
  }

  const diagnostics = await getSiteSettingsDiagnostics();

  if (!diagnostics.available) {
    return {
      adminNotificationEmail: "",
      diagnostics,
      orderEntryEnabled: false,
      orderEntryExpiresAt: "",
      orderEntryToken: "",
      orderEntryTokenHint: "",
      orderEntryRotatedAt: "",
      ownerEmail: "",
      privacyModeEnabled: false,
      privacyModeReason: "",
      privacyModeUpdatedAt: "",
      smtpStatus: getSmtpStatus(),
      supportNotificationEmail: "",
    };
  }

  const rows = await ensureSiteSettingsRows(Object.values(siteSettingKeys));
  const tokenState = await getOrderEntryTokenState(rows);

  return {
    adminNotificationEmail: normalizeSettingText(
      rows.get(siteSettingKeys.adminNotificationEmail)?.valueText
    ),
    diagnostics,
    orderEntryEnabled: normalizeBooleanText(
      rows.get(siteSettingKeys.orderEntryEnabled)?.valueText
    ),
    orderEntryExpiresAt: normalizeSettingText(
      rows.get(siteSettingKeys.orderEntryExpiresAt)?.valueText
    ),
    orderEntryToken: tokenState.token,
    orderEntryTokenHint: tokenState.tokenHint,
    orderEntryRotatedAt: normalizeSettingText(
      rows.get(siteSettingKeys.orderEntryRotatedAt)?.valueText
    ),
    ownerEmail: normalizeSettingText(
      rows.get(siteSettingKeys.ownerEmail)?.valueText
    ),
    privacyModeEnabled: normalizeBooleanText(
      rows.get(siteSettingKeys.privacyModeEnabled)?.valueText
    ),
    privacyModeReason: normalizeSettingText(
      rows.get(siteSettingKeys.privacyModeReason)?.valueText
    ),
    privacyModeUpdatedAt: normalizeSettingText(
      rows.get(siteSettingKeys.privacyModeUpdatedAt)?.valueText
    ),
    smtpStatus: getSmtpStatus(),
    supportNotificationEmail: normalizeSettingText(
      rows.get(siteSettingKeys.supportNotificationEmail)?.valueText
    ),
  };
}

export async function saveNotificationSettings(input: {
  adminNotificationEmail: string;
  ownerEmail: string;
  supportNotificationEmail: string;
}) {
  await saveSiteSettings([
    {
      key: siteSettingKeys.adminNotificationEmail,
      valueText: normalizeSettingText(input.adminNotificationEmail) || null,
    },
    {
      key: siteSettingKeys.supportNotificationEmail,
      valueText: normalizeSettingText(input.supportNotificationEmail) || null,
    },
    {
      key: siteSettingKeys.ownerEmail,
      valueText: normalizeSettingText(input.ownerEmail) || null,
    },
  ]);
}

export async function setPrivacyMode(input: {
  actorEmail?: string | null;
  enabled: boolean;
  reason: string;
}) {
  const updatedAt = new Date().toISOString();
  await saveSiteSettings([
    {
      key: siteSettingKeys.privacyModeEnabled,
      valueText: input.enabled ? "true" : "false",
    },
    {
      key: siteSettingKeys.privacyModeReason,
      valueText: normalizeSettingText(input.reason) || null,
    },
    {
      key: siteSettingKeys.privacyModeUpdatedAt,
      valueText: updatedAt,
    },
  ]);

  await createAuditLog({
    action: input.enabled ? "privacy_mode_enabled" : "privacy_mode_disabled",
    actorEmail: input.actorEmail ?? null,
    metadata: {
      reason: normalizeSettingText(input.reason),
      updatedAt,
    },
  });
}

export async function saveOrderEntrySettings(input: {
  enabled: boolean;
  expiresAt: string;
}) {
  const rows = await ensureSiteSettingsRows(Object.values(siteSettingKeys));
  const tokenState = await getOrderEntryTokenState(rows);
  const currentToken = tokenState.token || generateOrderEntryToken();
  const rotatedAt =
    normalizeSettingText(rows.get(siteSettingKeys.orderEntryRotatedAt)?.valueText) ||
    new Date().toISOString();

  await persistOrderEntryToken({
    enabled: input.enabled,
    expiresAt: input.expiresAt,
    rotatedAt,
    token: currentToken,
  });

  return currentToken;
}

export async function rotateOrderEntryAccess(input: {
  actorEmail?: string | null;
  enabled?: boolean;
  expiresAt?: string;
}) {
  const token = generateOrderEntryToken();
  const rotatedAt = new Date().toISOString();
  await persistOrderEntryToken({
    enabled: input.enabled !== false,
    expiresAt: input.expiresAt ?? "",
    rotatedAt,
    token,
  });

  await createAuditLog({
    action: "order_entry_token_rotated",
    actorEmail: input.actorEmail ?? null,
    metadata: {
      enabled: input.enabled !== false,
      expiresAt: normalizeSettingText(input.expiresAt),
      rotatedAt,
      tokenHint: getTokenHint(token),
    },
  });

  return {
    fullUrl: buildOrderEntryUrl("de", token),
    token,
  };
}

export function buildOrderEntryPath(locale: string, token: string) {
  return `/${locale}/order-entry/${token}`;
}

export function buildOrderEntryUrl(locale: string, token: string) {
  return `${getSiteBaseUrl()}${buildOrderEntryPath(locale, token)}`;
}

export async function getOrderEntryAccessState() {
  const snapshot = await getAdminSettingsSnapshot();

  if (!snapshot.orderEntryEnabled) {
    return {
      enabled: false,
      expiresAt: snapshot.orderEntryExpiresAt,
      rotatedAt: snapshot.orderEntryRotatedAt,
      token: "",
      tokenHash: "",
      tokenHint: snapshot.orderEntryTokenHint,
    };
  }

  const rows = await ensureSiteSettingsRows(Object.values(siteSettingKeys));
  const tokenState = await getOrderEntryTokenState(rows);

  return {
    enabled: snapshot.orderEntryEnabled,
    expiresAt: snapshot.orderEntryExpiresAt,
    rotatedAt: snapshot.orderEntryRotatedAt,
    token: tokenState.token,
    tokenHash: tokenState.tokenHash,
    tokenHint:
      snapshot.orderEntryTokenHint ||
      tokenState.tokenHint ||
      (tokenState.token
        ? getTokenHint(tokenState.token)
        : ""),
  };
}

export async function validateOrderEntryToken(token: string) {
  const access = await getOrderEntryAccessState();

  if (!access.enabled || !access.tokenHash) {
    return false;
  }

  if (access.expiresAt) {
    const expiresAt = Date.parse(access.expiresAt);

    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return false;
    }
  }

  return stringsMatch(access.tokenHash, hashOrderEntryToken(token));
}
