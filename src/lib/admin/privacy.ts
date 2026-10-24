export type AdminPrivacyUiCopy = {
  activeBadge: string;
  activeDescription: string;
  activate: string;
  deactivate: string;
  hidden: string;
  shortcut: string;
};

/** Builds the privacy copy from the "Admin.privacy" message namespace. */
export function buildAdminPrivacyUiCopy(t: (key: string) => string): AdminPrivacyUiCopy {
  return {
    activeBadge: t("activeBadge"),
    activeDescription: t("activeDescription"),
    activate: t("activate"),
    deactivate: t("deactivate"),
    hidden: t("hidden"),
    shortcut: t("shortcut"),
  };
}
