import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedEmployeeAccounts } from "@/lib/db/employeeAccounts";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

import { AdminEmployeesClient } from "./employees-client";

type AdminEmployeesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminEmployeesPage({
  params,
}: AdminEmployeesPageProps) {
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

  const [employees, workshops] = await Promise.all([
    getScopedEmployeeAccounts(access.user),
    getScopedWorkshops(access.user),
  ]);

  return (
    <AdminEmployeesClient
      defaultWorkshopId={workshops[0]?.id ?? access.user.workshopId}
      employees={employees}
      locale={locale}
      workshops={workshops}
    />
  );
}
