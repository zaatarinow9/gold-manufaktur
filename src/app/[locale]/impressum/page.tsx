import type { Metadata } from "next";
import { useTranslations } from "next-intl";

import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type LegalSection = {
  lines: string | string[];
  title: string;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "impressum");
}

export default function ImpressumPage() {
  const t = useTranslations("Impressum");
  const sections = t.raw("sections") as LegalSection[];

  return (
    <div className="container-shell">
      <div className="content-shell space-y-8 py-8 sm:py-10">
        <header className="luxury-panel px-6 py-8 sm:px-8 sm:py-10">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title mt-6 text-foreground">{t("title")}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted sm:text-lg">
            {t("description")}
          </p>
        </header>

        <section className="luxury-panel px-6 py-7 sm:px-8">
          <p className="muted-label">{t("complianceNoticeTitle")}</p>
          <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
            {t("complianceNoticeDescription")}
          </p>
        </section>

        <section className="rtl-mirror-grid grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            (() => {
              const lines = Array.isArray(section.lines)
                ? section.lines
                : [section.lines];

              return (
                <article
                  key={section.title}
                  className="luxury-panel px-6 py-7 sm:px-8"
                >
                  <h2 className="card-title text-3xl text-foreground">
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-3 text-sm leading-6 text-muted sm:text-base">
                    {lines.map((line) => (
                      <p key={`${section.title}-${line}`}>{line}</p>
                    ))}
                  </div>
                </article>
              );
            })()
          ))}
        </section>

        <section className="luxury-panel px-6 py-7 sm:px-8">
          <p className="muted-label">{t("disclaimerTitle")}</p>
          <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
            {t("disclaimerText")}
          </p>
        </section>
      </div>
    </div>
  );
}
