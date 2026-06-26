import "server-only";

import { getDecoyManagedUsers } from "@/lib/admin/decoyData";
import type { AppLocale } from "@/i18n/routing";
import {
  generateStaffAccessLink,
  listAllAuthUsers,
  normalizeStaffEmail,
  normalizeStaffText,
  sendStaffAccessEmail,
  setStaffProfileActive,
  type StaffProfileRow,
  upsertStaffProfile,
} from "@/lib/admin/staffAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import type { AdminRole } from "@/types/admin";

import { createAuditLog } from "./auditLogs";

export type ManagedAdminRole = AdminRole;

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

type ManagedProfileRow = StaffProfileRow & {
  deleted_at: string | null;
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

function normalizeRole(value: string | null | undefined): ManagedAdminRole {
  if (value === "super_admin" || value === "admin" || value === "employee") {
    return value;
  }

  return "employee";
}

function getManagedProfilesClient() {
  return createSupabaseAdminClient() as unknown as ManagedProfilesClient;
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
  await upsertStaffProfile({
    authUserId: input.authUserId,
    displayName: input.displayName,
    email: input.email,
    invitedAt: input.invitedAt,
    isActive: input.isActive,
    lastLoginAt: input.lastLoginAt,
    role: input.role,
  });

  if (input.deletedAt !== undefined) {
    const supabase = getManagedProfilesClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        deleted_at: input.deletedAt ?? null,
      })
      .eq("id", input.authUserId);

    if (error) {
      throw new Error(`Unable to archive user profile: ${error.message}`);
    }
  }
}

export async function listManagedAdminUsers(): Promise<ManagedAdminUserRecord[]> {
  if (await isAdminDecoyEnabled()) {
    return getDecoyManagedUsers();
  }

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
  locale: AppLocale,
  input: ManagedAdminUserInput
) {
  const normalizedEmail = normalizeStaffEmail(input.email);
  const displayName = normalizeStaffText(input.displayName);
  const accessLink = await generateStaffAccessLink({
    displayName,
    email: normalizedEmail,
    kind: "invite",
    locale,
  });

  await upsertManagedProfile({
    authUserId: accessLink.authUser.id,
    displayName,
    email: normalizedEmail,
    invitedAt: new Date().toISOString(),
    isActive: input.isActive,
    role: input.role,
  });

  const emailResult = await sendStaffAccessEmail({
    actorEmail,
    authUserId: accessLink.authUser.id,
    callbackUrl: accessLink.callbackUrl,
    displayName,
    kind: "invite",
    metadataKind: "admin_user_invite",
    recipientEmail: normalizedEmail,
    redactedCallbackUrl: accessLink.redactedCallbackUrl,
    role: input.role,
  });

  await createAuditLog({
    action: "admin_user_created",
    actorEmail,
    metadata: {
      email: normalizedEmail,
      inviteFallback: emailResult.fallback,
      inviteSent: emailResult.delivered,
      role: input.role,
      userId: accessLink.authUser.id,
    },
  });

  return {
    emailResult,
    userId: accessLink.authUser.id,
  };
}

export async function updateManagedAdminUser(
  actorEmail: string,
  userId: string,
  input: ManagedAdminUserInput
) {
  const supabase = getManagedProfilesClient();
  const normalizedEmail = normalizeStaffEmail(input.email);
  const displayName = normalizeStaffText(input.displayName);
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
  locale: AppLocale,
  userId: string,
  email: string,
  displayName: string,
  role: ManagedAdminRole
) {
  const normalizedEmail = normalizeStaffEmail(email);
  const normalizedDisplayName = normalizeStaffText(displayName);
  const accessLink = await generateStaffAccessLink({
    authUserId: userId,
    displayName: normalizedDisplayName,
    email: normalizedEmail,
    kind: "invite",
    locale,
  });
  const emailResult = await sendStaffAccessEmail({
    actorEmail,
    authUserId: userId,
    callbackUrl: accessLink.callbackUrl,
    displayName: normalizedDisplayName,
    kind: "invite",
    metadataKind: "admin_user_invite",
    recipientEmail: normalizedEmail,
    redactedCallbackUrl: accessLink.redactedCallbackUrl,
    role,
  });

  await upsertManagedProfile({
    authUserId: userId,
    displayName: normalizedDisplayName,
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

export async function sendManagedAdminPasswordReset(
  actorEmail: string,
  locale: AppLocale,
  userId: string,
  email: string,
  displayName: string,
  role: ManagedAdminRole
) {
  const normalizedEmail = normalizeStaffEmail(email);
  const normalizedDisplayName = normalizeStaffText(displayName);
  const accessLink = await generateStaffAccessLink({
    authUserId: userId,
    displayName: normalizedDisplayName,
    email: normalizedEmail,
    kind: "password_reset",
    locale,
  });
  const emailResult = await sendStaffAccessEmail({
    actorEmail,
    authUserId: userId,
    callbackUrl: accessLink.callbackUrl,
    displayName: normalizedDisplayName,
    kind: "password_reset",
    metadataKind: "admin_user_password_reset",
    recipientEmail: normalizedEmail,
    redactedCallbackUrl: accessLink.redactedCallbackUrl,
    role,
  });

  await createAuditLog({
    action: "admin_user_password_reset_sent",
    actorEmail,
    metadata: {
      email: normalizedEmail,
      resetFallback: emailResult.fallback,
      resetSent: emailResult.delivered,
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
  await setStaffProfileActive(userId, isActive);

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
