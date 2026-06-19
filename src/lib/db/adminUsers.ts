import "server-only";

import { randomBytes } from "node:crypto";

import type { User } from "@supabase/supabase-js";

import { sendTransactionalEmail } from "@/lib/email/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { createAuditLog } from "./auditLogs";
import { getSiteBaseUrl } from "./siteSettings";

export type ManagedAdminRole =
  | "super_admin"
  | "admin"
  | "employee"
  | "viewer";

export type ManagedAdminUserRecord = {
  createdAt: string;
  deletedAt: string;
  displayName: string;
  email: string;
  id: string;
  invitedAt: string;
  isActive: boolean;
  lastLoginAt: string;
  role: ManagedAdminRole;
};

export type ManagedAdminUserInput = {
  displayName: string;
  email: string;
  isActive: boolean;
  role: ManagedAdminRole;
};

type ManagedProfileRow = {
  created_at: string;
  deleted_at: string | null;
  email: string | null;
  full_name: string | null;
  id: string;
  invited_at: string | null;
  is_active: boolean;
  last_login_at: string | null;
  role: ManagedAdminRole | null;
  updated_at: string;
};

type ManagedProfilesClient = ReturnType<typeof createSupabaseAdminClient> & {
  from: (table: "profiles") => {
    select: (columns: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean }
      ) => Promise<{
        data: ManagedProfileRow[] | null;
        error: { message: string } | null;
      }>;
    };
    update: (
      value: Record<string, unknown>
    ) => {
      eq: (column: string, value: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
    upsert: (
      value: Record<string, unknown>,
      options: { onConflict: string }
    ) => Promise<{
      error: { message: string } | null;
    }>;
  };
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeRole(value: string | null | undefined): ManagedAdminRole {
  if (
    value === "super_admin" ||
    value === "admin" ||
    value === "employee" ||
    value === "viewer"
  ) {
    return value;
  }

  return "employee";
}

function buildRedirectToPath() {
  return `${getSiteBaseUrl()}/de/admin/login`;
}

function getManagedProfilesClient() {
  return createSupabaseAdminClient() as unknown as ManagedProfilesClient;
}

async function listAllAuthUsers() {
  const supabase = createSupabaseAdminClient();
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

async function sendAdminAccessEmail(input: {
  actionLink: string;
  displayName: string;
  email: string;
  type: "invite" | "recovery";
}) {
  const isInvite = input.type === "invite";
  const subject = isInvite
    ? "Einladung zum GoldHelwah Adminbereich"
    : "Passwort-Link fuer den GoldHelwah Adminbereich";
  const text = [
    `Guten Tag ${input.displayName || input.email},`,
    "",
    isInvite
      ? "Sie wurden zum GoldHelwah Adminbereich eingeladen."
      : "Hier ist Ihr neuer Link zum Zuruecksetzen des Passworts fuer den GoldHelwah Adminbereich.",
    "",
    "Link:",
    input.actionLink,
    "",
    "Wenn Sie diese Nachricht nicht erwartet haben, ignorieren Sie sie bitte.",
  ].join("\n");

  return sendTransactionalEmail({
    metadata: {
      email: input.email,
      kind: isInvite ? "admin_user_invite" : "admin_user_recovery",
    },
    recipientEmail: input.email,
    subject,
    text,
  });
}

async function upsertManagedProfile(input: {
  authUserId: string;
  deletedAt?: string | null;
  displayName: string;
  email: string;
  invitedAt?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  role: ManagedAdminRole;
}) {
  const supabase = getManagedProfilesClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      deleted_at: input.deletedAt ?? null,
      email: normalizeEmail(input.email),
      full_name: normalizeText(input.displayName) || null,
      id: input.authUserId,
      invited_at: input.invitedAt ?? null,
      is_active: input.isActive,
      last_login_at: input.lastLoginAt ?? null,
      role: input.role,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(`Unable to save user profile: ${error.message}`);
  }
}

export async function listManagedAdminUsers(): Promise<ManagedAdminUserRecord[]> {
  const supabase = getManagedProfilesClient();
  const [{ data: profiles, error: profilesError }, authUsers] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    listAllAuthUsers(),
  ]);

  if (profilesError) {
    throw new Error(`Unable to load user profiles: ${profilesError.message}`);
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile] as const)
  );

  const authBackedUsers = authUsers.map((authUser) => {
    const profile = profileById.get(authUser.id);
    return {
      createdAt: profile?.created_at ?? authUser.created_at ?? "",
      deletedAt:
        typeof profile?.deleted_at === "string" ? profile.deleted_at : "",
      displayName:
        profile?.full_name ??
        (typeof authUser.user_metadata.full_name === "string"
          ? authUser.user_metadata.full_name
          : null) ??
        authUser.email ??
        "",
      email: profile?.email ?? authUser.email ?? "",
      id: authUser.id,
      invitedAt:
        typeof profile?.invited_at === "string" ? profile.invited_at : "",
      isActive: profile?.is_active ?? true,
      lastLoginAt:
        typeof profile?.last_login_at === "string"
          ? profile.last_login_at
          : authUser.last_sign_in_at ?? "",
      role: normalizeRole(profile?.role),
    } satisfies ManagedAdminUserRecord;
  });

  const authUserIds = new Set(authBackedUsers.map((user) => user.id));
  const profileOnlyUsers = (profiles ?? [])
    .filter((profile) => !authUserIds.has(profile.id))
    .map((profile) => ({
      createdAt: profile.created_at,
      deletedAt:
        typeof profile.deleted_at === "string" ? profile.deleted_at : "",
      displayName: profile.full_name ?? profile.email ?? "",
      email: profile.email ?? "",
      id: profile.id,
      invitedAt:
        typeof profile.invited_at === "string" ? profile.invited_at : "",
      isActive: profile.is_active,
      lastLoginAt:
        typeof profile.last_login_at === "string" ? profile.last_login_at : "",
      role: normalizeRole(profile.role),
    }));

  return [...authBackedUsers, ...profileOnlyUsers].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export async function createManagedAdminUser(
  actorEmail: string,
  input: ManagedAdminUserInput
) {
  const supabase = getManagedProfilesClient();
  const normalizedEmail = normalizeEmail(input.email);
  const displayName = normalizeText(input.displayName);

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    email: normalizedEmail,
    options: {
      data: {
        full_name: displayName,
      },
      redirectTo: buildRedirectToPath(),
    },
    type: "invite",
  });

  if (linkError || !linkData.user || !linkData.properties.action_link) {
    throw new Error(
      `Unable to create invited admin user: ${linkError?.message ?? "missing_invite_link"}`
    );
  }

  await upsertManagedProfile({
    authUserId: linkData.user.id,
    displayName,
    email: normalizedEmail,
    invitedAt: new Date().toISOString(),
    isActive: input.isActive,
    role: input.role,
  });

  const emailResult = await sendAdminAccessEmail({
    actionLink: linkData.properties.action_link,
    displayName,
    email: normalizedEmail,
    type: "invite",
  });

  await createAuditLog({
    action: "admin_user_created",
    actorEmail,
    metadata: {
      email: normalizedEmail,
      inviteFallback: emailResult.fallback,
      inviteSent: emailResult.delivered,
      role: input.role,
      userId: linkData.user.id,
    },
  });

  return {
    emailResult,
    userId: linkData.user.id,
  };
}

export async function updateManagedAdminUser(
  actorEmail: string,
  userId: string,
  input: ManagedAdminUserInput
) {
  const supabase = getManagedProfilesClient();
  const normalizedEmail = normalizeEmail(input.email);
  const displayName = normalizeText(input.displayName);
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    email: normalizedEmail,
    user_metadata: {
      full_name: displayName,
    },
  });

  if (authError) {
    throw new Error(`Unable to update auth user: ${authError.message}`);
  }

  await upsertManagedProfile({
    authUserId: userId,
    displayName,
    email: normalizedEmail,
    isActive: input.isActive,
    role: input.role,
  });

  await createAuditLog({
    action: "admin_user_updated",
    actorEmail,
    metadata: {
      email: normalizedEmail,
      role: input.role,
      userId,
    },
  });
}

export async function resendManagedAdminInvite(
  actorEmail: string,
  userId: string,
  email: string,
  displayName: string,
  role: ManagedAdminRole
) {
  const supabase = getManagedProfilesClient();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.admin.generateLink({
    email: normalizedEmail,
    options: {
      redirectTo: buildRedirectToPath(),
    },
    type: "recovery",
  });

  if (error || !data.properties.action_link) {
    throw new Error(
      `Unable to generate recovery link: ${error?.message ?? "missing_recovery_link"}`
    );
  }

  const emailResult = await sendAdminAccessEmail({
    actionLink: data.properties.action_link,
    displayName: normalizeText(displayName),
    email: normalizedEmail,
    type: "recovery",
  });

  await upsertManagedProfile({
    authUserId: userId,
    displayName: normalizeText(displayName),
    email: normalizedEmail,
    invitedAt: new Date().toISOString(),
    isActive: true,
    role,
  });

  await createAuditLog({
    action: "admin_user_recovery_sent",
    actorEmail,
    metadata: {
      email: normalizedEmail,
      inviteFallback: emailResult.fallback,
      inviteSent: emailResult.delivered,
      userId,
    },
  });

  return emailResult;
}

export async function setManagedAdminUserActive(
  actorEmail: string,
  userId: string,
  isActive: boolean
) {
  const supabase = getManagedProfilesClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Unable to update user activity: ${error.message}`);
  }

  await createAuditLog({
    action: isActive ? "admin_user_activated" : "admin_user_deactivated",
    actorEmail,
    metadata: {
      isActive,
      userId,
    },
  });
}

export async function deleteManagedAdminUser(
  actorEmail: string,
  userId: string
) {
  const supabase = getManagedProfilesClient();
  const now = new Date().toISOString();
  const [{ error: authError }, { error: profileError }] = await Promise.all([
    supabase.auth.admin.deleteUser(userId, true),
    supabase
      .from("profiles")
      .update({
        deleted_at: now,
        is_active: false,
        updated_at: now,
      })
      .eq("id", userId),
  ]);

  if (authError) {
    throw new Error(`Unable to delete auth user: ${authError.message}`);
  }

  if (profileError) {
    throw new Error(`Unable to archive user profile: ${profileError.message}`);
  }

  await createAuditLog({
    action: "admin_user_deleted",
    actorEmail,
    metadata: {
      userId,
    },
  });
}

export function createTemporaryPassword() {
  return randomBytes(18).toString("base64url");
}
