import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { trimDisplayHeading } from "@/lib/displayText";
import { resolveLocale } from "@/lib/site";

type PageProps = { params: Promise<{ locale: string }> };
type LegalSection = { title: string; text: string };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "AGB" });
  return { title: t("title"), description: t("description") };
}

export default function AgbPage() {
  const t = useTranslations("AGB");
  // Draft content – legal review recommended before final publication.
  return (
    <div className="container-shell"><div className="content-shell space-y-8 py-8 sm:py-10">
      <header className="luxury-panel px-6 py-8 sm:px-8 sm:py-10"><span className="eyebrow">{t("eyebrow")}</span><h1 className="section-title mt-6 text-foreground">{trimDisplayHeading(t("title"))}</h1><p className="mt-6 max-w-3xl text-base leading-7 text-muted sm:text-lg">{t("description")}</p></header>
      <section className="rtl-mirror-grid grid gap-5 md:grid-cols-2">{(t.raw("sections") as LegalSection[]).map((section) => <article key={section.title} className="luxury-panel px-6 py-7 sm:px-8"><h2 className="card-title text-3xl text-foreground">{section.title}</h2><p className="mt-5 text-sm leading-7 text-muted sm:text-base">{section.text}</p></article>)}</section>
    </div></div>
  );
}
