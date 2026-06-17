import { MapPinned, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  companyDirectionsUrl,
  companyInfo,
  companyMapEmbedUrl,
} from "@/lib/site";
import { SectionHeading } from "./SectionHeading";

export function LocationMap() {
  const t = useTranslations("Contact.location");

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell rtl-mirror-grid grid gap-6 xl:grid-cols-[0.72fr_1.28fr] xl:items-stretch">
          <div className="luxury-panel flex h-full min-h-[22rem] flex-col px-6 py-8 sm:px-8 xl:min-h-[32.5rem]">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
              titleClassName="text-4xl sm:text-5xl"
              descriptionClassName="max-w-md text-base leading-7"
            />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/10 bg-black/28 p-5 text-start">
                <div className="rtl-inline-row flex items-center gap-3 text-gold-soft">
                  <MapPinned className="h-4 w-4" />
                  <p className="muted-label text-gold-soft">{t("addressLabel")}</p>
                </div>
                <p className="mt-4 text-base leading-7 text-foreground">
                  {companyInfo.address}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/28 p-5 text-start">
                <div className="rtl-inline-row flex items-center gap-3 text-gold-soft">
                  <PhoneCall className="h-4 w-4" />
                  <p className="muted-label text-gold-soft">{t("phoneLabel")}</p>
                </div>
                <a
                  href={companyInfo.phoneHref}
                  className="mt-4 inline-flex text-base leading-7 text-foreground transition hover:text-gold-soft"
                >
                  {companyInfo.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="rtl-inline-row mt-auto flex flex-wrap gap-3 pt-8">
              <a
                href={companyDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="gold-button"
              >
                {t("routeCta")}
              </a>
              <a href={companyInfo.phoneHref} className="ghost-button">
                {t("callCta")}
              </a>
            </div>
          </div>

          <div className="luxury-panel h-full min-h-[22.5rem] overflow-hidden p-2 xl:min-h-[32.5rem]">
            <div className="relative h-full min-h-[22rem] overflow-hidden rounded-[28px] border border-white/10 bg-black/35 sm:min-h-[24rem] xl:min-h-full">
              <iframe
                title={t("mapTitle")}
                src={companyMapEmbedUrl}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(5,5,5,0.7),transparent)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
