import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { listManagedAdminUsers } from "@/lib/db/adminUsers";
import { getAdminSettingsSnapshot } from "@/lib/db/siteSettings";
import { resolveLocale } from "@/lib/site";

import { AdminSettingsClient } from "./settings-client";

type AdminSettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSettingsPage({
  params,
}: AdminSettingsPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const [initialSettings, usersResult] = await Promise.all([
    getAdminSettingsSnapshot(),
    listManagedAdminUsers()
      .then((users) => ({ users, warning: "" }))
      .catch((error) => ({
        users: [],
        warning: error instanceof Error ? error.message : "Unable to load users.",
      })),
  ]);

  return (
    <AdminSettingsClient
      canManageUsers={access.user?.role === "super_admin"}
      currentUserId={access.user?.id ?? ""}
      initialSettings={initialSettings}
      initialUsers={usersResult.users}
      locale={locale}
      usersWarning={usersResult.warning}
    />
  );
}
