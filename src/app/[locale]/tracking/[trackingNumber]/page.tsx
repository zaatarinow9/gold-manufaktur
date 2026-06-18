import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { TrackingSupportForm } from "@/components/site/TrackingSupportForm";
import { Link } from "@/i18n/navigation";
import { getPublicTrackingStageIndex } from "@/lib/orderTracking/publicStages";
import { getPublicTrackingOrder } from "@/lib/db/orders";
import { companyInfo, getBrandLogoAlt, resolveLocale, siteName } from "@/lib/site";
import { publicTrackingStageValues } from "@/types/admin";

type TrackingPageProps = {
  params: Promise<{ locale: string; trackingNumber: string }>;
};

function formatTrackingDate(locale: string, value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { locale: localeParam, trackingNumber } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const t = await getTranslations({ locale, namespace: "Tracking" });
  const order = await getPublicTrackingOrder(trackingNumber);
  const brandLogoAlt = getBrandLogoAlt(locale);

  if (!order) {
    notFound();
  }

  const currentStageIndex = getPublicTrackingStageIndex(order.publicTrackingStage);
  const noteEvents = order.trackingEvents.filter(
    (event) => event.description.trim().length > 0
  );

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="luxury-panel overflow-hidden px-6 py-8 sm:px-8">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
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
                    <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
                      {t("description")}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-gold/18 bg-gold/10 px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">
                    {t("trackingNumberLabel")}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {order.trackingNumber}
                  </p>
                  <p className="mt-5 text-xs uppercase tracking-[0.22em] text-gold-soft">
                    {t("currentPublicStageLabel")}
                  </p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    {order.publicTrackingStage
                      ? t(`stages.${order.publicTrackingStage}`)
                      : t("receivedMessage")}
                  </p>
                </div>
              </div>
            </div>

            <div className="luxury-panel px-6 py-8 sm:px-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{t("progressTitle")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("progressDescription")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/tracking" className="ghost-button">
                    {t("trackAnotherOrder")}
                  </Link>
                  <Link href="/contact" className="ghost-button">
                    {t("contactSupport")}
                  </Link>
                  <a href={companyInfo.phoneHref} className="gold-button">
                    {t("phone")}
                  </a>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {publicTrackingStageValues.map((stage, index) => {
                  const isCurrent = currentStageIndex === index;
                  const isComplete = currentStageIndex > index;

                  return (
                    <div
                      key={stage}
                      className={`rounded-[1.45rem] border px-5 py-5 ${
                        isCurrent
                          ? "border-gold/35 bg-gold/12"
                          : isComplete
                            ? "border-gold/18 bg-white/5"
                            : "border-white/8 bg-white/3"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold text-foreground">
                        {t(`stages.${stage}`)}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {currentStageIndex < 0
                          ? t("receivedDescription")
                          : isCurrent
                            ? t("currentStageDescription")
                            : isComplete
                              ? t("completedStageDescription")
                              : t("upcomingStageDescription")}
                      </p>
                    </div>
                  );
                })}
              </div>

              {!order.publicTrackingStage ? (
                <div className="mt-5 rounded-[1.3rem] border border-white/8 bg-white/4 px-5 py-4 text-sm text-muted">
                  {t("receivedMessage")}
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="luxury-panel px-6 py-8 sm:px-8">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-foreground">{t("notesTitle")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("notesDescription")}</p>
                </div>

                <div className="space-y-4">
                  {noteEvents.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[1.35rem] border border-white/8 bg-white/4 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-gold-soft">
                          {event.publicStage
                            ? t(`stages.${event.publicStage}`)
                            : t("orderReceivedLabel")}
                        </span>
                        <span className="text-xs text-muted">
                          {formatTrackingDate(locale, event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-foreground">
                        {event.description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="luxury-panel px-6 py-8 sm:px-8">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("instructionsTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{t("instructionsDescription")}</p>
                </div>

                <ol className="space-y-3 text-sm leading-7 text-muted">
                  <li>{t("instructionsStepOne")}</li>
                  <li>{t("instructionsStepTwo")}</li>
                  <li>{t("instructionsStepThree")}</li>
                </ol>

                <div className="mt-6 rounded-[1.3rem] border border-white/8 bg-white/4 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">
                    {t("trackingNumberLabel")}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {order.trackingNumber}
                  </p>
                </div>
              </div>
            </div>

            <TrackingSupportForm trackingNumber={order.trackingNumber} />
          </div>
        </div>
      </div>
    </section>
  );
}
