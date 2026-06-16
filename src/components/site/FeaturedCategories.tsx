import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { getCategoryBySlug, homepageCategorySlugs } from "@/data/catalog";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "./SectionHeading";

export function FeaturedCategories() {
  const t = useTranslations("Home.categories");
  const items = homepageCategorySlugs
    .map((slug) => getCategoryBySlug(slug))
    .filter((item) => item !== undefined)
    .slice(0, 6);

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

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.slug}
                href="/shop"
                className="group relative aspect-[4/4.8] overflow-hidden rounded-[30px] border border-white/10 bg-black/30"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.05]"
                  sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw"
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
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
