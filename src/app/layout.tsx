import { getLocale } from "next-intl/server";

import { cormorant, inter, thmanyah } from "@/lib/fonts";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const isArabic = locale === "ar";
  const direction = isArabic ? "rtl" : "ltr";
  const htmlClassName = [inter.variable, cormorant.variable, thmanyah.variable, isArabic && "is-arabic"]
    .filter(Boolean)
    .join(" ");
  const bodyClassName = [
    "relative bg-background text-foreground antialiased",
    isArabic && thmanyah.className,
    isArabic && "is-arabic",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang={locale}
      dir={direction}
      data-locale={locale}
      data-dir={direction}
      data-scroll-behavior="smooth"
      className={htmlClassName}
    >
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
