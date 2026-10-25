import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedOrders } from "@/lib/db/orders";
import { getWorkshopTeam } from "@/lib/db/workshopFlow";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

import { WorkshopDetailClient } from "./workshop-detail-client";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function WorkshopDetailPage({ params }: Props) {
  const { id, locale: rawLocale } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: rawLocale }));
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }
  const workshop = (await getScopedWorkshops(access.user)).find((entry) => entry.id === id);
  if (!workshop) notFound();
  const [team, orders] = await Promise.all([getWorkshopTeam(id), getScopedOrders(access.user)]);
  const openOrders = orders
    .filter(
      (order) =>
        order.workshopId === id &&
        !order.archivedAt &&
        !order.deletedAt &&
        !["delivered", "cancelled", "archived"].includes(order.status)
    )
    .slice(0, 20);
  return <WorkshopDetailClient locale={locale} openOrders={openOrders} team={team} workshop={workshop} />;
}
