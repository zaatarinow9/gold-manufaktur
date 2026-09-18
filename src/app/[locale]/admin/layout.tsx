import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminShellUser } from "@/lib/admin/auth";
import { getAdminNavCounts } from "@/lib/db/adminNotifications";
import { resolveLocale } from "@/lib/site";

type AdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

async function resolveAdminLocale(params: AdminLayoutProps["params"]) {
  const { locale } = await params;

  if (locale !== "ar" && locale !== "de") {
    redirect("/de/admin");
  }

  return resolveLocale(Promise.resolve({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<AdminLayoutProps, "children">): Promise<Metadata> {
  const locale = await resolveAdminLocale(params);
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
  const locale = await resolveAdminLocale(params);
  const currentUser = await getAdminShellUser();
  const navCounts =
    currentUser.id !== "guest" ? await getAdminNavCounts(currentUser) : {};

  setRequestLocale(locale);

  return (
    <AdminShell currentUser={currentUser} navCounts={navCounts}>
      {children}
    </AdminShell>
  );
}
