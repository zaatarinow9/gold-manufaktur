import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { getScopedEmployeeAccounts } from "@/lib/db/employeeAccounts";
import { resolveLocale } from "@/lib/site";

import { WorkshopDetailClient } from "./workshop-detail-client";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function WorkshopDetailPage({ params }: Props) {
  const { id, locale: rawLocale } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: rawLocale }));
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) {
    return <AdminAccessDenied title={locale === "ar" ? "ليس لديك صلاحية للوصول" : "Zugriff verweigert"} description={locale === "ar" ? "ليس لديك صلاحية للوصول إلى هذه الورشة." : "Sie haben keinen Zugriff auf diese Werkstatt."} />;
  }
  const workshop = (await getScopedWorkshops(access.user)).find((entry) => entry.id === id);
  if (!workshop) notFound();
  const employees = (await getScopedEmployeeAccounts(access.user)).filter((employee) => employee.workshopId === id);
  return <WorkshopDetailClient locale={locale} workshop={workshop} employees={employees} />;
}
