import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "ar", "en", "fr", "tr"],
  defaultLocale: "de",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
