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
  const access = await requireAdminAccess(locale, ["super_admin", "marketing"]);

  if (access.state !== "authenticated") {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const isOwner = access.user?.role === "super_admin";
  const [initialSettings, usersResult] = await Promise.all([
    getAdminSettingsSnapshot(),
    (isOwner ? listManagedAdminUsers() : Promise.resolve([]))
      .then((users) => ({ users, warning: "" }))
      .catch((error) => ({
        users: [],
        warning: error instanceof Error ? error.message : "Unable to load users.",
      })),
  ]);

  return (
    <AdminSettingsClient
      canManageUsers={isOwner}
      websiteOnly={!isOwner}
      currentUserId={access.user?.id ?? ""}
      initialSettings={initialSettings}
      initialUsers={usersResult.users}
      locale={locale}
      usersWarning={usersResult.warning}
    />
  );
}
