import type { TrackingStatus } from "@/types/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TECHNICAL_ERROR_PATTERN =
  /origin|invalid_format|invalid uuid|zoderror|expected|received|path|code|json|supabase|null|undefined/i;

const importantCustomerStatuses = new Set<TrackingStatus>([
  "created",
  "accepted_by_workshop",
  "in_production",
  "ready_for_pickup",
  "on_the_way",
  "delivered_to_store",
  "completed",
  "cancelled",
]);

export type OrderWorkflowCopy = {
  assignmentDescription: string;
  assignmentSaved: string;
  assignmentTitle: string;
  attachmentsLabel: string;
  createdEmailFallback: string;
  createdEmailFailed: string;
  customerEmailInvalid: string;
  customerLanguage: string;
  customerNoteLabel: string;
  customerNotePlaceholder: string;
  emailLogTitle: string;
  employeeLabel: string;
  employeeRequiresWorkshop: string;
  formErrorFallback: string;
  internalNoteLabel: string;
  internalNotePlaceholder: string;
  invalidSelection: string;
  itemsTitle: string;
  noChanges: string;
  noEmailLogs: string;
  noSupportTickets: string;
  noWorkshopAssigned: string;
  optionVisibilityEmpty: string;
  optionVisibilityHelp: string;
  optionsLabel: (count: number) => string;
  orderCreatedFallback: string;
  orderCreatedSuccess: string;
  productRequired: string;
  quantityInvalid: string;
  requiredLabel: string;
  saveUpdate: string;
  selectLanguage: string;
  selectProduct: string;
  selectStatus: string;
  selectWorkshop: string;
  statusEmailFallback: string;
  statusEmailFailed: string;
  supportTicketsTitle: string;
  technicalCreateFallback: string;
  technicalUpdateFallback: string;
  workshopAssignmentHint: string;
  workshopLabel: string;
  workshopRequired: string;
};

type WorkflowTranslator = (key: string, values?: Record<string, number | string>) => string;

/** Builds the order workflow copy from the "Admin.workflow" message namespace. */
export function buildOrderWorkflowCopy(t: WorkflowTranslator): OrderWorkflowCopy {
  return {
    assignmentDescription: t("assignmentDescription"),
    assignmentSaved: t("assignmentSaved"),
    assignmentTitle: t("assignmentTitle"),
    attachmentsLabel: t("attachmentsLabel"),
    createdEmailFallback: t("createdEmailFallback"),
    createdEmailFailed: t("createdEmailFailed"),
    customerEmailInvalid: t("customerEmailInvalid"),
    customerLanguage: t("customerLanguage"),
    customerNoteLabel: t("customerNoteLabel"),
    customerNotePlaceholder: t("customerNotePlaceholder"),
    emailLogTitle: t("emailLogTitle"),
    employeeLabel: t("employeeLabel"),
    employeeRequiresWorkshop: t("employeeRequiresWorkshop"),
    formErrorFallback: t("formErrorFallback"),
    internalNoteLabel: t("internalNoteLabel"),
    internalNotePlaceholder: t("internalNotePlaceholder"),
    invalidSelection: t("invalidSelection"),
    itemsTitle: t("itemsTitle"),
    noChanges: t("noChanges"),
    noEmailLogs: t("noEmailLogs"),
    noSupportTickets: t("noSupportTickets"),
    noWorkshopAssigned: t("noWorkshopAssigned"),
    optionVisibilityEmpty: t("optionVisibilityEmpty"),
    optionVisibilityHelp: t("optionVisibilityHelp"),
    optionsLabel: (count: number) => t("optionsLabel", { count }),
    orderCreatedFallback: t("orderCreatedFallback"),
    orderCreatedSuccess: t("orderCreatedSuccess"),
    productRequired: t("productRequired"),
    quantityInvalid: t("quantityInvalid"),
    requiredLabel: t("requiredLabel"),
    saveUpdate: t("saveUpdate"),
    selectLanguage: t("selectLanguage"),
    selectProduct: t("selectProduct"),
    selectStatus: t("selectStatus"),
    selectWorkshop: t("selectWorkshop"),
    statusEmailFallback: t("statusEmailFallback"),
    statusEmailFailed: t("statusEmailFailed"),
    supportTicketsTitle: t("supportTicketsTitle"),
    technicalCreateFallback: t("technicalCreateFallback"),
    technicalUpdateFallback: t("technicalUpdateFallback"),
    workshopAssignmentHint: t("workshopAssignmentHint"),
    workshopLabel: t("workshopLabel"),
    workshopRequired: t("workshopRequired"),
  };
}

export function normalizeOptionalUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

export function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalDate(value: unknown) {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return "";
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export function shouldNotifyCustomerForStatus(status: TrackingStatus) {
  return importantCustomerStatuses.has(status);
}

export function getSafeActionErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const message = error.message.trim();

  if (!message || TECHNICAL_ERROR_PATTERN.test(message)) {
    return fallbackMessage;
  }

  if (message.startsWith("Unable to ")) {
    return fallbackMessage;
  }

  return message;
}
