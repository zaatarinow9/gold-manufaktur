import { redirect } from "next/navigation";

import { resolveLocale } from "@/lib/site";

type AdminAttendancePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminAttendancePage({
  params,
}: AdminAttendancePageProps) {
  const locale = await resolveLocale(params);
  redirect(`/${locale}/admin/orders`);
}
