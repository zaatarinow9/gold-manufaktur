import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CatalogProduct } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { SectionHeading } from "./SectionHeading";

type CollectionShowcaseProps = {
  products: CatalogProduct[];
};

export function CollectionShowcase({
  products,
}: CollectionShowcaseProps) {
  const t = useTranslations("Home.showcase");
  const leadProduct = products[0];
  const supportingProducts = products.slice(1, 4);

  return (
    <section className="section-shell pt-0">
      <div className="container-shell">
        <div className="content-shell space-y-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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

          {leadProduct ? (
            <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
              <article className="group overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,11,0.92),rgba(8,8,8,0.98))] shadow-[0_28px_75px_rgba(0,0,0,0.3)]">
                <div className="relative min-h-[24rem] overflow-hidden sm:min-h-[30rem]">
                  <LuxuryMedia
                    src={leadProduct.imageUrl}
                    alt={leadProduct.name}
                    sizes="(max-width: 1279px) 100vw, 56vw"
                    imageClassName="transition duration-700 group-hover:scale-[1.04]"
                    fallbackContent={
                      <div className="absolute inset-x-6 bottom-6">
                        <span className="gold-chip">{leadProduct.categoryName}</span>
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.84))]" />
                </div>

                <div className="space-y-5 px-6 py-7 sm:px-8">
                  <span className="gold-chip">{leadProduct.categoryName}</span>
                  <div>
                    <h3 className="card-title text-3xl text-foreground sm:text-4xl">
                      {leadProduct.name}
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                      {leadProduct.shortDescription}
                    </p>
                  </div>

                  <Link
                    href={{ pathname: "/shop", query: { category: leadProduct.categorySlug } }}
                    className="rtl-inline-row inline-flex items-center gap-2 text-sm font-medium text-gold-soft transition hover:text-foreground"
                  >
                    {t("leadCta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {supportingProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group rtl-mirror-grid overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,15,11,0.9),rgba(8,8,8,0.98))] sm:grid-cols-[0.9fr_1.1fr] xl:grid-cols-[0.86fr_1.14fr]"
                  >
                    <div className="relative min-h-[14rem] overflow-hidden">
                      <LuxuryMedia
                        src={product.imageUrl}
                        alt={product.name}
                        sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 22vw"
                        imageClassName="transition duration-700 group-hover:scale-[1.04]"
                        fallbackContent={
                          <div className="absolute inset-x-5 bottom-5">
                            <span className="gold-chip">{product.categoryName}</span>
                          </div>
                        }
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/12 to-transparent" />
                    </div>

                    <div className="flex flex-col justify-center gap-4 px-5 py-5 text-start">
                      <span className="gold-chip">{product.categoryName}</span>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {product.name}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          {product.shortDescription}
                        </p>
                      </div>
                      <Link
                        href={{ pathname: "/shop", query: { category: product.categorySlug } }}
                        className="rtl-inline-row inline-flex items-center gap-2 text-sm font-medium text-gold-soft transition hover:text-foreground"
                      >
                        {t("cardCta")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,13,0.92),rgba(9,9,9,0.98))] px-6 py-12 text-center sm:px-8">
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
