import { getLocale } from "next-intl/server";

import { cormorant, inter, thmanyah } from "@/lib/fonts";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const direction = locale === "ar" ? "rtl" : "ltr";
  const bodyFontClassName = locale === "ar" ? thmanyah.className : "";

  return (
    <html
      lang={locale}
      dir={direction}
      data-locale={locale}
      data-dir={direction}
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${cormorant.variable} ${thmanyah.variable}${locale === "ar" ? " is-arabic" : ""}`}
    >
      <body
        className={`relative bg-background text-foreground antialiased ${bodyFontClassName}`}
      >
        {children}
      </body>
    </html>
  );
}
