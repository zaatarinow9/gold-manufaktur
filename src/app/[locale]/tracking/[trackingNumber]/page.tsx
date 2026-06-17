import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { OrderTrackingTimeline } from "@/components/admin/OrderTrackingTimeline";
import { TrackingSupportForm } from "@/components/site/TrackingSupportForm";
import { Link } from "@/i18n/navigation";
import { getPublicTrackingOrder } from "@/lib/db/orders";
import { companyInfo, getBrandLogoAlt, resolveLocale, siteName } from "@/lib/site";

type TrackingPageProps = {
  params: Promise<{ locale: string; trackingNumber: string }>;
};

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { locale: localeParam, trackingNumber } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const t = await getTranslations({ locale, namespace: "Tracking" });
  const tAdmin = await getTranslations({ locale, namespace: "Admin" });
  const order = await getPublicTrackingOrder(trackingNumber);
  const brandLogoAlt = getBrandLogoAlt(locale);

  if (!order) {
    notFound();
  }

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="luxury-panel overflow-hidden px-6 py-8 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4">
                  <Link href="/" className="brand-logo-link">
                    <span className="sr-only">{siteName}</span>
                    <BrandLogo
                      alt={brandLogoAlt}
                      className="h-[3rem] w-auto shrink-0 sm:h-[3.35rem]"
                    />
                  </Link>
                  <div className="space-y-2">
                    <p className="eyebrow">{t("title")}</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {order.trackingNumber}
                    </h1>
                    <p className="text-sm text-muted">{t("description")}</p>
                    <p className="text-sm text-muted">{t("currentStatus")}</p>
                  </div>
                </div>

                <AdminBadge variant="gold">
                  {tAdmin(`trackingStatus.${order.trackingStatus}`)}
                </AdminBadge>
              </div>
            </div>

            <div className="luxury-panel px-6 py-8 sm:px-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{t("timelineTitle")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("timelineDescription")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/contact" className="ghost-button">
                    {t("contact")}
                  </Link>
                  <a href={companyInfo.phoneHref} className="ghost-button">
                    {t("phone")}
                  </a>
                  <Link href="/" className="gold-button">
                    {t("backToWebsite")}
                  </Link>
                </div>
              </div>

              <OrderTrackingTimeline
                events={order.trackingEvents}
                showActor={false}
              />
            </div>

            <TrackingSupportForm trackingNumber={order.trackingNumber} />
          </div>
        </div>
      </div>
    </section>
  );
}
