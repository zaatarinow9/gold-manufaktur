import { getTranslations } from "next-intl/server";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminWorkshopsClient } from "./workshops-client";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import { resolveLocale } from "@/lib/site";
import { getScopedWorkshops } from "@/lib/db/workshops";

type AdminWorkshopsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminWorkshopsPage({
  params,
}: AdminWorkshopsPageProps) {
  const locale = await resolveLocale(params);

  if (await isAdminDecoyEnabled()) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    const message = getAdminDecoyUnavailableMessage(locale);

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t("workshops.eyebrow")}
          title={t("workshops.title")}
          description={t("workshops.description")}
        />
        <AdminCard title={message}>
          <p className="text-sm text-muted">{message}</p>
        </AdminCard>
      </div>
    );
  }

  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated" || !access.user) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    return (
      <AdminCard title={t("common.noAccessTitle")}>
        <p className="text-sm text-muted">{t("common.noAccessText")}</p>
      </AdminCard>
    );
  }

  const workshops = await getScopedWorkshops(access.user);
  return <AdminWorkshopsClient canCreate locale={locale} workshops={workshops} />;
}
