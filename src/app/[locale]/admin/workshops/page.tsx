import { redirect } from "next/navigation";

import { resolveLocale } from "@/lib/site";

type AdminWorkshopsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminWorkshopsPage({
  params,
}: AdminWorkshopsPageProps) {
  const locale = await resolveLocale(params);
  redirect(`/${locale}/admin/orders`);
}
