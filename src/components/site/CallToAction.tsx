import { ArrowRight, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { companyInfo } from "@/lib/site";
import type { CatalogProduct } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";

type CallToActionProps = {
  visualProduct?: CatalogProduct | null;
};

export function CallToAction({
  visualProduct,
}: CallToActionProps) {
  const t = useTranslations("Home.cta");

  return (
    <section className="full-bleed-section relative overflow-hidden border-y border-white/8">
      <div className="absolute inset-0">
        <LuxuryMedia
          src={visualProduct?.imageUrl}
          alt={visualProduct?.name || t("title")}
          sizes="100vw"
          imageClassName="opacity-20"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,5,5,0.96),rgba(5,5,5,0.8),rgba(5,5,5,0.88))]" />

      <div className="container-shell">
        <div className="content-shell relative py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="gold-chip">{t("badge")}</span>
            <h2 className="card-title mt-6 text-4xl text-foreground sm:text-5xl lg:text-6xl">
              {t("title")}
            </h2>
            <p className="section-copy mt-5 max-w-2xl text-base sm:text-lg">
              {t("description")}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="gold-button">
              {t("primaryCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={companyInfo.phoneHref} className="ghost-button">
              <PhoneCall className="h-4 w-4" />
              {t("secondaryCta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
