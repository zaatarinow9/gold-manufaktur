import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminOptions,
  getOptionGroups,
} from "@/lib/db/adminCatalog";
import { resolveLocale } from "@/lib/site";

import { AdminOptionsClient } from "./options-client";

type AdminOptionsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOptionsPage({
  params,
}: AdminOptionsPageProps) {
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

  const [groups, options] = await Promise.all([
    getOptionGroups(locale),
    getAdminOptions(locale),
  ]);

  return <AdminOptionsClient locale={locale} groups={groups} options={options} />;
}
