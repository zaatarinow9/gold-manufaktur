import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { Link } from "@/i18n/navigation";
import type { CatalogProduct } from "@/types/catalog";

type FeaturedProductsProps = {
  products: CatalogProduct[];
};

/** Featured pieces first, topped up with the newest ones. Opens the piece in the shop. */
export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const t = useTranslations("Home.products");
  const items = products.slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="section-shell border-t border-[var(--border)] bg-surface" aria-labelledby="home-products-title">
      <div className="container-shell">
        <div className="content-shell">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2 id="home-products-title" className="section-heading text-foreground">
                {t("title")}
              </h2>
              <p className="section-copy mt-3">{t("description")}</p>
            </div>
            <Link href="/shop" className="text-link shrink-0">
              {t("sectionCta")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={{ pathname: "/shop", query: { product: item.slug } }}
                  className="group block"
                >
                  <span className="media-frame relative block aspect-square">
                    <LuxuryMedia
                      src={item.imageUrl}
                      alt={item.name}
                      sizes="(min-width: 1024px) 22vw, 46vw"
                      imageClassName="transition duration-700 group-hover:scale-[1.04]"
                    />
                  </span>
                  {item.categoryName ? (
                    <span className="mt-3 block truncate text-[0.8125rem] text-text-soft">{item.categoryName}</span>
                  ) : null}
                  <span className="card-title mt-1 block text-[1.2rem] text-foreground transition group-hover:text-gold-soft sm:text-[1.35rem]">
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
