import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";

type PageKey = "home" | "shop" | "contact" | "impressum" | "privacy";

export async function createSiteMetadata(
  locale: AppLocale
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Metadata.site" });

  return {
    applicationName: t("brand"),
    title: {
      default: t("title"),
      template: `%s | ${t("brand")}`,
    },
    description: t("description"),
    keywords: t.raw("keywords") as string[],
  };
}

export async function createPageMetadata(
  locale: AppLocale,
  page: PageKey
): Promise<Metadata> {
  const site = await getTranslations({ locale, namespace: "Metadata.site" });
  const t = await getTranslations({
    locale,
    namespace: `Metadata.pages.${page}`,
  });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: site("brand"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}
