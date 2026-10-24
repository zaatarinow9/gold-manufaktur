"use client";

import { useTranslations } from "next-intl";

import { buildOrderWorkflowCopy } from "./orderWorkflow";
import { buildAdminPrivacyUiCopy } from "./privacy";

/** Order workflow copy for client components. */
export function useOrderWorkflowCopy() {
  return buildOrderWorkflowCopy(useTranslations("Admin.workflow"));
}

/** Privacy mode copy for client components. */
export function useAdminPrivacyUiCopy() {
  return buildAdminPrivacyUiCopy(useTranslations("Admin.privacy"));
}
