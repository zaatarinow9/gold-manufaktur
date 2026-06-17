import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminCategories } from "@/lib/db/adminCatalog";
import { resolveLocale } from "@/lib/site";

import { AdminCategoriesClient } from "./categories-client";

type AdminCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCategoriesPage({
  params,
}: AdminCategoriesPageProps) {
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

  const categories = await getAdminCategories(locale);

  return <AdminCategoriesClient locale={locale} categories={categories} />;
}
