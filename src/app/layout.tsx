import { getLocale } from "next-intl/server";

import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const isArabic = locale === "ar";
  const direction = isArabic ? "rtl" : "ltr";
  const bodyClassName = "relative bg-background text-foreground antialiased";

  return (
    <html
      lang={locale}
      dir={direction}
      data-locale={locale}
      data-dir={direction}
      data-scroll-behavior="smooth"
    >
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
