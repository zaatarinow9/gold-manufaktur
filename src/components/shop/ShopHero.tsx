import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { trimDisplayHeading } from "@/lib/displayText";
import { companyInfo } from "@/lib/site";
import type { CatalogProduct } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";

type ShopHeroProps = {
  backgroundProduct?: CatalogProduct | null;
  primaryProduct?: CatalogProduct | null;
  secondaryProduct?: CatalogProduct | null;
};

export function ShopHero({
  backgroundProduct,
  primaryProduct,
  secondaryProduct,
}: ShopHeroProps) {
  const t = useTranslations("Shop.hero");
  const title = trimDisplayHeading(t("title"));

  return (
    <section className="full-bleed-section relative overflow-hidden border-b border-white/6">
      <div className="absolute inset-0">
        <LuxuryMedia
          src={backgroundProduct?.imageUrl}
          alt={backgroundProduct?.name || t("visualAlt")}
          sizes="100vw"
          imageClassName="opacity-[0.22]"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,4,4,0.97)_16%,rgba(4,4,4,0.84)_48%,rgba(4,4,4,0.68)_100%)]" />

      <div className="container-shell">
        <div className="content-shell rtl-mirror-grid relative grid gap-8 py-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:py-16">
          <div className="shop-hero-copy rtl-items-start min-w-0 flex flex-col justify-center">
            <span className="eyebrow">{t("eyebrow")}</span>
            <h1 className="section-title mt-6 text-foreground">{title}</h1>
            <p className="section-copy mt-6 max-w-2xl text-base sm:text-lg">
              {t("subtitle")}
            </p>

            <div className="rtl-inline-row rtl-justify-start mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="gold-button">
                {t("primaryCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={companyInfo.phoneHref} className="ghost-button">
                {t("secondaryCta")}
              </a>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 md:grid-cols-[1.08fr_0.92fr]">
            <div className="relative min-h-[22rem] overflow-hidden rounded-[34px] border border-white/10 bg-black/30">
              <LuxuryMedia
                src={primaryProduct?.imageUrl}
                alt={primaryProduct?.name || t("visualAlt")}
                sizes="(max-width: 1279px) 100vw, 38vw"
                fallbackContent={
                  <div className="absolute inset-x-5 bottom-5">
                    <span className="gold-chip">
                      {primaryProduct?.categoryName || t("visualBadge")}
                    </span>
                  </div>
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/14 to-transparent" />
              <div className="rtl-inline-row absolute inset-x-5 top-5 flex items-center justify-between gap-3">
                <span className="gold-chip">{t("visualBadge")}</span>
                <span className="rounded-full border border-white/10 bg-black/48 px-3 py-2 text-[11px] tracking-[0.08em] text-gold-soft">
                  {companyInfo.name}
                </span>
              </div>
            </div>

            <div className="relative min-h-[18rem] overflow-hidden rounded-[30px] border border-white/10 bg-black/28">
              <LuxuryMedia
                src={secondaryProduct?.imageUrl}
                alt={secondaryProduct?.name || t("visualAlt")}
                sizes="(max-width: 1279px) 100vw, 24vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/16 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
