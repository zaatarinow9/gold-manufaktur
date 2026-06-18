import { redirect } from "next/navigation";

import { resolveLocale } from "@/lib/site";

type AdminArchivePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminArchivePage({
  params,
}: AdminArchivePageProps) {
  const locale = await resolveLocale(params);
  redirect(`/${locale}/admin/orders`);
}
