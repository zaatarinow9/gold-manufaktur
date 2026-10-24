import { notFound } from "next/navigation";

import { TrackingOrderView } from "@/components/site/TrackingOrderView";
import { getPublicTrackingOrder } from "@/lib/db/orders";
import { resolveLocale } from "@/lib/site";

type TrackingPageProps = {
  params: Promise<{ locale: string; trackingNumber: string }>;
};

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { locale: localeParam, trackingNumber } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const order = await getPublicTrackingOrder(trackingNumber);

  if (!order) {
    notFound();
  }

  return <TrackingOrderView locale={locale} order={order} />;
}
