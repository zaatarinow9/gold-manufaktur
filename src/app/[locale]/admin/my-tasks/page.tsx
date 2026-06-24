import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedOrders } from "@/lib/db/orders";
import { resolveLocale } from "@/lib/site";

import { AdminMyTasksClient } from "./my-tasks-client";

type AdminMyTasksPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminMyTasksPage({
  params,
}: AdminMyTasksPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["employee"]);

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const orders = await getScopedOrders(access.user);

  return <AdminMyTasksClient locale={locale} orders={orders} />;
}
