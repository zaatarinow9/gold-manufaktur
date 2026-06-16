import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { LocaleChrome } from "@/components/site/LocaleChrome";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";
import { routing } from "@/i18n/routing";
import { thmanyah } from "@/lib/fonts";
import { createSiteMetadata } from "@/lib/metadata";
import { getDirection, resolveLocale } from "@/lib/site";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<LocaleLayoutProps, "children">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return createSiteMetadata(locale);
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const locale = await resolveLocale(params);
  const direction = getDirection(locale);
  const localeClassName =
    locale === "ar"
      ? `${thmanyah.className} locale-root is-arabic`
      : "locale-root";

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <div
        className={localeClassName}
        dir={direction}
        data-locale={locale}
        data-dir={direction}
      >
        <LocaleChrome navbar={<SiteNavbar />} footer={<SiteFooter />}>
          {children}
        </LocaleChrome>
      </div>
    </NextIntlClientProvider>
  );
}
