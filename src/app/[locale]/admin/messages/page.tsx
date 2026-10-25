import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getThreadMessages, listThreads } from "@/lib/db/staffMessages";
import { resolveLocale } from "@/lib/site";

import { MessagesClient } from "./messages-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ thread?: string }> };

export default async function MessagesPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const { thread: requested } = await searchParams;
  const access = await requireAdminAccess(locale, ["super_admin", "employee"]);
  if (access.state !== "authenticated" || !access.user) {
    const t = await getTranslations({ locale, namespace: "Admin" });
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }

  const threads = await listThreads(access.user);
  const activeKey = threads.find((thread) => thread.key === requested)?.key ?? threads[0]?.key ?? "";
  const active = activeKey ? await getThreadMessages(access.user, activeKey).catch(() => null) : null;

  return (
    <MessagesClient
      activeKey={activeKey}
      locale={locale}
      messages={active?.messages ?? []}
      threads={threads}
      viewerKind={access.user.role === "super_admin" ? "admin" : access.user.managedWorkshopId ? "manager" : "employee"}
    />
  );
}
