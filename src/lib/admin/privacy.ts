import type { AppLocale } from "@/i18n/routing";

export const ADMIN_PRIVACY_STORAGE_KEY = "goldhelwah-admin-privacy-mode";

export function getAdminPrivacyUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      activeBadge: "وضع الخصوصية مفعل",
      activeDescription:
        "يتم إخفاء أسماء العملاء وأرقام الهواتف والبريد الإلكتروني وملاحظات الطلب وروابط التتبع مؤقتًا على هذا المتصفح.",
      activate: "تفعيل وضع الخصوصية",
      deactivate: "إيقاف وضع الخصوصية",
      hidden: "مخفي",
      shortcut: "يمكنك أيضًا استخدام الاختصار Ctrl + Shift + H.",
    };
  }

  if (locale === "de") {
    return {
      activeBadge: "Privatsphaerenmodus aktiv",
      activeDescription:
        "Kundennamen, Telefon, E-Mail, Notizen und Tracking-Links werden in diesem Browser voruebergehend ausgeblendet.",
      activate: "Privatsphaerenmodus aktivieren",
      deactivate: "Privatsphaerenmodus deaktivieren",
      hidden: "Versteckt",
      shortcut: "Alternativ koennen Sie auch Strg + Umschalt + H verwenden.",
    };
  }

  return {
    activeBadge: "Privacy mode enabled",
    activeDescription:
      "Customer names, phone numbers, email addresses, notes, and tracking links are temporarily hidden in this browser.",
    activate: "Enable privacy mode",
    deactivate: "Disable privacy mode",
    hidden: "Hidden",
    shortcut: "You can also use the Ctrl + Shift + H shortcut.",
  };
}
