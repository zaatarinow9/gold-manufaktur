import Image from "next/image";
import { useTranslations } from "next-intl";

import { realProductImages } from "@/data/catalog";
import { SectionHeading } from "./SectionHeading";

export function AboutGoldSection() {
  const t = useTranslations("Home.aboutGold");
  const points = t.raw("points") as string[];
  const visual = realProductImages[4];

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell rtl-mirror-grid grid gap-6 xl:grid-cols-[0.98fr_1.02fr] xl:items-stretch">
          <div className="luxury-panel relative min-h-[22rem] overflow-hidden p-2 sm:min-h-[29rem]">
            <div className="relative h-full min-h-[21rem] overflow-hidden rounded-[28px] border border-white/10 bg-black/35 sm:min-h-[28rem]">
              <Image
                src={visual.src}
                alt={t("imageAlt")}
                fill
                className="object-cover"
                sizes="(max-width: 1279px) 100vw, 48vw"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.72))]" />
              <div className="absolute inset-x-5 bottom-5">
                <span className="gold-chip">{t("eyebrow")}</span>
              </div>
            </div>
          </div>

          <div className="luxury-panel flex h-full flex-col justify-center px-6 py-8 sm:px-8 sm:py-10">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
              titleClassName="text-4xl sm:text-5xl xl:text-[4rem]"
              descriptionClassName="max-w-xl text-base leading-7"
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {points.map((point, index) => (
                <article
                  key={point}
                  className="rounded-[24px] border border-white/10 bg-black/24 px-5 py-5"
                >
                  <span className="gold-chip">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{point}</h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
