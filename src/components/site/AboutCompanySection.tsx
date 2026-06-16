import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { type AppLocale } from "@/i18n/routing";
import { companyInfo, getBrandLogoAlt } from "@/lib/site";
import { SectionHeading } from "./SectionHeading";

export function AboutCompanySection() {
  const t = useTranslations("Home.aboutCompany");
  const locale = useLocale() as AppLocale;
  const brandLogoAlt = getBrandLogoAlt(locale);

  return (
    <section className="section-shell pt-0">
      <div className="container-shell">
        <div className="content-shell">
          <div className="luxury-panel overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
            <div className="rtl-mirror-grid grid gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-stretch">
              <div className="flex h-full flex-col justify-center">
                <SectionHeading
                  eyebrow={t("eyebrow")}
                  title={t("title")}
                  description={t("description")}
                  titleClassName="text-4xl sm:text-5xl xl:text-[4rem]"
                  descriptionClassName="max-w-2xl text-base leading-7"
                />

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <article className="rounded-[24px] border border-white/10 bg-black/24 p-5">
                    <p className="muted-label">{t("teamLabel")}</p>
                    <p className="mt-3 text-sm leading-7 text-foreground sm:text-base">
                      {t("story")}
                    </p>
                  </article>

                  <article className="rounded-[24px] border border-white/10 bg-black/24 p-5">
                    <div className="rtl-inline-row flex items-center gap-3 text-gold-soft">
                      <MapPin className="h-4 w-4" />
                      <p className="muted-label text-gold-soft">
                        {t("locationLabel")}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground sm:text-base">
                      {companyInfo.address}
                    </p>
                  </article>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(196,154,82,0.18),transparent_46%),linear-gradient(180deg,rgba(22,18,13,0.96),rgba(9,9,9,0.98))] p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(232,201,135,0.42),transparent)]" />
                <div className="flex h-full flex-col justify-between gap-8">
                  <div>
                    <span className="gold-chip">GoldHelwah GmbH</span>
                    <BrandLogo
                      alt={brandLogoAlt}
                      className="mt-6 h-[5.5rem] w-auto sm:h-[6.5rem]"
                    />
                  </div>

                  <p className="max-w-md text-sm leading-7 text-muted sm:text-base">
                    {t("story")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
