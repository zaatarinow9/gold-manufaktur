import { ArrowRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { StaticHeroMedia } from "@/components/site/StaticHeroMedia";
import { Link } from "@/i18n/navigation";
import type { CatalogProduct } from "@/types/catalog";

type HeroSectionProps = {
  imageUrl?: string;
  visualProduct?: CatalogProduct | null;
};

/**
 * Split hero: the words sit on the dark showroom background, the photo gets
 * its own half so the jewellery is never covered by text.
 */
export function HeroSection({ imageUrl, visualProduct }: HeroSectionProps) {
  const t = useTranslations("Home.hero");

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)]">
      <div className="grid lg:min-h-[min(46rem,calc(100svh_-_4.5rem))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="relative order-1 aspect-[5/4] overflow-hidden sm:aspect-[16/10] lg:order-2 lg:aspect-auto">
          <StaticHeroMedia
            src={imageUrl}
            fallbackSrc={visualProduct?.imageUrl}
            alt={t("backgroundAlt")}
            sizes="(min-width: 1024px) 52vw, 100vw"
            priority
            imageClassName="hero-image-settle object-center"
          />
          {/* Blend the photo into the page on the text side and at the bottom on mobile. */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/10 to-transparent lg:bg-linear-to-r lg:from-background lg:via-background/5 lg:to-transparent rtl:lg:bg-linear-to-l" />
        </div>

        <div className="relative z-10 order-2 -mt-16 flex items-center px-4 pb-14 sm:px-6 lg:order-1 lg:mt-0 lg:py-20 lg:pe-12 lg:ps-[max(2.5rem,calc((100vw_-_78rem)/2))]">
          <div className="hero-reveal max-w-[36rem]">
            <p className="eyebrow">{t("title")}</p>
            {/* The company name is the headline, always in its Latin form. */}
            <h1 className="hero-brand mt-5" dir="ltr">
              <span className="hero-brand-name">Gold Helwah</span>
              <span className="hero-brand-suffix">GmbH</span>
            </h1>
            <p className="hero-tagline mt-6">{t("subtitle")}</p>
            <p className="mt-4 max-w-[32rem] text-[1.0625rem] leading-8 text-muted">{t("description")}</p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="gold-button">
                {t("primaryCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="ghost-button">
                {t("secondaryCta")}
              </Link>
            </div>

            <p className="mt-10 flex items-center gap-2 text-sm text-text-soft">
              <MapPin className="h-4 w-4 text-gold" />
              {t("locationLine")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
