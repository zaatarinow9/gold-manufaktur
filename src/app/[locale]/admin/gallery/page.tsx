import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminCategories, getAdminProducts } from "@/lib/db/adminCatalog";
import { resolveLocale } from "@/lib/site";

import { AdminGalleryClient } from "./gallery-client";

type AdminGalleryPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminGalleryPage({
  params,
}: AdminGalleryPageProps) {
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

  const [categories, products] = await Promise.all([
    getAdminCategories(locale),
    getAdminProducts(locale),
  ]);

  return (
    <AdminGalleryClient
      categories={categories}
      locale={locale}
      products={products}
    />
  );
}
