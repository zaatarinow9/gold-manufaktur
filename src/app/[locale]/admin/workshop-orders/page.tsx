import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedOrders } from "@/lib/db/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/site";

import { WorkshopOrdersClient } from "./workshop-orders-client";

type Props = { params: Promise<{ locale: string }> };

export default async function WorkshopOrdersPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["employee", "admin", "super_admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }

  const supabase = await createSupabaseServerClient();
  const { data: manager } = access.user.role === "employee" && access.user.linkedEmployeeId
    ? await supabase.from("workshops").select("id").eq("manager_employee_id", access.user.linkedEmployeeId).maybeSingle()
    : { data: null };

  if (access.user.role === "employee" && !manager) {
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }

  const workshopId = manager?.id ?? access.user.workshopId;
  if (!workshopId && access.user.role === "employee") {
    return <AdminCard><p className="text-sm text-muted">{t("common.noAccessText")}</p></AdminCard>;
  }

  const [orders, employeesResult] = await Promise.all([
    getScopedOrders(access.user),
    supabase.from("employees").select("id, full_name, workshop_id, is_active").eq("workshop_id", workshopId ?? "").eq("is_active", true).order("full_name"),
  ]);

  return (
    <WorkshopOrdersClient
      locale={locale}
      orders={access.user.role === "employee" ? orders.filter((order) => order.workshopId === workshopId) : orders}
      employees={employeesResult.data ?? []}
    />
  );
}
