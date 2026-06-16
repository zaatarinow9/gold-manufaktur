import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  getCategoryBySlug,
  homepageEditorialProducts,
} from "@/data/catalog";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "./SectionHeading";

export function FeaturedProducts() {
  const t = useTranslations("Home.products");
  const items = homepageEditorialProducts.slice(0, 4);

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

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,11,0.92),rgba(9,9,9,0.96))] shadow-[0_22px_65px_rgba(0,0,0,0.28)]"
              >
                <div className="relative aspect-[4/4.8] overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.05]"
                    sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.4))]" />
                </div>

                <div className="space-y-4 px-6 py-6 text-start">
                  <span className="gold-chip">
                    {getCategoryBySlug(item.categorySlug)?.name ?? item.categorySlug}
                  </span>
                  <h3 className="text-xl font-semibold text-foreground">
                    {item.name}
                  </h3>
                  <p className="text-sm leading-6 text-muted">
                    {item.shortDescription}
                  </p>

                  <Link
                    href="/shop"
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
      </div>
    </section>
  );
}
