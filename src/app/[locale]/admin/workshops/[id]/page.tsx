import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

import { WorkshopDetailClient } from "./workshop-detail-client";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function WorkshopDetailPage({ params }: Props) {
  const { id, locale: rawLocale } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: rawLocale }));
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) {
    return <AdminAccessDenied title="Access denied" description="You do not have access to this workshop." />;
  }
  const workshop = (await getScopedWorkshops(access.user)).find((entry) => entry.id === id);
  if (!workshop) notFound();
  return <WorkshopDetailClient locale={locale} workshop={workshop} />;
}
