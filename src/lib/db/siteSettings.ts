import "server-only";

import { cache } from "react";

import { getDecoySettingsSnapshot } from "@/lib/admin/decoyData";
import type {
  StaticSiteImageRecord,
  StaticSiteImageSlot,
} from "@/lib/site-images";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import type { AppLocale } from "@/i18n/routing";
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
    ownerEmail: string;
  privacyModeEnabled: boolean;
  privacyModeReason: string;
  privacyModeUpdatedAt: string;
  smtpStatus: SmtpStatus;
  supportNotificationEmail: string;
  publicVisualSettings: Awaited<ReturnType<typeof getPublicVisualSettings>>;
};

type UpsertSiteSettingInput = {
  key: string;
  valueJson?: Json;
  valueText?: string | null;
};

export const siteSettingKeys = {
  homepageHeroImageUrl: "homepage_hero_image_url",
  shopHeroImageUrl: "shop_hero_image_url",
  promoPopup: "promo_popup",
  staticImageHomepageHero: "static_image_homepage_hero",
  staticImagePromoPopupImage: "static_image_promo_popup_image",
  staticImageShopHero: "static_image_shop_hero",
  adminNotificationEmail: "admin_notification_email",
  ownerEmail: "owner_email",
  privacyModeEnabled: "privacy_mode_enabled",
  privacyModeReason: "privacy_mode_reason",
  privacyModeUpdatedAt: "privacy_mode_updated_at",
  supportNotificationEmail: "support_notification_email",
} as const;

/** Text of the pop-up per website language; empty languages fall back. */
export type PromoText = Record<AppLocale, string>;

export type PublicPromoPopup = {
  ctaText: PromoText;
  /** "/shop", "/contact" or a full https:// address. */
  ctaUrl: string;
  description: PromoText;
  enabled: boolean;
  endsAt: string;
  imageUrl: string;
  showOnce: boolean;
  startsAt: string;
  title: PromoText;
};

/** What one visitor sees, already in their language. */
export type ResolvedPromoPopup = {
  ctaText: string;
  ctaUrl: string;
  description: string;
  endsAt: string;
  imageUrl: string;
  showOnce: boolean;
  startsAt: string;
  title: string;
  /** Changes when the content changes, so "show once" starts over. */
  version: string;
};

export type PublicPromoPopupSettings = Omit<PublicPromoPopup, "imageUrl">;
export type StaticSiteImageMap = Record<
  StaticSiteImageSlot,
  StaticSiteImageRecord | null
>;
export type PublicVisualSettings = {
  homepageHeroImageUrl: string;
  promoPopup: PublicPromoPopup;
  shopHeroImageUrl: string;
  staticImages: StaticSiteImageMap;
};

const promoLocales = ["de", "ar", "en", "fr", "tr"] as const satisfies readonly AppLocale[];

export function emptyPromoText(): PromoText {
  return { ar: "", de: "", en: "", fr: "", tr: "" };
}

const emptyPromoPopup: PublicPromoPopup = {
  ctaText: emptyPromoText(),
  ctaUrl: "",
  description: emptyPromoText(),
  enabled: false,
  endsAt: "",
  imageUrl: "",
  showOnce: true,
  startsAt: "",
  title: emptyPromoText(),
};

/** Accepts the old single-language strings as well as the per-language form. */
function toPromoText(value: unknown): PromoText {
  const result = emptyPromoText();
  if (typeof value === "string") {
    for (const locale of promoLocales) result[locale] = value.trim();
    return result;
  }
  if (value && typeof value === "object") {
    for (const locale of promoLocales) {
      const entry = (value as Record<string, unknown>)[locale];
      result[locale] = typeof entry === "string" ? entry.trim() : "";
    }
  }
  return result;
}

function pickPromoText(text: PromoText, locale: AppLocale) {
  return text[locale] || text.de || promoLocales.map((code) => text[code]).find(Boolean) || "";
}

export function resolvePromoPopup(promo: PublicPromoPopup, locale: AppLocale): ResolvedPromoPopup | null {
  const title = pickPromoText(promo.title, locale);
  if (!promo.enabled || !title) return null;
  const rawUrl = promo.ctaUrl.trim();
  const ctaUrl = rawUrl.startsWith("/") && !/^\/(de|ar|en|fr|tr)(\/|$)/.test(rawUrl) ? `/${locale}${rawUrl}` : rawUrl;
  const resolved = {
    ctaText: pickPromoText(promo.ctaText, locale),
    ctaUrl,
    description: pickPromoText(promo.description, locale),
    endsAt: promo.endsAt,
    imageUrl: promo.imageUrl,
    showOnce: promo.showOnce,
    startsAt: promo.startsAt,
    title,
  };
  const fingerprint = JSON.stringify([promo.title, promo.description, promo.startsAt, promo.imageUrl]);
  let hash = 0;
  for (let index = 0; index < fingerprint.length; index += 1) hash = (hash * 31 + fingerprint.charCodeAt(index)) | 0;
  return { ...resolved, version: Math.abs(hash).toString(36) };
}

function createEmptyStaticSiteImages(): StaticSiteImageMap {
  return {
    homepageHero: null,
    promoPopupImage: null,
    shopHero: null,
  };
}

function getStaticSiteImageSettingKey(slot: StaticSiteImageSlot) {
  switch (slot) {
    case "homepageHero":
      return siteSettingKeys.staticImageHomepageHero;
    case "promoPopupImage":
      return siteSettingKeys.staticImagePromoPopupImage;
    case "shopHero":
      return siteSettingKeys.staticImageShopHero;
  }
}

function normalizeStaticSiteImageRecord(
  value: Json | null | undefined
): StaticSiteImageRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const publicUrl =
    typeof value.publicUrl === "string" ? value.publicUrl.trim() : "";
  const storagePath =
    typeof value.storagePath === "string" ? value.storagePath.trim() : "";
  const updatedAt =
    typeof value.updatedAt === "string" ? value.updatedAt.trim() : "";

  if (!publicUrl || !storagePath) {
    return null;
  }

  return {
    publicUrl,
    storagePath,
    updatedAt,
  };
}

function parsePromoPopup(value: string): PublicPromoPopup {
  try {
    const raw = JSON.parse(value) as Record<string, unknown>;
    return {
      ctaText: toPromoText(raw.ctaText),
      ctaUrl: typeof raw.ctaUrl === "string" ? raw.ctaUrl.trim() : "",
      description: toPromoText(raw.description),
      enabled: raw.enabled === true,
      endsAt: typeof raw.endsAt === "string" ? raw.endsAt : "",
      imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : "",
      showOnce: raw.showOnce !== false,
      startsAt: typeof raw.startsAt === "string" ? raw.startsAt : "",
      title: toPromoText(raw.title),
    };
  } catch {
    return emptyPromoPopup;
  }
}

function buildPublicVisualSettingsFromRows(rows: SiteSettingRowMap): PublicVisualSettings {
  const staticImages: StaticSiteImageMap = {
    homepageHero: normalizeStaticSiteImageRecord(
      rows.get(siteSettingKeys.staticImageHomepageHero)?.valueJson
    ),
    promoPopupImage: normalizeStaticSiteImageRecord(
      rows.get(siteSettingKeys.staticImagePromoPopupImage)?.valueJson
    ),
    shopHero: normalizeStaticSiteImageRecord(
      rows.get(siteSettingKeys.staticImageShopHero)?.valueJson
    ),
  };
  const promoPopup = parsePromoPopup(
    normalizeSettingText(rows.get(siteSettingKeys.promoPopup)?.valueText)
  );

  return {
    homepageHeroImageUrl:
      staticImages.homepageHero?.publicUrl ||
      normalizeSettingText(rows.get(siteSettingKeys.homepageHeroImageUrl)?.valueText),
    promoPopup: {
      ...promoPopup,
      imageUrl: staticImages.promoPopupImage?.publicUrl || promoPopup.imageUrl,
    },
    shopHeroImageUrl:
      staticImages.shopHero?.publicUrl ||
      normalizeSettingText(rows.get(siteSettingKeys.shopHeroImageUrl)?.valueText),
    staticImages,
  };
}

function buildLegacySiteImageUpdates(input: {
  promoPopup: PublicPromoPopup;
  slot: StaticSiteImageSlot;
  publicUrl: string;
}): UpsertSiteSettingInput[] {
  switch (input.slot) {
    case "homepageHero":
      return [
        {
          key: siteSettingKeys.homepageHeroImageUrl,
          valueText: input.publicUrl || null,
        },
      ];
    case "promoPopupImage":
      return [
        {
          key: siteSettingKeys.promoPopup,
          valueText: JSON.stringify({
            ...input.promoPopup,
            imageUrl: input.publicUrl,
          }),
        },
      ];
    case "shopHero":
      return [
        {
          key: siteSettingKeys.shopHeroImageUrl,
          valueText: input.publicUrl || null,
        },
      ];
  }
}

export async function getPublicVisualSettings(): Promise<PublicVisualSettings> {
  try {
    const rows = await ensureSiteSettingsRows([
      siteSettingKeys.homepageHeroImageUrl,
      siteSettingKeys.promoPopup,
      siteSettingKeys.shopHeroImageUrl,
      siteSettingKeys.staticImageHomepageHero,
      siteSettingKeys.staticImagePromoPopupImage,
      siteSettingKeys.staticImageShopHero,
    ]);

    return buildPublicVisualSettingsFromRows(rows);
  } catch (error) {
    if (error instanceof SiteSettingsError) {
      return {
        homepageHeroImageUrl: "",
        promoPopup: emptyPromoPopup,
        shopHeroImageUrl: "",
        staticImages: createEmptyStaticSiteImages(),
      };
    }

    throw error;
  }
}

export async function savePublicVisualSettings(input: {
  promoPopup: PublicPromoPopupSettings;
}) {
  const rows = await ensureSiteSettingsRows([
    siteSettingKeys.promoPopup,
    siteSettingKeys.staticImagePromoPopupImage,
  ]);
  const currentVisualSettings = buildPublicVisualSettingsFromRows(rows);

  await saveSiteSettings([
    {
      key: siteSettingKeys.promoPopup,
      valueText: JSON.stringify({
        ...currentVisualSettings.promoPopup,
        ...input.promoPopup,
        imageUrl: currentVisualSettings.promoPopup.imageUrl,
      }),
    },
  ]);
}

export async function replaceStaticSiteImage(input: {
  publicUrl: string;
  slot: StaticSiteImageSlot;
  storagePath: string;
}) {
  const rows = await ensureSiteSettingsRows([
    siteSettingKeys.homepageHeroImageUrl,
    siteSettingKeys.promoPopup,
    siteSettingKeys.shopHeroImageUrl,
    siteSettingKeys.staticImageHomepageHero,
    siteSettingKeys.staticImagePromoPopupImage,
    siteSettingKeys.staticImageShopHero,
  ]);
  const currentVisualSettings = buildPublicVisualSettingsFromRows(rows);
  const nextRecord: StaticSiteImageRecord = {
    publicUrl: normalizeSettingText(input.publicUrl),
    storagePath: normalizeSettingText(input.storagePath),
    updatedAt: new Date().toISOString(),
  };
  const previousRecord = currentVisualSettings.staticImages[input.slot];

  await saveSiteSettings([
    {
      key: getStaticSiteImageSettingKey(input.slot),
      valueJson: nextRecord,
      valueText: null,
    },
    ...buildLegacySiteImageUpdates({
      promoPopup: currentVisualSettings.promoPopup,
      publicUrl: nextRecord.publicUrl,
      slot: input.slot,
    }),
  ]);

  return {
    current: nextRecord,
    previous: previousRecord,
  };
}

export async function resetStaticSiteImage(slot: StaticSiteImageSlot) {
  const rows = await ensureSiteSettingsRows([
    siteSettingKeys.homepageHeroImageUrl,
    siteSettingKeys.promoPopup,
    siteSettingKeys.shopHeroImageUrl,
    siteSettingKeys.staticImageHomepageHero,
    siteSettingKeys.staticImagePromoPopupImage,
    siteSettingKeys.staticImageShopHero,
  ]);
  const currentVisualSettings = buildPublicVisualSettingsFromRows(rows);
  const previousRecord = currentVisualSettings.staticImages[slot];

  await saveSiteSettings([
    {
      key: getStaticSiteImageSettingKey(slot),
      valueJson: {},
      valueText: null,
    },
    ...buildLegacySiteImageUpdates({
      promoPopup: currentVisualSettings.promoPopup,
      publicUrl: "",
      slot,
    }),
  ]);

  return previousRecord;
}

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

type SiteSettingRowMap = Map<
  string,
  {
    valueJson: Json | null;
    valueText: string | null;
  }
>;

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
      ownerEmail: "",
      privacyModeEnabled: false,
      privacyModeReason: "",
      privacyModeUpdatedAt: "",
      smtpStatus: getSmtpStatus(),
      supportNotificationEmail: "",
      publicVisualSettings: {
        homepageHeroImageUrl: "",
        promoPopup: emptyPromoPopup,
        shopHeroImageUrl: "",
        staticImages: createEmptyStaticSiteImages(),
      },
    };
  }

  const rows = await ensureSiteSettingsRows(Object.values(siteSettingKeys));

  return {
    adminNotificationEmail: normalizeSettingText(
      rows.get(siteSettingKeys.adminNotificationEmail)?.valueText
    ),
    diagnostics,
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
    publicVisualSettings: await getPublicVisualSettings(),
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
