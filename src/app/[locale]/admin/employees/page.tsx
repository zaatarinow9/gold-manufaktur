import { redirect } from "next/navigation";

import { resolveLocale } from "@/lib/site";

type AdminEmployeesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminEmployeesPage({
  params,
}: AdminEmployeesPageProps) {
  const locale = await resolveLocale(params);
  redirect(`/${locale}/admin/orders`);
}
