import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedOrders } from "@/lib/db/orders";
import { getWorkshopTeam } from "@/lib/db/workshopFlow";
import { resolveLocale } from "@/lib/site";

import { WorkshopOrdersClient } from "./workshop-orders-client";

type Props = { params: Promise<{ locale: string }> };

export default async function WorkshopOrdersPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["employee"]);
  const workshopId = access.user?.managedWorkshopId;

  if (access.state !== "authenticated" || !access.user || !workshopId) {
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }

  const [orders, team] = await Promise.all([getScopedOrders(access.user), getWorkshopTeam(workshopId)]);

  return (
    <WorkshopOrdersClient
      locale={locale}
      orders={orders.filter((order) => order.workshopId === workshopId && !order.archivedAt && !order.deletedAt)}
      team={team.filter((member) => member.isActive)}
    />
  );
}
