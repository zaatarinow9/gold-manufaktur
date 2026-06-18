import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CatalogCategory } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { SectionHeading } from "./SectionHeading";

type FeaturedCategoriesProps = {
  categories: CatalogCategory[];
};

export function FeaturedCategories({
  categories,
}: FeaturedCategoriesProps) {
  const t = useTranslations("Home.categories");
  const items = categories.slice(0, 6);

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
            align="center"
            className="max-w-[56rem]"
          />

          {items.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.slug}
                  href={{ pathname: "/shop", query: { category: item.slug } }}
                  className="group relative aspect-[4/4.8] overflow-hidden rounded-[30px] border border-white/10 bg-black/30"
                >
                  <LuxuryMedia
                    src={item.imageUrl}
                    alt={item.name}
                    sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw"
                    imageClassName="transition duration-700 group-hover:scale-[1.05]"
                    fallbackContent={
                      <div className="absolute inset-x-5 bottom-5">
                        <span className="gold-chip">{item.accent}</span>
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.82))]" />
                  <div className="rtl-inline-row absolute inset-x-5 top-5 flex items-center justify-between gap-3">
                    <span className="gold-chip">{item.accent}</span>
                    <span className="rounded-full border border-white/10 bg-black/45 p-2 text-gold-soft transition group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="absolute inset-x-5 bottom-5 text-start">
                    <h3 className="card-title text-3xl text-foreground sm:text-[2.4rem]">
                      {item.name}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/72">
                      {item.shortDescription}
                    </p>
                  </div>
                </Link>
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
