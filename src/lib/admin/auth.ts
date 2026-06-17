import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import type { AppLocale } from "@/i18n/routing";
import type { AdminRole, AdminUser } from "@/types/admin";

import { createSupabaseServerClient } from "../supabase/server";

type AdminAccessState = "anonymous" | "authenticated" | "denied";

type AdminSessionContext = {
  authUserId: string | null;
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
    email: string | null;
    full_name: string | null;
    is_active: boolean;
    role: AdminRole | null;
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
    role: profile.role ?? "employee",
    avatarLabel: getAvatarLabel(name, email),
    isActive: profile.is_active,
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
      state: "anonymous",
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, is_active, role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile || !profile.is_active || !profile.role) {
    return {
      authUserId: authUser.id,
      state: "denied",
      user: profile ? buildAdminUser(authUser, profile) : null,
    };
  }

  return {
    authUserId: authUser.id,
    state: "authenticated",
    user: buildAdminUser(authUser, profile),
  };
});

export async function getAdminShellUser() {
  const context = await getAdminSessionContext();
  return context.user ?? defaultShellUser;
}

export async function requireAdminAccess(
  locale: AppLocale,
  allowedRoles?: AdminRole[]
) {
  const context = await getAdminSessionContext();

  if (context.state === "anonymous") {
    redirect(`/${locale}/admin/login`);
  }

  if (
    context.state !== "authenticated" ||
    !context.user ||
    (allowedRoles && !allowedRoles.includes(context.user.role))
  ) {
    return {
      ...context,
      state: "denied" as const,
    };
  }

  return context;
}
