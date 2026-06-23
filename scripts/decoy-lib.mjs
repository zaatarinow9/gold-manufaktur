import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const ADMIN_DECOY_SINGLETON_KEY = "main";

function getEnv(name, { required = true } = {}) {
  const value = process.env[name]?.trim() ?? "";

  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPepper() {
  return getEnv("ADMIN_DECOY_PEPPER");
}

export function hashValue(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw new Error("A value is required.");
  }

  return createHash("sha256")
    .update(`${normalizedValue}:${getPepper()}`)
    .digest("hex");
}

export function createSupabaseServiceClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      realtime: {
        transport: WebSocket,
      },
    }
  );
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeExpiresAt(value) {
  const trimmed = normalizeText(value);

  if (!trimmed) {
    return null;
  }

  const parsed = Date.parse(trimmed);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid date/time value: ${value}`);
  }

  return new Date(parsed).toISOString();
}

export function resolveSiteBaseUrl() {
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

export function buildGateUrl(locale, token) {
  const normalizedLocale = normalizeText(locale) || "de";
  return `${resolveSiteBaseUrl()}/${normalizedLocale}/admin/system-check/${token}`;
}

export async function readControl() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admin_decoy_control")
    .select("*")
    .eq("singleton_key", ADMIN_DECOY_SINGLETON_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load admin_decoy_control: ${error.message}`);
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
      `Unable to create admin_decoy_control singleton: ${insertError?.message ?? "unknown_error"}`
    );
  }

  return inserted;
}

export async function updateControl(payload) {
  await readControl();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admin_decoy_control")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("singleton_key", ADMIN_DECOY_SINGLETON_KEY)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to update admin_decoy_control: ${error?.message ?? "unknown_error"}`
    );
  }

  return data;
}

export async function writeAuditLog(action, metadata = {}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("admin_decoy_audit_logs").insert({
    action,
    actor_email: "local-script",
    actor_user_id: "local-script",
    ip: null,
    metadata,
    user_agent: "local-script",
  });

  if (error) {
    throw new Error(`Unable to write admin decoy audit log: ${error.message}`);
  }
}

export function createGateToken() {
  return randomBytes(32).toString("base64url");
}

export function parseCliArgs(argv) {
  const args = {
    days: "",
    expires: "",
    locale: "de",
    positional: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--locale") {
      args.locale = normalizeText(argv[index + 1]) || "de";
      index += 1;
      continue;
    }

    if (current === "--days") {
      args.days = normalizeText(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current === "--expires") {
      args.expires = normalizeText(argv[index + 1]);
      index += 1;
      continue;
    }

    args.positional.push(current);
  }

  return args;
}

export function resolveRotateExpiry({ days, expires }) {
  if (expires) {
    return normalizeExpiresAt(expires);
  }

  if (!days) {
    return null;
  }

  const parsedDays = Number(days);

  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    throw new Error(`Invalid --days value: ${days}`);
  }

  return new Date(Date.now() + parsedDays * 24 * 60 * 60 * 1000).toISOString();
}

export function printStatus(control) {
  console.log(`is_decoy_enabled=${control.is_decoy_enabled}`);
  console.log(`gate_enabled=${control.gate_enabled}`);
  console.log(`token_version=${control.token_version}`);
  console.log(`expires_at=${control.expires_at ?? ""}`);
  console.log(`last_rotated_at=${control.last_rotated_at ?? ""}`);
  console.log(`last_used_at=${control.last_used_at ?? ""}`);
}
