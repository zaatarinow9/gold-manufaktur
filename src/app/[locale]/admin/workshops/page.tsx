import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

import { AdminWorkshopsClient } from "./workshops-client";

type AdminWorkshopsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminWorkshopsPage({
  params,
}: AdminWorkshopsPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const workshops = await getScopedWorkshops(access.user);

  return (
    <AdminWorkshopsClient
      canCreate={access.user.role === "super_admin"}
      locale={locale}
      workshops={workshops}
    />
  );
}
