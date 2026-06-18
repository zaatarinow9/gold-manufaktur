"use client";

import { useEffect } from "react";

import type { AppLocale } from "@/i18n/routing";

type LocaleDocumentSyncProps = {
  direction: "ltr" | "rtl";
  locale: AppLocale;
};

export function LocaleDocumentSync({
  direction,
  locale,
}: LocaleDocumentSyncProps) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.lang = locale;
    html.dir = direction;
    html.dataset.locale = locale;
    html.dataset.dir = direction;

    body.dir = direction;
    body.dataset.locale = locale;
    body.dataset.dir = direction;
  }, [direction, locale]);

  return null;
}
