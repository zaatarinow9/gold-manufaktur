import type { AppLocale } from "@/i18n/routing";

type AdminPrivacyUiCopy = {
  activeBadge: string;
  activeDescription: string;
  activate: string;
  deactivate: string;
  hidden: string;
  shortcut: string;
};

export function getAdminPrivacyUiCopy(locale: AppLocale): AdminPrivacyUiCopy {
  if (locale === "ar") {
    return {
      activeBadge: "الوصول مقيد",
      activeDescription: "بعض التفاصيل غير متاحة حاليا.",
      activate: "غير متاح",
      deactivate: "غير متاح",
      hidden: "مخفي",
      shortcut: "",
    };
  }

  if (locale === "de") {
    return {
      activeBadge: "Zugriff eingeschraenkt",
      activeDescription: "Einige Details sind derzeit nicht verfuegbar.",
      activate: "Nicht verfuegbar",
      deactivate: "Nicht verfuegbar",
      hidden: "Ausgeblendet",
      shortcut: "",
    };
  }

  if (locale === "fr") {
    return {
      activeBadge: "Acces limite",
      activeDescription: "Certains details sont indisponibles pour le moment.",
      activate: "Indisponible",
      deactivate: "Indisponible",
      hidden: "Masque",
      shortcut: "",
    };
  }

  if (locale === "tr") {
    return {
      activeBadge: "Erisim sinirli",
      activeDescription: "Bazi ayrintilar su anda kullanilamiyor.",
      activate: "Kullanilamiyor",
      deactivate: "Kullanilamiyor",
      hidden: "Gizli",
      shortcut: "",
    };
  }

  return {
    activeBadge: "Restricted",
    activeDescription: "Some details are unavailable right now.",
    activate: "Unavailable",
    deactivate: "Unavailable",
    hidden: "Hidden",
    shortcut: "",
  };
}
