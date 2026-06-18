import { redirect } from "next/navigation";

import { resolveLocale } from "@/lib/site";

type AdminReportsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminReportsPage({
  params,
}: AdminReportsPageProps) {
  const locale = await resolveLocale(params);
  redirect(`/${locale}/admin/orders`);
}
