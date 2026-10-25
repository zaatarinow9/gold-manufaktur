import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import type { AppLocale } from "@/i18n/routing";
import type { AdminRole, AdminUser } from "@/types/admin";

import { isAdminRole } from "./roleAccess";
import { createSupabaseAdminClient } from "../supabase/admin";
import { createSupabaseServerClient } from "../supabase/server";

type AdminAccessState = "anonymous" | "authenticated" | "denied";
export type AdminDeniedReason = "inactive" | "not_allowed" | "not_configured";

type AdminSessionContext = {
  authUserId: string | null;
  deniedReason: AdminDeniedReason | null;
  state: AdminAccessState;
  user: AdminUser | null;
};

const defaultShellUser: AdminUser = {
  id: "guest",
  name: "GoldHelwah Team",
  email: "",
  phone: "",
  role: "employee",
  avatarLabel: "GH",
  isActive: false,
};

function getAvatarLabel(name: string, email: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase() || "GH";
}

function buildAdminUser(
  authUser: User,
  profile: {
    avatar_url?: string | null;
    employee_id?: string | null;
    email: string | null;
    full_name: string | null;
    is_active: boolean;
    role: string | null;
    workshop_id?: string | null;
  }
): AdminUser {
  const email = profile.email ?? authUser.email ?? "";
  const name =
    profile.full_name ??
    (typeof authUser.user_metadata.full_name === "string"
      ? authUser.user_metadata.full_name
      : null) ??
    email ??
    "GoldHelwah Team";

  return {
    id: authUser.id,
    name,
    email,
    phone: authUser.phone ?? "",
    role: isAdminRole(profile.role) ? profile.role : "employee",
    avatarLabel: getAvatarLabel(name, email),
    avatarUrl: profile.avatar_url ?? undefined,
    isActive: profile.is_active,
    linkedEmployeeId: profile.employee_id ?? undefined,
    workshopId: profile.workshop_id ?? undefined,
  };
}

export const getAdminSessionContext = cache(async (): Promise<AdminSessionContext> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      authUserId: null,
      deniedReason: null,
      state: "anonymous",
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile) {
    console.error(
      `[admin-auth] Auth user ${authUser.id} (${authUser.email ?? "unknown_email"}) is missing a profile row.`
    );

    return {
      authUserId: authUser.id,
      deniedReason: "not_configured",
      state: "denied",
      user: null,
    };
  }

  if (!profile.role) {
    console.error(
      `[admin-auth] Profile ${authUser.id} (${profile.email ?? authUser.email ?? "unknown_email"}) is missing a role.`
    );

    return {
      authUserId: authUser.id,
      deniedReason: "not_configured",
      state: "denied",
      user: buildAdminUser(authUser, profile),
    };
  }

  if (!isAdminRole(profile.role)) {
    console.error(
      `[admin-auth] Profile ${authUser.id} (${profile.email ?? authUser.email ?? "unknown_email"}) has an unsupported role value.`
    );

    return {
      authUserId: authUser.id,
      deniedReason: "not_configured",
      state: "denied",
      user: buildAdminUser(authUser, profile),
    };
  }

  if (!profile.is_active) {
    return {
      authUserId: authUser.id,
      deniedReason: "inactive",
      state: "denied",
      user: buildAdminUser(authUser, profile),
    };
  }

  const user = buildAdminUser(authUser, profile);
  if (user.role === "employee" && user.linkedEmployeeId) {
    Object.assign(user, await getWorkshopMembership(user.linkedEmployeeId));
  }

  return {
    authUserId: authUser.id,
    deniedReason: null,
    state: "authenticated",
    user,
  };
});

/** Which workshop a staff member belongs to and whether they run it. */
async function getWorkshopMembership(employeeId: string): Promise<Partial<AdminUser>> {
  try {
    const supabase = createSupabaseAdminClient();
    const [{ data: employee }, { data: managed }] = await Promise.all([
      supabase.from("employees").select("workshop_id, workshop_role").eq("id", employeeId).maybeSingle(),
      supabase.from("workshops").select("id").eq("manager_employee_id", employeeId).maybeSingle(),
    ]);
    return {
      managedWorkshopId: managed?.id ?? undefined,
      workshopId: employee?.workshop_id ?? undefined,
      workshopRole: managed ? "workshop_manager" : "workshop_employee",
    };
  } catch {
    return {};
  }
}

export async function getAdminShellUser() {
  const context = await getAdminSessionContext();
  return context.user ?? defaultShellUser;
}

export async function requireAdminAccess(
  locale: AppLocale,
  allowedRoles?: AdminRole[],
  redirectToPath?: string
) {
  const context = await getAdminSessionContext();

  if (context.state === "anonymous") {
    const next =
      redirectToPath && redirectToPath.startsWith(`/${locale}/admin`)
        ? `?next=${encodeURIComponent(redirectToPath)}`
        : "";
    redirect(`/${locale}/admin/login${next}`);
  }

  if (
    context.state !== "authenticated" ||
    !context.user ||
    (allowedRoles && !allowedRoles.includes(context.user.role))
  ) {
    return {
      ...context,
      deniedReason:
        context.deniedReason ??
        (allowedRoles && context.user ? "not_allowed" : context.deniedReason),
      state: "denied" as const,
    };
  }

  return context;
}
