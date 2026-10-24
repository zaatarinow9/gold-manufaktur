import "server-only";

import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";

import { buildOrderWorkflowCopy } from "./orderWorkflow";
import { buildAdminPrivacyUiCopy } from "./privacy";

/** Order workflow copy for server actions and server components. */
export async function getOrderWorkflowCopy(locale: AppLocale) {
  return buildOrderWorkflowCopy(await getTranslations({ locale, namespace: "Admin.workflow" }));
}

/** Privacy mode copy for server components. */
export async function getAdminPrivacyUiCopy(locale: AppLocale) {
  return buildAdminPrivacyUiCopy(await getTranslations({ locale, namespace: "Admin.privacy" }));
}
