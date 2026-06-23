import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import { resolveLocale } from "@/lib/site";

type AdminEmployeesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminEmployeesPage({
  params,
}: AdminEmployeesPageProps) {
  const locale = await resolveLocale(params);

  if (await isAdminDecoyEnabled()) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    const message = getAdminDecoyUnavailableMessage(locale);

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t("employees.eyebrow")}
          title={t("employees.title")}
          description={t("employees.description")}
        />
        <AdminCard title={message}>
          <p className="text-sm text-muted">{message}</p>
        </AdminCard>
      </div>
    );
  }

  redirect(`/${locale}/admin/orders`);
}
