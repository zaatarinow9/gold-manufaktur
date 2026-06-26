import "server-only";

import { z } from "zod";
import type { User } from "@supabase/supabase-js";

import type { AppLocale } from "@/i18n/routing";
import {
  findAuthUserByEmail,
  generateStaffAccessLink,
  getAuthUserById,
  getStaffProfilesByEmails,
  getStaffProfilesByIds,
  listAllAuthUsers,
  normalizeStaffEmail,
  normalizeStaffText,
  resolveStaffAccountStatus,
  sendStaffAccessEmail,
  setStaffProfileActive,
  StaffAccountError,
  type StaffAccessLinkResult,
  type StaffAccountStatus,
  type StaffProfileRow,
  upsertStaffProfile,
} from "@/lib/admin/staffAuth";
import { getRoleDashboardPath } from "@/lib/admin/roleAccess";
import { createAuditLog } from "@/lib/db/auditLogs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TableInsert, TableRow, TableUpdate } from "@/lib/supabase/types";
import type { AdminUser } from "@/types/admin";

import type { AdminViewer } from "./adminScope";
import { getScopedEmployees, type EmployeeRecord } from "./employees";

const employeeAccountInputSchema = z.object({
  attendanceStatus: z
    .enum(["present", "absent", "vacation", "sick", "late"])
    .default("present"),
  email: z.string().trim().email().or(z.literal("")).default(""),
  fullName: z.string().trim().min(1).max(160),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(4000).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
  role: z.enum(["employee"]).default("employee"),
  shiftLabel: z.string().trim().max(120).optional().default(""),
  workshopId: z.string().uuid(),
});

const employeeAccountUpdateSchema = employeeAccountInputSchema.extend({
  id: z.string().uuid(),
});

type EmployeeRow = TableRow<"employees">;

export type EmployeeAccountInput = z.infer<typeof employeeAccountInputSchema>;
export type EmployeeAccountUpdateInput = z.infer<
  typeof employeeAccountUpdateSchema
>;

type EnsureEmployeeAuthLinkResult = {
  authUser: User;
  linkResult: StaffAccessLinkResult | null;
  profile: StaffProfileRow | null;
};

export type EmployeeAccountRecord = EmployeeRecord & {
  accountStatus: StaffAccountStatus;
  authUserId: string | null;
  canLinkAccount: boolean;
  lastInviteSentAt: string;
  lastLoginAt: string;
  lastPasswordResetSentAt: string;
  linkedAccountEmail: string;
};

function getAdminSupabase() {
  return createSupabaseAdminClient();
}

function nullableText(value: string) {
  const normalized = normalizeStaffText(value);
  return normalized.length > 0 ? normalized : null;
}

function toEmployeeWriteRow(
  input: z.infer<typeof employeeAccountInputSchema> &
    Partial<Pick<EmployeeRow, "profile_id">>
) {
  return {
    attendance_status: input.attendanceStatus,
    email: nullableText(input.email),
    full_name: normalizeStaffText(input.fullName),
    is_active: input.isActive,
    notes: nullableText(input.notes ?? ""),
    phone: nullableText(input.phone ?? ""),
    profile_id: input.profile_id ?? null,
    role: "employee",
    shift_label: nullableText(input.shiftLabel ?? ""),
    workshop_id: input.workshopId,
  } satisfies TableInsert<"employees"> | TableUpdate<"employees">;
}

function assertCanManageEmployee(actor: Pick<AdminUser, "role">) {
  if (actor.role !== "super_admin" && actor.role !== "admin") {
    throw new StaffAccountError("role_not_allowed");
  }
}

async function getEmployeeRowById(employeeId: string) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load employee: ${error.message}`);
  }

  if (!data) {
    throw new StaffAccountError("employee_not_found");
  }

  return data;
}

async function findEmployeeByEmail(email: string, excludeEmployeeId?: string) {
  const normalizedEmail = normalizeStaffEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const supabase = getAdminSupabase();
  const query = supabase
    .from("employees")
    .select("*")
    .eq("email", normalizedEmail)
    .limit(2);
  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to validate employee email: ${error.message}`);
  }

  return (
    (data ?? []).find((employee) => employee.id !== excludeEmployeeId) ?? null
  );
}

async function findEmployeeByAuthUserId(
  authUserId: string,
  excludeEmployeeId?: string
) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("profile_id", authUserId)
    .limit(2);

  if (error) {
    throw new Error(`Unable to validate linked employee account: ${error.message}`);
  }

  return (
    (data ?? []).find((employee) => employee.id !== excludeEmployeeId) ?? null
  );
}

async function updateEmployeeLink(
  employeeId: string,
  input: {
    email?: string | null;
    fullName?: string;
    isActive?: boolean;
    profileId?: string | null;
    workshopId?: string | null;
  }
) {
  const supabase = getAdminSupabase();
  const update: Partial<TableUpdate<"employees">> = {};

  if (input.email !== undefined) {
    update.email = input.email ? normalizeStaffEmail(input.email) : null;
  }

  if (input.fullName !== undefined) {
    update.full_name = normalizeStaffText(input.fullName);
  }

  if (input.isActive !== undefined) {
    update.is_active = input.isActive;
  }

  if (input.profileId !== undefined) {
    update.profile_id = input.profileId;
  }

  if (input.workshopId !== undefined) {
    update.workshop_id = input.workshopId;
  }

  const { error } = await supabase
    .from("employees")
    .update(update as never)
    .eq("id", employeeId);

  if (error) {
    throw new Error(`Unable to update linked employee record: ${error.message}`);
  }
}

async function createEmployeeRow(
  input: z.infer<typeof employeeAccountInputSchema>
) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("employees")
    .insert(toEmployeeWriteRow(input) as TableInsert<"employees">)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Unable to create employee: ${error?.message ?? "unknown_error"}`);
  }

  return data;
}

async function updateEmployeeRow(
  input: z.infer<typeof employeeAccountUpdateSchema>
) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("employees")
    .update(toEmployeeWriteRow(input) as TableUpdate<"employees">)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Unable to update employee: ${error?.message ?? "unknown_error"}`);
  }

  return data;
}

async function setEmployeeRowActive(employeeId: string, isActive: boolean) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: isActive } as never)
    .eq("id", employeeId);

  if (error) {
    throw new Error(`Unable to update employee status: ${error.message}`);
  }
}

async function deleteEmployeeRow(employeeId: string) {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);

  if (error) {
    throw new Error(`Unable to rollback employee: ${error.message}`);
  }
}

async function updateLinkedAuthUser(input: {
  authUserId: string;
  displayName: string;
  email: string;
}) {
  const supabase = getAdminSupabase();
  const { error } = await supabase.auth.admin.updateUserById(input.authUserId, {
    email: normalizeStaffEmail(input.email),
    user_metadata: {
      full_name: normalizeStaffText(input.displayName),
    },
  });

  if (error) {
    throw new Error(`Unable to update auth user: ${error.message}`);
  }
}

async function deleteAuthUserQuietly(authUserId: string) {
  try {
    const supabase = getAdminSupabase();
    await supabase.auth.admin.deleteUser(authUserId);
  } catch {
    // Ignore rollback cleanup failures and surface the original error instead.
  }
}

async function assertEmailIsAvailable(email: string, excludeEmployeeId?: string) {
  const duplicateEmployee = await findEmployeeByEmail(email, excludeEmployeeId);

  if (duplicateEmployee) {
    throw new StaffAccountError("duplicate_email");
  }
}

async function assertLinkTargetIsAvailable(input: {
  authUser: User;
  employeeId?: string;
}) {
  const [linkedEmployee, profiles] = await Promise.all([
    findEmployeeByAuthUserId(input.authUser.id, input.employeeId),
    getStaffProfilesByIds([input.authUser.id]),
  ]);
  const profile = profiles[0] ?? null;

  if (linkedEmployee) {
    throw new StaffAccountError("link_in_use");
  }

  if (profile?.employee_id && profile.employee_id !== input.employeeId) {
    throw new StaffAccountError("link_in_use");
  }

  if (profile?.role && profile.role !== "employee") {
    throw new StaffAccountError("account_role_conflict");
  }

  return profile;
}

async function ensureEmployeeAuthLink(input: {
  createIfMissing: boolean;
  employee: EmployeeRow;
  locale: AppLocale;
  precreatedLink?: StaffAccessLinkResult | null;
}) {
  const normalizedEmail = normalizeStaffEmail(input.employee.email ?? "");

  if (!normalizedEmail) {
    throw new StaffAccountError("email_required");
  }

  let authUser =
    input.precreatedLink?.authUser ??
    (input.employee.profile_id
      ? await getAuthUserById(input.employee.profile_id)
      : null);

  if (!authUser) {
    authUser = await findAuthUserByEmail(normalizedEmail);
  }

  if (!authUser && !input.createIfMissing) {
    throw new StaffAccountError("account_not_linked");
  }

  let profile: StaffProfileRow | null = null;
  let linkResult = input.precreatedLink ?? null;

  if (authUser) {
    profile = await assertLinkTargetIsAvailable({
      authUser,
      employeeId: input.employee.id,
    });
  } else {
    linkResult = await generateStaffAccessLink({
      displayName: input.employee.full_name,
      email: normalizedEmail,
      kind: "invite",
      locale: input.locale,
      nextPath: getRoleDashboardPath(input.locale, "employee"),
    });
    authUser = linkResult.authUser;
  }

  await upsertStaffProfile({
    authUserId: authUser.id,
    displayName: input.employee.full_name,
    email: normalizedEmail,
    employeeId: input.employee.id,
    invitedAt:
      linkResult?.createdAuthUser === true
        ? new Date().toISOString()
        : profile?.invited_at ?? null,
    isActive: input.employee.is_active,
    lastLoginAt: authUser.last_sign_in_at ?? profile?.last_login_at ?? null,
    role: "employee",
    workshopId: input.employee.workshop_id ?? null,
  });

  await updateEmployeeLink(input.employee.id, {
    email: normalizedEmail,
    fullName: input.employee.full_name,
    isActive: input.employee.is_active,
    profileId: authUser.id,
    workshopId: input.employee.workshop_id ?? null,
  });

  return {
    authUser,
    linkResult,
    profile,
  } satisfies EnsureEmployeeAuthLinkResult;
}

function mapAuthUsersByEmail(users: User[]) {
  return new Map(
    users
      .map((user) => [normalizeStaffEmail(user.email ?? ""), user] as const)
      .filter(([email]) => email.length > 0)
  );
}

function mapProfilesByEmail(profiles: StaffProfileRow[]) {
  return new Map(
    profiles
      .map((profile) => [normalizeStaffEmail(profile.email ?? ""), profile] as const)
      .filter(([email]) => email.length > 0)
  );
}

export async function getScopedEmployeeAccounts(
  viewer: AdminViewer
): Promise<EmployeeAccountRecord[]> {
  const employees = await getScopedEmployees(viewer);
  const profileIds = employees
    .map((employee) => employee.profileId ?? "")
    .filter((value) => value.length > 0);
  const emails = employees
    .map((employee) => employee.email)
    .filter((value) => normalizeStaffEmail(value).length > 0);
  const [authUsers, linkedProfiles, emailProfiles] = await Promise.all([
    listAllAuthUsers().catch((error) => {
      console.error(
        `[employeeAccounts] Unable to load auth users: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [] as User[];
    }),
    getStaffProfilesByIds(profileIds).catch((error) => {
      console.error(
        `[employeeAccounts] Unable to load linked profiles: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [] as StaffProfileRow[];
    }),
    getStaffProfilesByEmails(emails).catch((error) => {
      console.error(
        `[employeeAccounts] Unable to load profiles by email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [] as StaffProfileRow[];
    }),
  ]);
  const authUserById = new Map(authUsers.map((user) => [user.id, user] as const));
  const authUserByEmail = mapAuthUsersByEmail(authUsers);
  const profileById = new Map(linkedProfiles.map((profile) => [profile.id, profile] as const));
  const profileByEmail = mapProfilesByEmail(emailProfiles);

  return employees.map((employee) => {
    const normalizedEmail = normalizeStaffEmail(employee.email);
    const linkedAuthUser = employee.profileId
      ? authUserById.get(employee.profileId) ?? null
      : null;
    const candidateAuthUser =
      linkedAuthUser ?? authUserByEmail.get(normalizedEmail) ?? null;
    const linkedProfile = employee.profileId
      ? profileById.get(employee.profileId) ?? null
      : null;
    const candidateProfile =
      linkedProfile ?? profileByEmail.get(normalizedEmail) ?? null;
    const isLinked =
      Boolean(employee.profileId) &&
      Boolean(candidateAuthUser) &&
      Boolean(candidateProfile) &&
      candidateAuthUser?.id === employee.profileId &&
      candidateProfile?.id === employee.profileId &&
      candidateProfile?.employee_id === employee.id;
    const accountStatus = resolveStaffAccountStatus({
      authUser: candidateAuthUser,
      employeeEmail: employee.email,
      employeeIsActive: employee.isActive,
      isLinked,
      profile: candidateProfile,
    });

    return {
      ...employee,
      accountStatus,
      authUserId: candidateAuthUser?.id ?? employee.profileId ?? null,
      canLinkAccount:
        Boolean(candidateAuthUser) &&
        (!isLinked || !employee.profileId || candidateProfile?.employee_id !== employee.id),
      lastInviteSentAt:
        candidateProfile?.invited_at ??
        candidateAuthUser?.invited_at ??
        candidateAuthUser?.confirmation_sent_at ??
        "",
      lastLoginAt:
        candidateAuthUser?.last_sign_in_at ??
        candidateProfile?.last_login_at ??
        "",
      lastPasswordResetSentAt: candidateAuthUser?.recovery_sent_at ?? "",
      linkedAccountEmail:
        candidateAuthUser?.email ?? candidateProfile?.email ?? employee.email,
    };
  });
}

export async function createEmployeeWithAccount(input: {
  actor: Pick<AdminUser, "email" | "role">;
  locale: AppLocale;
  values: z.infer<typeof employeeAccountInputSchema>;
}) {
  assertCanManageEmployee(input.actor);

  if (input.values.role !== "employee") {
    throw new StaffAccountError("role_not_allowed");
  }

  const normalizedEmail = normalizeStaffEmail(input.values.email);

  if (!normalizedEmail) {
    throw new StaffAccountError("email_required");
  }

  await assertEmailIsAvailable(normalizedEmail);

  const existingAuthUser = await findAuthUserByEmail(normalizedEmail);
  let precreatedLink: StaffAccessLinkResult | null = null;
  let authUser = existingAuthUser;
  let createdAuthUserId = "";
  let createdEmployeeId = "";

  if (authUser) {
    await assertLinkTargetIsAvailable({ authUser });
  } else {
    precreatedLink = await generateStaffAccessLink({
      displayName: input.values.fullName,
      email: normalizedEmail,
      kind: "invite",
      locale: input.locale,
      nextPath: getRoleDashboardPath(input.locale, "employee"),
    });
    authUser = precreatedLink.authUser;
    createdAuthUserId = authUser.id;
  }

  try {
    const employee = await createEmployeeRow({
      ...input.values,
      email: normalizedEmail,
    });
    createdEmployeeId = employee.id;
    const ensuredLink = await ensureEmployeeAuthLink({
      createIfMissing: false,
      employee,
      locale: input.locale,
      precreatedLink,
    });
    const accessLink =
      ensuredLink.linkResult ??
      (await generateStaffAccessLink({
        authUserId: ensuredLink.authUser.id,
        displayName: employee.full_name,
        email: normalizedEmail,
        kind: "invite",
        locale: input.locale,
        nextPath: getRoleDashboardPath(input.locale, "employee"),
      }));
    const emailResult = await sendStaffAccessEmail({
      actorEmail: input.actor.email,
      authUserId: ensuredLink.authUser.id,
      callbackUrl: accessLink.callbackUrl,
      displayName: employee.full_name,
      employeeId: employee.id,
      kind: "invite",
      metadataKind: "employee_invite",
      recipientEmail: normalizedEmail,
      redactedCallbackUrl: accessLink.redactedCallbackUrl,
      role: "employee",
    });

    await createAuditLog({
      action: "employee_account_created",
      actorEmail: input.actor.email,
      metadata: {
        authUserId: ensuredLink.authUser.id,
        email: normalizedEmail,
        employeeId: employee.id,
        inviteStatus: emailResult.status,
      },
    });

    return {
      authUserId: ensuredLink.authUser.id,
      emailResult,
      employeeId: employee.id,
    };
  } catch (error) {
    if (createdEmployeeId) {
      await deleteEmployeeRow(createdEmployeeId).catch(() => {});
    }

    if (createdAuthUserId) {
      await deleteAuthUserQuietly(createdAuthUserId);
    }

    throw error;
  }
}

export async function updateEmployeeWithAccount(input: {
  actor: Pick<AdminUser, "email" | "role">;
  values: z.infer<typeof employeeAccountUpdateSchema>;
}) {
  assertCanManageEmployee(input.actor);

  const currentEmployee = await getEmployeeRowById(input.values.id);
  const normalizedEmail = normalizeStaffEmail(input.values.email);

  if (normalizedEmail) {
    await assertEmailIsAvailable(normalizedEmail, currentEmployee.id);
  }

  if (currentEmployee.profile_id && !normalizedEmail) {
    throw new StaffAccountError("email_required");
  }

  const updatedEmployee = await updateEmployeeRow({
    ...input.values,
    email: normalizedEmail,
  });

  if (updatedEmployee.profile_id) {
    await updateLinkedAuthUser({
      authUserId: updatedEmployee.profile_id,
      displayName: updatedEmployee.full_name,
      email: normalizedEmail,
    });
    await upsertStaffProfile({
      authUserId: updatedEmployee.profile_id,
      displayName: updatedEmployee.full_name,
      email: normalizedEmail,
      employeeId: updatedEmployee.id,
      isActive: updatedEmployee.is_active,
      role: "employee",
      workshopId: updatedEmployee.workshop_id ?? null,
    });
  }

  await createAuditLog({
    action: "employee_account_updated",
    actorEmail: input.actor.email,
    metadata: {
      employeeId: updatedEmployee.id,
      linkedAuthUserId: updatedEmployee.profile_id ?? null,
    },
  });

  return {
    employeeId: updatedEmployee.id,
  };
}

export async function linkEmployeeToExistingAuthUser(input: {
  actor: Pick<AdminUser, "email" | "role">;
  employeeId: string;
  locale: AppLocale;
}) {
  assertCanManageEmployee(input.actor);

  const employee = await getEmployeeRowById(input.employeeId);
  const result = await ensureEmployeeAuthLink({
    createIfMissing: false,
    employee,
    locale: input.locale,
  });

  await createAuditLog({
    action: "employee_account_linked",
    actorEmail: input.actor.email,
    metadata: {
      authUserId: result.authUser.id,
      employeeId: employee.id,
    },
  });

  return {
    authUserId: result.authUser.id,
    employeeId: employee.id,
  };
}

export async function sendEmployeeInvite(input: {
  actor: Pick<AdminUser, "email" | "role">;
  employeeId: string;
  locale: AppLocale;
}) {
  assertCanManageEmployee(input.actor);

  const employee = await getEmployeeRowById(input.employeeId);
  const normalizedEmail = normalizeStaffEmail(employee.email ?? "");

  if (!normalizedEmail) {
    throw new StaffAccountError("email_required");
  }

  const ensuredLink = await ensureEmployeeAuthLink({
    createIfMissing: true,
    employee,
    locale: input.locale,
  });
  const accessLink =
    ensuredLink.linkResult ??
    (await generateStaffAccessLink({
      authUserId: ensuredLink.authUser.id,
      displayName: employee.full_name,
      email: normalizedEmail,
      kind: "invite",
      locale: input.locale,
      nextPath: getRoleDashboardPath(input.locale, "employee"),
    }));
  const emailResult = await sendStaffAccessEmail({
    actorEmail: input.actor.email,
    authUserId: ensuredLink.authUser.id,
    callbackUrl: accessLink.callbackUrl,
    displayName: employee.full_name,
    employeeId: employee.id,
    kind: "invite",
    metadataKind: "employee_invite",
    recipientEmail: normalizedEmail,
    redactedCallbackUrl: accessLink.redactedCallbackUrl,
    role: "employee",
  });

  await createAuditLog({
    action: "employee_account_invite_sent",
    actorEmail: input.actor.email,
    metadata: {
      authUserId: ensuredLink.authUser.id,
      employeeId: employee.id,
      status: emailResult.status,
    },
  });

  return {
    authUserId: ensuredLink.authUser.id,
    emailResult,
    employeeId: employee.id,
  };
}

export async function sendEmployeePasswordReset(input: {
  actor: Pick<AdminUser, "email" | "role">;
  employeeId: string;
  locale: AppLocale;
}) {
  assertCanManageEmployee(input.actor);

  const employee = await getEmployeeRowById(input.employeeId);
  const normalizedEmail = normalizeStaffEmail(employee.email ?? "");

  if (!normalizedEmail) {
    throw new StaffAccountError("email_required");
  }

  const ensuredLink = await ensureEmployeeAuthLink({
    createIfMissing: false,
    employee,
    locale: input.locale,
  });
  const accessLink = await generateStaffAccessLink({
    authUserId: ensuredLink.authUser.id,
    displayName: employee.full_name,
    email: normalizedEmail,
    kind: "password_reset",
    locale: input.locale,
    nextPath: getRoleDashboardPath(input.locale, "employee"),
  });
  const emailResult = await sendStaffAccessEmail({
    actorEmail: input.actor.email,
    authUserId: ensuredLink.authUser.id,
    callbackUrl: accessLink.callbackUrl,
    displayName: employee.full_name,
    employeeId: employee.id,
    kind: "password_reset",
    metadataKind: "employee_password_reset",
    recipientEmail: normalizedEmail,
    redactedCallbackUrl: accessLink.redactedCallbackUrl,
    role: "employee",
  });

  await createAuditLog({
    action: "employee_account_password_reset_sent",
    actorEmail: input.actor.email,
    metadata: {
      authUserId: ensuredLink.authUser.id,
      employeeId: employee.id,
      status: emailResult.status,
    },
  });

  return {
    authUserId: ensuredLink.authUser.id,
    emailResult,
    employeeId: employee.id,
  };
}

export async function setEmployeeAccountActive(input: {
  actor: Pick<AdminUser, "email" | "role">;
  employeeId: string;
  isActive: boolean;
}) {
  assertCanManageEmployee(input.actor);

  const employee = await getEmployeeRowById(input.employeeId);
  await setEmployeeRowActive(employee.id, input.isActive);

  if (employee.profile_id) {
    await setStaffProfileActive(employee.profile_id, input.isActive);
  }

  await createAuditLog({
    action: input.isActive
      ? "employee_account_activated"
      : "employee_account_deactivated",
    actorEmail: input.actor.email,
    metadata: {
      employeeId: employee.id,
      linkedAuthUserId: employee.profile_id ?? null,
    },
  });

  return {
    employeeId: employee.id,
  };
}

export function parseEmployeeAccountInput(
  input: unknown,
  mode: "create"
): EmployeeAccountInput;
export function parseEmployeeAccountInput(
  input: unknown,
  mode: "update"
): EmployeeAccountUpdateInput;
export function parseEmployeeAccountInput(
  input: unknown,
  mode: "create" | "update"
) {
  return mode === "create"
    ? employeeAccountInputSchema.parse(input)
    : employeeAccountUpdateSchema.parse(input);
}
