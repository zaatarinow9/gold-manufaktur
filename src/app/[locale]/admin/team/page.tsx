import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getWorkshopTeam } from "@/lib/db/workshopFlow";
import { resolveLocale } from "@/lib/site";

import { TeamClient } from "./team-client";

type Props = { params: Promise<{ locale: string }> };

export default async function TeamPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const access = await requireAdminAccess(locale, ["employee"]);
  if (access.state !== "authenticated" || !access.user?.managedWorkshopId) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }
  const team = await getWorkshopTeam(access.user.managedWorkshopId);
  return <TeamClient locale={locale} team={team} viewerEmployeeId={access.user.linkedEmployeeId ?? ""} />;
}
