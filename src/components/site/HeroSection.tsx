import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { trimDisplayHeading } from "@/lib/displayText";
import type { CatalogProduct } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";

type HeroSectionProps = {
  visualProduct?: CatalogProduct | null;
};

export function HeroSection({
  visualProduct,
}: HeroSectionProps) {
  const t = useTranslations("Home.hero");
  const title = trimDisplayHeading(t("title"));

  return (
    <section className="full-bleed-section relative isolate min-h-[80svh] overflow-hidden">
      <div className="absolute inset-0">
        <LuxuryMedia
          src={visualProduct?.imageUrl}
          alt={t("backgroundAlt")}
          sizes="100vw"
          priority
          imageClassName="hero-zoom"
          fallbackContent={
            <div className="absolute inset-x-6 bottom-8 flex justify-center">
              <span className="gold-chip">
                {visualProduct?.categoryName || t("eyebrow")}
              </span>
            </div>
          }
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.24),rgba(5,5,5,0.74),rgba(5,5,5,0.94))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,154,82,0.16),transparent_42%)]" />
      <div className="gold-glow absolute left-1/2 top-28 h-48 w-48 -translate-x-1/2 rounded-full bg-gold/12 blur-3xl" />

      <div className="container-shell relative">
        <div className="content-shell flex min-h-[80svh] items-center justify-center py-24 sm:py-28 lg:py-32">
          <div className="hero-copy relative mx-auto flex w-full max-w-[60rem] min-w-0 flex-col items-center text-center">
            <h1 className="hero-heading hero-title-reveal text-foreground">
              {title}
            </h1>
            <p className="hero-subtitle-reveal section-copy balanced-copy mt-6 max-w-3xl text-base sm:text-lg">
              {t("subtitle")}
            </p>

            <div className="hero-actions hero-actions-reveal rtl-inline-row mt-8 flex flex-wrap justify-center gap-3 sm:mt-10">
              <Link href="/shop" className="gold-button">
                {t("primaryCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="ghost-button">
                {t("secondaryCta")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
