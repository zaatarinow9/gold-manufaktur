import "server-only";

import { cache } from "react";
import { randomBytes, timingSafeEqual } from "node:crypto";

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

type SchemaColumnRow = {
  column_name: string;
  table_name: string;
};

type SchemaColumnQueryResult = Promise<{
  data: SchemaColumnRow[] | null;
  error: { message: string } | null;
}>;

type SchemaColumnQueryAfterEq = {
  eq: (column: string, value: string) => SchemaColumnQueryResult;
};

type SiteSettingsIssueCode =
  | "column_missing"
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
  issueCode: SiteSettingsIssueCode | null;
  message: string | null;
  missingColumns: string[];
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
  orderEntryToken: "order_entry_token",
  orderEntryTokenHint: "order_entry_token_hint",
  orderEntryRotatedAt: "order_entry_rotated_at",
  ownerEmail: "owner_email",
  privacyModeEnabled: "privacy_mode_enabled",
  privacyModeReason: "privacy_mode_reason",
  privacyModeUpdatedAt: "privacy_mode_updated_at",
  supportNotificationEmail: "support_notification_email",
} as const;

function normalizeSettingText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeBooleanText(value: string | null | undefined) {
  return normalizeSettingText(value).toLowerCase() === "true";
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

const getSiteSettingsDiagnostics = cache(
  async (): Promise<SiteSettingsDiagnostics> => {
    try {
      const supabase = createSupabaseAdminClient() as unknown as {
        schema: (schema: string) => {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (column: string, value: string) => SchemaColumnQueryAfterEq;
            };
          };
        };
      };

      const { data, error } = await supabase
        .schema("information_schema")
        .from("columns")
        .select("table_name,column_name")
        .eq("table_schema", "public")
        .eq("table_name", siteSettingsTableName);

      if (error) {
        return {
          available: false,
          issueCode: "service_role_missing",
          message: `Unable to inspect ${siteSettingsTableName}: ${error.message}`,
          missingColumns: [],
          tableName: siteSettingsTableName,
        };
      }

      if (!data || data.length === 0) {
        return {
          available: false,
          issueCode: "table_missing",
          message:
            "Required table missing: public.site_settings. Apply migration 0008_admin_workflow_cleanup.sql first.",
          missingColumns: [],
          tableName: siteSettingsTableName,
        };
      }

      const missingColumns = requiredSiteSettingsColumns.filter(
        (columnName) =>
          !data.some(
            (column) =>
              column.table_name === siteSettingsTableName &&
              column.column_name === columnName
          )
      );

      if (missingColumns.length > 0) {
        return {
          available: false,
          issueCode: "column_missing",
          message: `Missing required columns on public.site_settings: ${missingColumns.join(", ")}. Apply migration 0008_admin_workflow_cleanup.sql first.`,
          missingColumns,
          tableName: siteSettingsTableName,
        };
      }

      return {
        available: true,
        issueCode: null,
        message: null,
        missingColumns: [],
        tableName: siteSettingsTableName,
      };
    } catch (error) {
      return {
        available: false,
        issueCode: "service_role_missing",
        message:
          error instanceof Error
            ? error.message
            : "Site settings are unavailable because the Supabase admin client could not be created.",
        missingColumns: [],
        tableName: siteSettingsTableName,
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
        "public.site_settings is unavailable. Apply migration 0008_admin_workflow_cleanup.sql first."
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

function tokensMatch(expectedToken: string, providedToken: string) {
  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(providedToken);

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

export async function getSiteSettingsAvailability() {
  return getSiteSettingsDiagnostics();
}

export async function getSiteTextSetting(key: string) {
  try {
    const rows = await readSiteSettings([key]);
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

  const rows = await readSiteSettings(Object.values(siteSettingKeys));

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
    orderEntryToken: normalizeSettingText(
      rows.get(siteSettingKeys.orderEntryToken)?.valueText
    ),
    orderEntryTokenHint: normalizeSettingText(
      rows.get(siteSettingKeys.orderEntryTokenHint)?.valueText
    ),
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
  const snapshot = await getAdminSettingsSnapshot();
  const currentToken = snapshot.orderEntryToken || generateOrderEntryToken();
  const rotatedAt =
    snapshot.orderEntryRotatedAt || new Date().toISOString();

  await saveSiteSettings([
    {
      key: siteSettingKeys.orderEntryEnabled,
      valueText: input.enabled ? "true" : "false",
    },
    {
      key: siteSettingKeys.orderEntryExpiresAt,
      valueText: normalizeSettingText(input.expiresAt) || null,
    },
    {
      key: siteSettingKeys.orderEntryToken,
      valueText: currentToken,
    },
    {
      key: siteSettingKeys.orderEntryTokenHint,
      valueText: getTokenHint(currentToken),
    },
    {
      key: siteSettingKeys.orderEntryRotatedAt,
      valueText: rotatedAt,
    },
  ]);

  return currentToken;
}

export async function rotateOrderEntryAccess(input: {
  actorEmail?: string | null;
  enabled?: boolean;
  expiresAt?: string;
}) {
  const token = generateOrderEntryToken();
  const rotatedAt = new Date().toISOString();
  await saveSiteSettings([
    {
      key: siteSettingKeys.orderEntryEnabled,
      valueText: input.enabled === false ? "false" : "true",
    },
    {
      key: siteSettingKeys.orderEntryExpiresAt,
      valueText: normalizeSettingText(input.expiresAt) || null,
    },
    {
      key: siteSettingKeys.orderEntryToken,
      valueText: token,
    },
    {
      key: siteSettingKeys.orderEntryTokenHint,
      valueText: getTokenHint(token),
    },
    {
      key: siteSettingKeys.orderEntryRotatedAt,
      valueText: rotatedAt,
    },
  ]);

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
  return {
    enabled: snapshot.orderEntryEnabled,
    expiresAt: snapshot.orderEntryExpiresAt,
    rotatedAt: snapshot.orderEntryRotatedAt,
    token: snapshot.orderEntryToken,
    tokenHint:
      snapshot.orderEntryTokenHint ||
      (snapshot.orderEntryToken
        ? getTokenHint(snapshot.orderEntryToken)
        : ""),
  };
}

export async function validateOrderEntryToken(token: string) {
  const access = await getOrderEntryAccessState();

  if (!access.enabled || !access.token) {
    return false;
  }

  if (access.expiresAt) {
    const expiresAt = Date.parse(access.expiresAt);

    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return false;
    }
  }

  return tokensMatch(access.token, token);
}
