import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminCategories,
  getAdminProducts,
  getOptionGroups,
} from "@/lib/db/adminCatalog";
import { resolveLocale } from "@/lib/site";

import { AdminProductsClient } from "./products-client";

type AdminProductsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProductsPage({
  params,
}: AdminProductsPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const [categories, groups, products] = await Promise.all([
    getAdminCategories(locale),
    getOptionGroups(locale),
    getAdminProducts(locale),
  ]);

  return (
    <AdminProductsClient
      locale={locale}
      categories={categories}
      groups={groups}
      products={products}
    />
  );
}
