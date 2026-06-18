import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CatalogProduct } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { SectionHeading } from "./SectionHeading";

type FeaturedProductsProps = {
  products: CatalogProduct[];
};

export function FeaturedProducts({
  products,
}: FeaturedProductsProps) {
  const t = useTranslations("Home.products");
  const items = products.slice(0, 4);

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell">
          <div className="featured-products-header flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
              className="max-w-[56rem]"
            />

            <Link
              href="/shop"
              className="rtl-inline-row inline-flex items-center gap-2 text-sm font-medium text-gold-soft transition hover:text-foreground"
            >
              {t("sectionCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {items.length > 0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,11,0.92),rgba(9,9,9,0.96))] shadow-[0_22px_65px_rgba(0,0,0,0.28)]"
                >
                  <div className="relative aspect-[4/4.8] overflow-hidden">
                    <LuxuryMedia
                      src={item.imageUrl}
                      alt={item.name}
                      sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                      imageClassName="transition duration-700 group-hover:scale-[1.05]"
                      fallbackContent={
                        <div className="absolute inset-x-5 bottom-5">
                          <span className="gold-chip">{item.categoryName}</span>
                        </div>
                      }
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.4))]" />
                  </div>

                  <div className="space-y-4 px-6 py-6 text-start">
                    <span className="gold-chip">
                      {item.categoryName || item.categorySlug}
                    </span>
                    <h3 className="text-xl font-semibold text-foreground">
                      {item.name}
                    </h3>
                    <p className="text-sm leading-6 text-muted">
                      {item.shortDescription}
                    </p>

                    <Link
                      href={item.categorySlug === "all"
                        ? "/shop"
                        : { pathname: "/shop", query: { category: item.categorySlug } }}
                      className="rtl-inline-row inline-flex items-center gap-2 text-sm font-medium text-gold-soft transition hover:text-foreground"
                    >
                      {t("cardCta")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,13,0.92),rgba(9,9,9,0.98))] px-6 py-12 text-center sm:px-8">
              <span className="gold-chip">{t("eyebrow")}</span>
              <h3 className="card-title mt-6 text-3xl text-foreground sm:text-4xl">
                {t("emptyTitle")}
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                {t("emptyText")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
