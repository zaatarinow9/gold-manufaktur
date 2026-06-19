import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedEmployees } from "@/lib/db/employees";
import { getScopedOrders } from "@/lib/db/orders";
import { getAdminSettingsSnapshot } from "@/lib/db/siteSettings";
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

  const [orders, employees, settings] = await Promise.all([
    getScopedOrders(access.user),
    getScopedEmployees(access.user),
    getAdminSettingsSnapshot(),
  ]);

  return (
    <AdminOrdersClient
      canCreate={access.user.role !== "employee"}
      currentUserRole={access.user.role}
      employees={employees}
      locale={locale}
      orders={orders}
      privacyModeEnabled={settings.privacyModeEnabled}
      privacyModeReason={settings.privacyModeReason}
    />
  );
}
