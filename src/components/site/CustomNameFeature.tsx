import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { Link } from "@/i18n/navigation";

type CustomNameFeatureProps = {
  categorySlug?: string;
  imageUrl?: string;
};

/** The made-to-order service gets one wide, calm feature instead of a card among cards. */
export function CustomNameFeature({ categorySlug, imageUrl }: CustomNameFeatureProps) {
  const t = useTranslations("Home.customName");

  return (
    <section className="section-shell" aria-labelledby="home-custom-title">
      <div className="container-shell">
        <div className="content-shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="media-frame relative aspect-[4/3] lg:aspect-[5/4]">
            <LuxuryMedia src={imageUrl} alt="" sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>

          <div className="max-w-xl">
            <h2 id="home-custom-title" className="section-title text-foreground">
              {t("title")}
            </h2>
            <p className="section-copy mt-5 text-[1.0625rem]">{t("description")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={categorySlug ? { pathname: "/shop", query: { category: categorySlug } } : "/shop"}
                className="gold-button"
              >
                {t("primaryCta")}
                <ChevronRight className="h-4 w-4" />
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
