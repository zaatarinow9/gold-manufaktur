import { defineRouting } from "next-intl/routing";

export const appLocaleValues = ["de", "ar", "en", "fr", "tr"] as const;

export const routing = defineRouting({
  locales: appLocaleValues,
  defaultLocale: "de",
  localePrefix: "always",
});

export type AppLocale = (typeof appLocaleValues)[number];
