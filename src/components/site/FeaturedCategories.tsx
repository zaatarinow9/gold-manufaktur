import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CatalogCategory } from "@/types/catalog";

type FeaturedCategoriesProps = {
  categories: CatalogCategory[];
};

/**
 * The whole range as a compact index: every category is one row with a small
 * photo, so 17 categories fit on one screen instead of 17 giant cards.
 */
export function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
  const t = useTranslations("Home.categories");

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="section-shell" aria-labelledby="home-categories-title">
      <div className="container-shell">
        <div className="content-shell">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2 id="home-categories-title" className="section-heading text-foreground">
                {t("title")}
              </h2>
              <p className="section-copy mt-3">{t("description")}</p>
            </div>
            <Link href="/shop" className="text-link shrink-0 max-sm:hidden">
              {t("allCta")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-1 border-t border-[var(--border)] sm:mt-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10">
            {categories.map((category) => (
              <li key={category.slug} className="min-w-0 border-b border-[var(--border)] max-sm:[&:nth-child(n+9)]:hidden">
                <Link
                  href={{ pathname: "/shop", query: { category: category.slug } }}
                  className="group flex items-center gap-3.5 py-3 sm:gap-4 sm:py-3.5"
                >
                  <span className="media-frame relative h-12 w-12 shrink-0 !rounded-[10px] sm:h-14 sm:w-14">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 56px, 48px"
                        className="object-cover transition duration-500 group-hover:scale-110"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-foreground transition group-hover:text-gold-soft">
                      {category.name}
                    </span>
                    {category.shortDescription ? (
                      <span className="mt-0.5 hidden truncate text-sm text-text-soft sm:block">{category.shortDescription}</span>
                    ) : null}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-soft transition group-hover:text-gold-soft" />
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 8 ? (
            <Link href="/shop" className="ghost-button mt-6 w-full sm:hidden">
              {t("allCta")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
