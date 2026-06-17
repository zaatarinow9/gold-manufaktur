import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminProducts } from "@/lib/db/adminCatalog";
import { getScopedEmployees } from "@/lib/db/employees";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

import { NewOrderClient } from "./new-order-client";

type NewOrderPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string }>;
};

export default async function NewOrderPage({
  params,
  searchParams,
}: NewOrderPageProps) {
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

  const [{ product: preselectedProductId }, products, workshops, employees] =
    await Promise.all([
      searchParams,
      getAdminProducts(locale),
      getScopedWorkshops(access.user),
      getScopedEmployees(access.user),
    ]);

  return (
    <NewOrderClient
      employees={employees}
      locale={locale}
      preselectedProductId={preselectedProductId}
      products={products}
      workshops={workshops}
    />
  );
}
