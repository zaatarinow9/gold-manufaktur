import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminCategories,
  getAdminOptions,
  getAdminProducts,
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
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const [categories, options, products] = await Promise.all([
    getAdminCategories(locale),
    getAdminOptions(locale),
    getAdminProducts(locale),
  ]);

  return (
    <AdminProductsClient
      locale={locale}
      categories={categories}
      options={options}
      products={products}
    />
  );
}
