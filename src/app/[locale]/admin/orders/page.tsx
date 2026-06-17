import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedOrders } from "@/lib/db/orders";
import { resolveLocale } from "@/lib/site";

import { AdminOrdersClient } from "./orders-client";

type AdminOrdersPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOrdersPage({
  params,
}: AdminOrdersPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, [
    "super_admin",
    "admin",
    "employee",
  ]);

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const orders = await getScopedOrders(access.user);

  return (
    <AdminOrdersClient
      canCreate={access.user.role !== "employee"}
      orders={orders}
    />
  );
}
