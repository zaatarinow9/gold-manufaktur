import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { resolveLocale } from "@/lib/site";

import { ProfileClient } from "./profile-client";

type Props = { params: Promise<{ locale: string }> };

export default async function ProfilePage({ params }: Props) {
  const locale = await resolveLocale(params);
  const access = await requireAdminAccess(locale);
  if (access.state !== "authenticated" || !access.user) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }
  const user = access.user;
  return (
    <ProfileClient
      avatarLabel={user.avatarLabel}
      avatarUrl={user.avatarUrl ?? ""}
      email={user.email}
      isManager={Boolean(user.managedWorkshopId)}
      locale={locale}
      name={user.name}
      role={user.role}
    />
  );
}
