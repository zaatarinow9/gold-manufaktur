import { getTranslations } from "next-intl/server";

import { Check, MessageCircle, Phone } from "lucide-react";
import { TrackingSupportForm } from "@/components/site/TrackingSupportForm";
import { Link } from "@/i18n/navigation";
import { getPublicTrackingStageIndex } from "@/lib/orderTracking/publicStages";
import type { PublicTrackingOrderRecord } from "@/lib/db/orders";
import type { AppLocale } from "@/i18n/routing";
import { companyInfo } from "@/lib/site";
import { publicTrackingStageValues } from "@/types/admin";

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

/** The public order status: current step, progress line, updates and support. */
export async function TrackingOrderView({ locale, order }: { locale: AppLocale; order: PublicTrackingOrderRecord }) {
  const t = await getTranslations({ locale, namespace: "Tracking" });
  const currentStageIndex = getPublicTrackingStageIndex(order.publicTrackingStage);
  const noteEvents = order.trackingEvents.filter((event) => event.description.trim().length > 0);
  const currentStageLabel = order.publicTrackingStage ? t(`stages.${order.publicTrackingStage}`) : t("orderReceivedLabel");

  return (
    <>
      <header className="border-b border-[var(--border)]">
        <div className="container-shell">
          <div className="content-shell pb-10 pt-12 sm:pb-12 sm:pt-16">
            <p className="text-sm text-text-soft">{t("trackingNumberLabel")}</p>
            <h1 dir="ltr" className="mt-1 text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-wide text-foreground">
              {order.trackingNumber}
            </h1>
            <p className="mt-4 text-lg text-foreground">
              <span className="text-muted">{t("currentPublicStageLabel")}: </span>
              <span className="font-semibold text-gold-soft">{currentStageLabel}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="container-shell">
        <div className="content-shell pb-20 pt-10 sm:pt-12">
          <section aria-labelledby="progress-title">
            <h2 id="progress-title" className="font-semibold text-foreground">{t("progressTitle")}</h2>
            <p className="mt-1 text-[0.9375rem] text-muted">{t("progressDescription")}</p>

            <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-4">
              {publicTrackingStageValues.map((stage, index) => {
                const isCurrent = currentStageIndex === index;
                const isComplete = currentStageIndex > index;
                const isReached = isCurrent || isComplete;

                return (
                  <li key={stage} className="relative flex gap-4 md:block" aria-current={isCurrent ? "step" : undefined}>
                    <div className="flex flex-col items-center md:flex-row">
                      <span
                        className={`relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                          isCurrent
                            ? "border-gold bg-gold text-[#1a1209]"
                            : isComplete
                              ? "border-gold text-gold-soft"
                              : "border-[var(--border-strong)] text-text-soft"
                        }`}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      {index < publicTrackingStageValues.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className={`mt-2 w-px flex-1 md:ms-3 md:mt-0 md:h-px md:w-auto ${isComplete ? "bg-gold" : "bg-[var(--border-strong)]"}`}
                        />
                      ) : null}
                    </div>
                    <div className="pb-2 md:mt-4 md:pe-4">
                      <h3 className={`font-semibold ${isReached ? "text-foreground" : "text-muted"}`}>{t(`stages.${stage}`)}</h3>
                      <p className="mt-1 text-[0.9375rem] leading-7 text-muted">
                        {currentStageIndex < 0
                          ? t("receivedDescription")
                          : isCurrent
                            ? t("currentStageDescription")
                            : isComplete
                              ? t("completedStageDescription")
                              : t("upcomingStageDescription")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {!order.publicTrackingStage ? (
              <p className="mt-6 rounded-xl border border-[var(--border)] bg-surface px-5 py-4 text-[0.9375rem] text-muted">
                {t("receivedMessage")}
              </p>
            ) : null}
          </section>

          {noteEvents.length > 0 ? (
            <section aria-labelledby="notes-title" className="mt-14">
              <h2 id="notes-title" className="font-semibold text-foreground">{t("notesTitle")}</h2>
              <p className="mt-1 text-[0.9375rem] text-muted">{t("notesDescription")}</p>
              <ul className="mt-6 border-t border-[var(--border)]">
                {noteEvents.map((event) => (
                  <li key={event.id} className="grid gap-1 border-b border-[var(--border)] py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                    <div>
                      <p className="text-sm font-medium text-gold-soft">
                        {event.publicStage ? t(`stages.${event.publicStage}`) : t("orderReceivedLabel")}
                      </p>
                      <p className="text-sm text-text-soft">{formatTrackingDate(locale, event.createdAt)}</p>
                    </div>
                    <p dir="auto" className="text-start leading-7 text-foreground">{event.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-16">
            <TrackingSupportForm trackingNumber={order.trackingNumber} />
            <aside>
              <div className="flex flex-wrap gap-3">
                <a href={companyInfo.phoneHref} className="ghost-button">
                  <Phone className="h-4 w-4" />
                  {t("phone")}
                </a>
                <a href={companyInfo.whatsappHref} target="_blank" rel="noreferrer" className="ghost-button">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
              <Link href="/tracking" className="text-link mt-5">
                {t("trackAnotherOrder")}
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
