import { notFound } from "next/navigation";

import { routing, type AppLocale } from "@/i18n/routing";
import { getPhoneHref, getWhatsAppHref, normalizePhoneNumber } from "@/lib/phone";

export const siteName = "GoldHelwah GmbH";
export const brandLogoPath = "/brand/goldhelwah-logo.svg";

export const siteNavigation = [
  { href: "/", key: "home" },
  { href: "/shop", key: "shop" },
  { href: "/tracking", key: "tracking" },
  { href: "/contact", key: "contact" },
  { href: "/impressum", key: "impressum" },
  { href: "/datenschutz", key: "privacy" },
] as const;

export const localeLabels: Record<AppLocale, string> = {
  de: "Deutsch",
  ar: "العربية",
  en: "English",
  fr: "Français",
  tr: "Türkçe",
};

const rtlLocales = new Set<AppLocale>(["ar"]);
const companyPhoneNumber = normalizePhoneNumber("+49 173 5371225");

export const companyInfo = {
  name: "GoldHelwah GmbH",
  address: "Breite Straße 9, 66115 Saarbrücken",
  emailDisplay: "service@goldhelwah.de",
  emailHref: "mailto:service@goldhelwah.de",
  phoneDisplay: "+49 173 5371225",
  phoneHref: getPhoneHref(companyPhoneNumber),
  instagramHref: "https://instagram.com/goldhelwah",
  facebookHref: "https://facebook.com/goldhelwah",
  tiktokHref: "https://tiktok.com/@goldhelwah",
  whatsappHref: getWhatsAppHref(companyPhoneNumber),
} as const;

const mapQuery = encodeURIComponent(companyInfo.address);

export const companyDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
export const companyMapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&z=16&output=embed`;

export function isValidLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

export function getDirection(locale: AppLocale) {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}

export function getBrandLogoAlt(locale: AppLocale) {
  if (locale === "de") {
    return "GoldHelwah GmbH Logo";
  }

  if (locale === "ar") {
    return "شعار GoldHelwah GmbH";
  }

  return "GoldHelwah GmbH logo";
}

export async function resolveLocale(
  params: Promise<{ locale: string }>
): Promise<AppLocale> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return locale;
}
