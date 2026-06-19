import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { listCustomerInquiries } from "@/lib/db/inquiries";
import { resolveLocale } from "@/lib/site";

import { AdminInquiriesClient } from "./inquiries-client";

type AdminInquiriesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminInquiriesPage({
  params,
}: AdminInquiriesPageProps) {
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

  const inquiries = await listCustomerInquiries().catch(() => []);

  return <AdminInquiriesClient inquiries={inquiries} locale={locale} />;
}
