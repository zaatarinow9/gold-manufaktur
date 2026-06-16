import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentAdminUser } from "@/lib/admin/currentUser";
import { resolveLocale } from "@/lib/site";

type AdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: Omit<AdminLayoutProps, "children">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const locale = await resolveLocale(params);

  setRequestLocale(locale);

  return (
    <AdminShell currentUser={getCurrentAdminUser()}>{children}</AdminShell>
  );
}
