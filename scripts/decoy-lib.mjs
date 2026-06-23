import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { resolve } from "node:path";
import tls from "node:tls";

import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const ADMIN_DECOY_SINGLETON_KEY = "main";
const DEFAULT_ADMIN_DECOY_RECOVERY_EMAIL = "service@goldhelwah.de";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;
    const separatorIndex = normalizedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = normalizedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r");
  }
}

function loadLocalEnvFiles() {
  const cwd = process.cwd();

  for (const fileName of [".env.local", ".env"]) {
    loadEnvFile(resolve(cwd, fileName));
  }
}

loadLocalEnvFiles();

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

function extractEmailAddress(value) {
  const match = value.match(/<([^>]+)>/u);
  return (match?.[1] ?? value).trim();
}

function normalizeBaseUrl(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/\/+$/u, "") : "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatExpiry(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  const parsed = Date.parse(normalized);

  if (Number.isNaN(parsed)) {
    return "";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(parsed));
}

function encodeHeaderValue(value) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function dotStuff(value) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

class SmtpLineReader {
  constructor(socket) {
    this.buffer = "";
    this.pending = [];
    this.queued = [];
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      this.pushChunk(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    });
    socket.on("error", (error) => {
      this.rejectAll(error instanceof Error ? error : new Error(String(error)));
    });
    socket.on("close", () => {
      this.rejectAll(new Error("SMTP connection closed."));
    });
  }

  async nextLine() {
    if (this.queued.length > 0) {
      return this.queued.shift();
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ reject, resolve });
    });
  }

  pushChunk(chunk) {
    this.buffer += chunk;

    while (true) {
      const delimiterIndex = this.buffer.indexOf("\r\n");

      if (delimiterIndex === -1) {
        break;
      }

      const line = this.buffer.slice(0, delimiterIndex);
      this.buffer = this.buffer.slice(delimiterIndex + 2);

      if (this.pending.length > 0) {
        this.pending.shift().resolve(line);
      } else {
        this.queued.push(line);
      }
    }
  }

  rejectAll(error) {
    while (this.pending.length > 0) {
      this.pending.shift().reject(error);
    }
  }
}

function parseCapabilities(response) {
  return response.lines
    .map((line) => line.slice(4).trim().toUpperCase())
    .filter(Boolean);
}

async function openSocket(config) {
  const socket = config.secure
    ? tls.connect({
        host: config.host,
        port: config.port,
        rejectUnauthorized: config.rejectUnauthorized,
        servername: config.host,
      })
    : net.connect({
        host: config.host,
        port: config.port,
      });

  await once(socket, config.secure ? "secureConnect" : "connect");

  return socket;
}

async function readResponse(reader) {
  const lines = [];

  while (true) {
    const line = await reader.nextLine();
    lines.push(line);

    if (/^\d{3} /u.test(line)) {
      return {
        code: Number(line.slice(0, 3)),
        lines,
        message: lines.join("\n"),
      };
    }
  }
}

async function sendCommand(socket, reader, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  const response = await readResponse(reader);

  if (!expectedCodes.includes(response.code)) {
    throw new Error(
      `SMTP command failed (${command.split(" ")[0]}): ${response.message}`
    );
  }

  return response;
}

async function upgradeToTls(socket, config) {
  const tlsSocket = tls.connect({
    host: config.host,
    rejectUnauthorized: config.rejectUnauthorized,
    servername: config.host,
    socket,
  });

  await once(tlsSocket, "secureConnect");

  return tlsSocket;
}

async function sayHello(socket, reader) {
  const ehloHost =
    os.hostname().replace(/[^a-z0-9.-]/giu, "").trim() || "localhost";

  return sendCommand(socket, reader, `EHLO ${ehloHost}`, [250]);
}

async function authenticate(socket, reader, capabilities, config) {
  const authLine = capabilities.find((line) => line.startsWith("AUTH")) ?? "";

  if (authLine.includes("PLAIN")) {
    const payload = Buffer.from(
      `\0${config.user}\0${config.password}`,
      "utf8"
    ).toString("base64");
    await sendCommand(socket, reader, `AUTH PLAIN ${payload}`, [235]);
    return;
  }

  await sendCommand(socket, reader, "AUTH LOGIN", [334]);
  await sendCommand(
    socket,
    reader,
    Buffer.from(config.user, "utf8").toString("base64"),
    [334]
  );
  await sendCommand(
    socket,
    reader,
    Buffer.from(config.password, "utf8").toString("base64"),
    [235]
  );
}

function buildMimeMessage(config, input) {
  const toHeader = input.to.join(", ");
  const headers = [
    `From: ${config.fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
  ];

  if (input.replyTo) {
    headers.push(`Reply-To: ${input.replyTo}`);
  }

  if (!input.html) {
    headers.push('Content-Type: text/plain; charset="utf-8"');
    headers.push("Content-Transfer-Encoding: 8bit");

    return `${headers.join("\r\n")}\r\n\r\n${dotStuff(input.text)}\r\n`;
  }

  const boundary = `goldhelwah-${randomUUID()}`;

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

async function sendViaSmtp(config, input) {
  let socket = await openSocket(config);
  let reader = new SmtpLineReader(socket);

  try {
    const greeting = await readResponse(reader);

    if (greeting.code !== 220) {
      throw new Error(`SMTP server rejected connection: ${greeting.message}`);
    }

    let helloResponse = await sayHello(socket, reader);
    let capabilities = parseCapabilities(helloResponse);

    if (!config.secure && capabilities.some((line) => line.startsWith("STARTTLS"))) {
      await sendCommand(socket, reader, "STARTTLS", [220]);
      socket = await upgradeToTls(socket, config);
      reader = new SmtpLineReader(socket);
      helloResponse = await sayHello(socket, reader);
      capabilities = parseCapabilities(helloResponse);
    }

    await authenticate(socket, reader, capabilities, config);
    await sendCommand(socket, reader, `MAIL FROM:<${config.fromAddress}>`, [250]);

    for (const recipient of input.to) {
      await sendCommand(socket, reader, `RCPT TO:<${recipient}>`, [250, 251]);
    }

    await sendCommand(socket, reader, "DATA", [354]);
    socket.write(`${buildMimeMessage(config, input)}\r\n.\r\n`);

    const dataResponse = await readResponse(reader);

    if (dataResponse.code !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.message}`);
    }

    await sendCommand(socket, reader, "QUIT", [221]);
  } finally {
    socket.destroy();
  }
}

function getSmtpState() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const portValue = process.env.SMTP_PORT?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const password =
    process.env.SMTP_PASSWORD?.trim() ?? process.env.SMTP_PASS?.trim() ?? "";
  const fromAddressValue =
    process.env.EMAIL_FROM_ADDRESS?.trim() ??
    process.env.SMTP_FROM_EMAIL?.trim() ??
    process.env.SMTP_FROM?.trim() ??
    user;
  const fromAddress = extractEmailAddress(fromAddressValue);
  const fromName = process.env.EMAIL_FROM_NAME?.trim() ?? "GoldHelwah GmbH";

  if (!host || !portValue || !user || !fromAddress) {
    return {
      ready: false,
      reason: "smtp_not_configured",
    };
  }

  if (!password) {
    return {
      ready: false,
      reason: "smtp_missing_password",
    };
  }

  const port = Number(portValue);

  if (!Number.isFinite(port) || port <= 0) {
    return {
      ready: false,
      reason: "smtp_invalid_port",
    };
  }

  return {
    config: {
      fromAddress,
      fromHeader: `${fromName} <${fromAddress}>`,
      host,
      password,
      port,
      rejectUnauthorized:
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false",
      secure:
        process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465,
      user,
    },
    ready: true,
  };
}

function buildAdminSystemAccessEmail({ expiresAt, link }) {
  const subject = "Systemzugriff aktualisiert – Gold Helwah";
  const expiresAtLabel = formatExpiry(expiresAt);
  const expiryLine = expiresAtLabel
    ? `Der Link ist bis ${expiresAtLabel} gueltig.`
    : "Der Link bleibt gueltig, bis er erneut aktualisiert oder deaktiviert wird.";
  const supportEmail =
    normalizeText(process.env.ADMIN_DECOY_RECOVERY_EMAIL) ||
    DEFAULT_ADMIN_DECOY_RECOVERY_EMAIL;
  const supportPhone = "+49 173 5371225";
  const text = [
    "Guten Tag,",
    "",
    "der direkte Zugriffslink wurde aktualisiert.",
    expiryLine,
    "",
    "Neuer Zugriffslink:",
    link,
    "",
    "Falls die Schaltflaeche in Ihrer Mail-App nicht angezeigt wird, koennen Sie den Link direkt in den Browser kopieren.",
    "",
    "Rueckfragen:",
    supportEmail,
    supportPhone,
  ].join("\n");

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#060606;color:#f7f1e3;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060606;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:separate;border-spacing:0;background:linear-gradient(180deg,#17120d,#090909);border:1px solid rgba(196,154,82,0.24);border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:34px 30px 18px 30px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="color:#e8c987;font-size:12px;letter-spacing:0.26em;text-transform:uppercase;margin-bottom:10px;">Gold Helwah</div>
                <h1 style="margin:0;color:#f7f1e3;font-size:30px;line-height:1.15;">Systemzugriff aktualisiert</h1>
                <p style="margin:16px auto 0 auto;max-width:520px;color:#c7b99e;font-size:15px;line-height:1.7;">
                  Guten Tag,<br />
                  der direkte Zugriffslink wurde aktualisiert.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0 30px;">
                <div style="border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:22px;">
                  <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">Hinweis</div>
                  <p style="margin:0;color:#f7f1e3;font-size:14px;line-height:1.7;">${escapeHtml(expiryLine)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0 30px;text-align:center;">
                <a href="${escapeHtml(link)}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:linear-gradient(135deg,#e8c987,#c49a52);color:#16120d;font-size:15px;font-weight:700;text-decoration:none;">Zugriff aufrufen</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0 30px;">
                <div style="border:1px solid rgba(196,154,82,0.2);border-radius:24px;background:rgba(196,154,82,0.08);padding:20px;">
                  <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">Fallback-URL</div>
                  <p style="margin:0;color:#f7f1e3;font-size:14px;line-height:1.8;word-break:break-word;">
                    <a href="${escapeHtml(link)}" style="color:#f7f1e3;text-decoration:none;">${escapeHtml(link)}</a>
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 30px 30px;">
                <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;">
                  <p style="margin:0;color:#c7b99e;font-size:13px;line-height:1.8;">
                    Rueckfragen an ${escapeHtml(supportEmail)} oder ${escapeHtml(supportPhone)}.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    subject,
    text,
  };
}

export function getRecoveryEmail() {
  return (
    normalizeText(process.env.ADMIN_DECOY_RECOVERY_EMAIL) ||
    DEFAULT_ADMIN_DECOY_RECOVERY_EMAIL
  );
}

export function getAuditRecipientTarget(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return "";
  }

  const atIndex = normalized.lastIndexOf("@");
  return atIndex === -1 ? normalized : normalized.slice(atIndex + 1);
}

export async function sendAdminSystemAccessEmail({ expiresAt, link }) {
  const recipientEmail = getRecoveryEmail();
  const smtpState = getSmtpState();

  if (!smtpState.ready) {
    return {
      delivered: false,
      ok: false,
      reason: smtpState.reason,
      recipientEmail,
      status: "skipped",
    };
  }

  const email = buildAdminSystemAccessEmail({ expiresAt, link });

  try {
    await sendViaSmtp(smtpState.config, {
      html: email.html,
      replyTo: smtpState.config.fromAddress,
      subject: email.subject,
      text: email.text,
      to: [recipientEmail],
    });

    return {
      delivered: true,
      ok: true,
      recipientEmail,
      status: "sent",
    };
  } catch (error) {
    return {
      delivered: false,
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
      recipientEmail,
      status: "failed",
    };
  }
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

export function buildGateUrl(locale, token, baseUrl = "") {
  const normalizedLocale = normalizeText(locale) || "de";
  const origin = normalizeBaseUrl(baseUrl) || resolveSiteBaseUrl();
  return `${origin}/${normalizedLocale}/admin/system-check/${token}`;
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
    email: false,
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

    if (current === "--email") {
      args.email = true;
      continue;
    }

    if (current === "--no-email") {
      args.email = false;
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
