import type { Metadata } from "next";
import { useTranslations } from "next-intl";

import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type PrivacySection = {
  paragraphs: string[];
  title: string;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "privacy");
}

export default function PrivacyPage() {
  const t = useTranslations("Privacy");
  const sections = t.raw("sections") as PrivacySection[];

  return (
    <div className="container-shell">
      <div className="content-shell space-y-8 py-8 sm:py-10">
        <header className="luxury-panel px-6 py-8 sm:px-8 sm:py-10">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title mt-6 text-foreground">{t("title")}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted sm:text-lg">
            {t("description")}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">
            {t("intro")}
          </p>
        </header>

        <section className="grid gap-5">
          {sections.map((section) => (
            <article
              key={section.title}
              className="luxury-panel px-6 py-7 sm:px-8"
            >
              <h2 className="card-title text-3xl text-foreground">
                {section.title}
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-muted sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="luxury-panel px-6 py-7 sm:px-8">
          <p className="muted-label">{t("noticeTitle")}</p>
          <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
            {t("noticeText")}
          </p>
        </section>
      </div>
    </div>
  );
}
