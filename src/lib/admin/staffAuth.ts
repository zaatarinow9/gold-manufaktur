import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AppLocale } from "@/i18n/routing";
import { getRoleDashboardPath } from "@/lib/admin/roleAccess";
import { createAuditLog } from "@/lib/db/auditLogs";
import { getSiteBaseUrl } from "@/lib/db/siteSettings";
import {
  sendTransactionalEmail,
  type EmailDispatchResult,
} from "@/lib/email/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { AdminRole } from "@/types/admin";

export type StaffAccessEmailKind = "invite" | "password_reset";
export type StaffAccountStatus =
  | "active"
  | "disabled"
  | "invited"
  | "missing_auth_user";
export type StaffManagedRole = AdminRole;
export type StaffTokenType = "invite" | "recovery";

export type StaffProfileRow = {
  created_at: string;
  deleted_at?: string | null;
  email: string | null;
  employee_id: string | null;
  full_name: string | null;
  id: string;
  invited_at?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  role: StaffManagedRole | null;
  updated_at: string;
  workshop_id: string | null;
};

export type StaffAccessLinkResult = {
  authUser: User;
  callbackPath: string;
  callbackUrl: string;
  createdAuthUser: boolean;
  redactedCallbackPath: string;
  redactedCallbackUrl: string;
  tokenType: StaffTokenType;
};

export type StaffAccessEmailInput = {
  actorEmail?: string | null;
  authUserId: string;
  callbackUrl: string;
  displayName: string;
  employeeId?: string | null;
  kind: StaffAccessEmailKind;
  metadataKind:
    | "admin_user_invite"
    | "admin_user_password_reset"
    | "employee_invite"
    | "employee_password_reset";
  recipientEmail: string;
  redactedCallbackUrl: string;
  role: StaffManagedRole;
};

export type ResolveStaffAccountStatusInput = {
  authUser: User | null;
  employeeEmail: string;
  employeeIsActive: boolean;
  isLinked: boolean;
  profile: StaffProfileRow | null;
};

export class StaffAccountError extends Error {
  constructor(
    public readonly code:
      | "account_not_configured"
      | "account_not_linked"
      | "account_role_conflict"
      | "duplicate_email"
      | "email_required"
      | "employee_not_found"
      | "link_in_use"
      | "role_not_allowed"
      | "workshop_forbidden",
    message?: string
  ) {
    super(message ?? code);
    this.name = "StaffAccountError";
  }
}

function getSupabaseAdmin() {
  return createSupabaseAdminClient();
}

export function normalizeStaffEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeStaffText(value: string) {
  return value.trim();
}

function safeAdminPath(path: string | null | undefined) {
  const value = path?.trim() ?? "";
  return value.startsWith("/") ? value : "";
}

function buildStaffAuthCallbackPath(input: {
  kind: StaffAccessEmailKind;
  locale: AppLocale;
  nextPath: string;
  tokenHash: string;
  tokenType: StaffTokenType;
}) {
  const search = new URLSearchParams({
    mode: input.kind,
    next: input.nextPath,
    token_hash: input.tokenHash,
    type: input.tokenType,
  });

  return `/${input.locale}/admin/auth/callback?${search.toString()}`;
}

function buildStaffAuthCallbackUrl(path: string) {
  return `${getSiteBaseUrl()}${path}`;
}

function getInviteEmailSubject(kind: StaffAccessEmailKind) {
  return kind === "invite"
    ? "Ihr Zugang zum Gold Helwah Adminbereich"
    : "Passwort fuer den Gold Helwah Adminbereich zuruecksetzen";
}

function getInviteEmailButtonLabel(kind: StaffAccessEmailKind) {
  return kind === "invite" ? "Zugang einrichten" : "Passwort zuruecksetzen";
}

function buildStaffAccessEmail(input: {
  callbackUrl: string;
  displayName: string;
  kind: StaffAccessEmailKind;
}) {
  const subject = getInviteEmailSubject(input.kind);
  const buttonLabel = getInviteEmailButtonLabel(input.kind);
  const greeting = normalizeStaffText(input.displayName) || "Guten Tag";
  const intro =
    input.kind === "invite"
      ? "fuer Sie wurde ein Zugang zur Gold Helwah Plattform eingerichtet."
      : "fuer Ihr Konto im Gold Helwah Adminbereich wurde ein neuer Link zum Setzen Ihres Passworts angefordert.";
  const actionText =
    input.kind === "invite"
      ? "Bitte richten Sie Ihren Zugang ueber den folgenden Link ein:"
      : "Bitte setzen Sie Ihr Passwort ueber den folgenden Link neu:";
  const text = [
    `Guten Tag ${greeting},`,
    "",
    intro,
    actionText,
    "",
    input.callbackUrl,
    "",
    "Bitte teilen Sie diesen Link nicht mit anderen Personen.",
    "",
    "Mit freundlichen Gruessen",
    "Gold Helwah",
    "service@goldhelwah.de",
  ].join("\n");

  const html = [
    `<p>Guten Tag ${escapeHtml(greeting)},</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    `<p><a href="${escapeHtmlAttribute(
      input.callbackUrl
    )}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#c49a52;color:#111111;text-decoration:none;font-weight:700;">${escapeHtml(
      buttonLabel
    )}</a></p>`,
    `<p>Falls die Schaltflaeche nicht funktioniert, verwenden Sie bitte diesen Link:</p>`,
    `<p><a href="${escapeHtmlAttribute(input.callbackUrl)}">${escapeHtml(
      input.callbackUrl
    )}</a></p>`,
    `<p>Bitte teilen Sie diesen Link nicht mit anderen Personen.</p>`,
    `<p>Mit freundlichen Gruessen<br />Gold Helwah<br /><a href="mailto:service@goldhelwah.de">service@goldhelwah.de</a></p>`,
  ].join("");

  return {
    html,
    subject,
    text,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlAttribute(value: string) {
  return escapeHtml(value);
}

export async function listAllAuthUsers() {
  const supabase = getSupabaseAdmin();
  const users: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`);
    }

    users.push(...(data.users ?? []));

    if (!data.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return users;
}

export async function getAuthUserById(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function findAuthUserByEmail(email: string) {
  const normalizedEmail = normalizeStaffEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const users = await listAllAuthUsers();
  return (
    users.find(
      (user) => normalizeStaffEmail(user.email ?? "") === normalizedEmail
    ) ?? null
  );
}

export async function getStaffProfilesByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [] as StaffProfileRow[];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(`Unable to load user profiles: ${error.message}`);
  }

  return (data ?? []) as unknown as StaffProfileRow[];
}

export async function getStaffProfilesByEmails(emails: string[]) {
  const uniqueEmails = [
    ...new Set(
      emails
        .map((value) => normalizeStaffEmail(value))
        .filter((value) => value.length > 0)
    ),
  ];

  if (uniqueEmails.length === 0) {
    return [] as StaffProfileRow[];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("email", uniqueEmails);

  if (error) {
    throw new Error(`Unable to load user profiles by email: ${error.message}`);
  }

  return (data ?? []) as unknown as StaffProfileRow[];
}

export async function getStaffProfilesByEmployeeIds(employeeIds: string[]) {
  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [] as StaffProfileRow[];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("employee_id", uniqueIds);

  if (error) {
    throw new Error(`Unable to load employee profiles: ${error.message}`);
  }

  return (data ?? []) as unknown as StaffProfileRow[];
}

export async function getStaffProfileByAuthUserId(authUserId: string) {
  const profiles = await getStaffProfilesByIds([authUserId]);
  return profiles[0] ?? null;
}

export async function upsertStaffProfile(input: {
  authUserId: string;
  displayName: string;
  email: string;
  employeeId?: string | null;
  invitedAt?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  role: StaffManagedRole;
  workshopId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("profiles").upsert(
    {
      email: normalizeStaffEmail(input.email),
      employee_id: input.employeeId ?? null,
      full_name: normalizeStaffText(input.displayName) || null,
      id: input.authUserId,
      invited_at: input.invitedAt ?? null,
      is_active: input.isActive,
      last_login_at: input.lastLoginAt ?? null,
      role: input.role,
      updated_at: new Date().toISOString(),
      workshop_id: input.workshopId ?? null,
    } as never,
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(`Unable to save user profile: ${error.message}`);
  }
}

export async function setStaffProfileActive(
  authUserId: string,
  isActive: boolean
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", authUserId);

  if (error) {
    throw new Error(`Unable to update linked profile: ${error.message}`);
  }
}

export async function generateStaffAccessLink(input: {
  authUserId?: string | null;
  displayName: string;
  email: string;
  kind: StaffAccessEmailKind;
  locale: AppLocale;
  nextPath?: string | null;
}) {
  const email = normalizeStaffEmail(input.email);
  const displayName = normalizeStaffText(input.displayName);

  if (!email) {
    throw new StaffAccountError("email_required");
  }

  const nextPath =
    safeAdminPath(input.nextPath) ||
    getRoleDashboardPath(input.locale, "employee");
  const tokenType: StaffTokenType = input.authUserId ? "recovery" : "invite";
  const supabase = getSupabaseAdmin();
  const { data, error } =
    tokenType === "invite"
      ? await supabase.auth.admin.generateLink({
          email,
          options: {
            data: {
              full_name: displayName,
            },
          },
          type: "invite",
        })
      : await supabase.auth.admin.generateLink({
          email,
          type: "recovery",
        });

  if (error || !data.user || !data.properties?.hashed_token) {
    throw new Error(
      `Unable to generate managed access link: ${
        error?.message ?? "missing_hashed_token"
      }`
    );
  }

  const callbackPath = buildStaffAuthCallbackPath({
    kind: input.kind,
    locale: input.locale,
    nextPath,
    tokenHash: data.properties.hashed_token,
    tokenType,
  });
  const redactedCallbackPath = buildStaffAuthCallbackPath({
    kind: input.kind,
    locale: input.locale,
    nextPath,
    tokenHash: "REDACTED",
    tokenType,
  });

  return {
    authUser: data.user,
    callbackPath,
    callbackUrl: buildStaffAuthCallbackUrl(callbackPath),
    createdAuthUser: tokenType === "invite",
    redactedCallbackPath,
    redactedCallbackUrl: buildStaffAuthCallbackUrl(redactedCallbackPath),
    tokenType,
  } satisfies StaffAccessLinkResult;
}

export async function sendStaffAccessEmail(
  input: StaffAccessEmailInput
): Promise<EmailDispatchResult> {
  const email = buildStaffAccessEmail({
    callbackUrl: input.callbackUrl,
    displayName: input.displayName,
    kind: input.kind,
  });
  const redactedEmail = buildStaffAccessEmail({
    callbackUrl: input.redactedCallbackUrl,
    displayName: input.displayName,
    kind: input.kind,
  });
  const result = await sendTransactionalEmail({
    html: email.html,
    logHtml: redactedEmail.html,
    logMetadata: {
      authUserId: input.authUserId,
      employeeId: input.employeeId ?? null,
      kind: input.metadataKind,
      role: input.role,
    },
    logText: redactedEmail.text,
    metadata: {
      authUserId: input.authUserId,
      employeeId: input.employeeId ?? null,
      kind: input.metadataKind,
      role: input.role,
    },
    recipientEmail: normalizeStaffEmail(input.recipientEmail),
    subject: email.subject,
    text: email.text,
  });

  await createAuditLog({
    action:
      input.kind === "invite"
        ? "staff_access_invite_sent"
        : "staff_access_password_reset_sent",
    actorEmail: input.actorEmail ?? null,
    metadata: {
      authUserId: input.authUserId,
      delivered: result.delivered,
      employeeId: input.employeeId ?? null,
      fallback: result.fallback,
      kind: input.metadataKind,
      provider: result.provider,
      status: result.status,
    },
  });

  return result;
}

export function resolveStaffAccountStatus(
  input: ResolveStaffAccountStatusInput
): StaffAccountStatus {
  const normalizedEmployeeEmail = normalizeStaffEmail(input.employeeEmail);

  if (!normalizedEmployeeEmail || !input.authUser || !input.isLinked || !input.profile) {
    return "missing_auth_user";
  }

  if (!input.employeeIsActive || !input.profile.is_active) {
    return "disabled";
  }

  if (input.authUser.last_sign_in_at) {
    return "active";
  }

  return "invited";
}

export async function logStaffAccountIssue(input: {
  action: string;
  actorEmail?: string | null;
  metadata?: Json;
}) {
  await createAuditLog({
    action: input.action,
    actorEmail: input.actorEmail ?? null,
    metadata: input.metadata ?? {},
  });
}
