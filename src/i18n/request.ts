import { getRequestConfig } from "next-intl/server";

import { routing, type AppLocale } from "./routing";

function hasLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale =
    requestedLocale && hasLocale(requestedLocale)
      ? requestedLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
