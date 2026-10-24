"use server";

import { getOrderWorkflowCopy } from "@/lib/admin/adminCopy.server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ZodError } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import {
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import {
  archiveOrder,
  createOrder,
  deleteOrder,
  updateOrderWorkflow,
  withdrawOrderAssignment,
  type OrderCreatePayload,
  type OrderWorkflowUpdatePayload,
} from "@/lib/db/orders";
import {
  assignOrderToEmployee,
  updateMyAssignmentStatus,
} from "@/lib/db/orderAssignments";

type OrderActionResult =
  | {
      fieldErrors?: Record<string, string>;
      message: string;
      ok: false;
    }
  | {
      fieldErrors?: Record<string, string>;
      message: string;
      ok: true;
      orderId?: string;
      trackingNumber?: string;
    };

function getFieldErrorKey(path: ReadonlyArray<PropertyKey>) {
  const [first, second, third] = path;

  if (typeof first !== "string") {
    return "";
  }

  if (first === "notes" && typeof second === "string") {
    return `notes.${second}`;
  }

  if (first === "productSpecifications") {
    return [first, second, third]
      .filter((part): part is string => typeof part === "string")
      .join(".");
  }

  return first;
}

async function getOrderFieldErrors(locale: AppLocale, error: ZodError) {
  const copy = (await getOrderWorkflowCopy(locale));
  const fieldErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const key = getFieldErrorKey(issue.path);

    if (!key || fieldErrors[key]) {
      return;
    }

    switch (key) {
      case "customerEmail":
        fieldErrors.customerEmail = copy.customerEmailInvalid;
        break;
      case "customerName":
        fieldErrors.customerName =
          issue.code === "too_small" ? "customerNameRequired" : copy.formErrorFallback;
        break;
      case "employeeId":
        fieldErrors.employeeId = copy.invalidSelection;
        break;
      case "orderId":
        fieldErrors.orderId = copy.invalidSelection;
        break;
      case "productId":
        fieldErrors.productId = copy.productRequired;
        break;
      case "productSpecifications.karat":
        fieldErrors["productSpecifications.karat"] = "productKaratRequired";
        break;
      case "productSpecifications.weightGrams":
        fieldErrors["productSpecifications.weightGrams"] = "productWeightRequired";
        break;
      case "productSpecifications.nameCustomization.language":
        fieldErrors["productSpecifications.nameCustomization.language"] =
          "nameCustomizationLanguageRequired";
        break;
      case "productSpecifications.nameCustomization.text":
        fieldErrors["productSpecifications.nameCustomization.text"] =
          "nameCustomizationTextRequired";
        break;
      case "quantity":
        fieldErrors.quantity = copy.quantityInvalid;
        break;
      case "status":
        fieldErrors.status = copy.selectStatus;
        break;
      case "workerEmail":
        fieldErrors.workerEmail = "workerEmailInvalid";
        break;
      case "workshopId":
        fieldErrors.workshopId = copy.invalidSelection;
        break;
      default:
        fieldErrors[key] = copy.formErrorFallback;
        break;
    }
  });

  return fieldErrors;
}

async function getLocalizedFieldErrors(locale: AppLocale, error: ZodError) {
  const fieldErrors = await getOrderFieldErrors(locale, error);
  const tf = await getTranslations({ locale, namespace: "Admin.orderMessages" });

  if (fieldErrors.customerName === "customerNameRequired") {
    fieldErrors.customerName = tf("customerNameRequired");
  }

  if (fieldErrors["productSpecifications.karat"] === "productKaratRequired") {
    fieldErrors["productSpecifications.karat"] = tf("productKaratRequired");
  }

  if (
    fieldErrors["productSpecifications.weightGrams"] === "productWeightRequired"
  ) {
    fieldErrors["productSpecifications.weightGrams"] =
      tf("productWeightRequired");
  }

  if (
    fieldErrors["productSpecifications.nameCustomization.language"] ===
    "nameCustomizationLanguageRequired"
  ) {
    fieldErrors["productSpecifications.nameCustomization.language"] =
      tf("nameCustomizationLanguageRequired");
  }

  if (
    fieldErrors["productSpecifications.nameCustomization.text"] ===
    "nameCustomizationTextRequired"
  ) {
    fieldErrors["productSpecifications.nameCustomization.text"] =
      tf("nameCustomizationTextRequired");
  }

  if (fieldErrors.workerEmail === "workerEmailInvalid") {
    fieldErrors.workerEmail = tf("workerEmailInvalid");
  }

  return fieldErrors;
}

type OrderMessageKey =
  | "archived"
  | "assignmentFallback"
  | "assignmentFailed"
  | "assignmentSaved"
  | "deleted"
  | "taskSaved"
  | "withdrawn";

async function getOrderMessage(locale: AppLocale, key: OrderMessageKey) {
  const t = await getTranslations({ locale, namespace: "Admin.orderMessages" });
  return t(key);
}

async function getLifecycleMessage(locale: AppLocale, key: "archived" | "deleted" | "withdrawn") {
  return getOrderMessage(locale, key);
}

async function getAssignmentEmailMessage(locale: AppLocale, key: "fallback" | "failed" | "saved") {
  return getOrderMessage(
    locale,
    key === "fallback" ? "assignmentFallback" : key === "failed" ? "assignmentFailed" : "assignmentSaved"
  );
}

async function getTaskSavedMessage(locale: AppLocale) {
  return getOrderMessage(locale, "taskSaved");
}

async function getOrderFailure(
  locale: AppLocale,
  error: unknown,
  mode: "create" | "update"
) {
  const copy = (await getOrderWorkflowCopy(locale));
  const t = await getTranslations({ locale, namespace: "Admin" });
  const tf = await getTranslations({ locale, namespace: "Admin.orderMessages" });
  const fallbackMessage =
    mode === "create" ? copy.technicalCreateFallback : copy.technicalUpdateFallback;

  if (error instanceof ZodError) {
    const fieldErrors = await getLocalizedFieldErrors(locale, error);

    return {
      fieldErrors,
      message: Object.values(fieldErrors)[0] ?? fallbackMessage,
      ok: false as const,
    };
  }

  if (error instanceof Error) {
    switch (error.message) {
      case "INVALID_EMPLOYEE_SELECTION":
      case "INVALID_EMPLOYEE_WORKSHOP":
        return {
          fieldErrors: { employeeId: copy.invalidSelection },
          message: copy.invalidSelection,
          ok: false as const,
        };
      case "INVALID_WORKSHOP_SELECTION":
        return {
          fieldErrors: { workshopId: copy.invalidSelection },
          message: copy.invalidSelection,
          ok: false as const,
        };
      case "NAME_CUSTOMIZATION_LANGUAGE_REQUIRED":
        return {
          fieldErrors: {
            "productSpecifications.nameCustomization.language":
              tf("nameCustomizationLanguageRequired"),
          },
          message: tf("nameCustomizationLanguageRequired"),
          ok: false as const,
        };
      case "NAME_CUSTOMIZATION_TEXT_REQUIRED":
        return {
          fieldErrors: {
            "productSpecifications.nameCustomization.text":
              tf("nameCustomizationTextRequired"),
          },
          message: tf("nameCustomizationTextRequired"),
          ok: false as const,
        };
      case "ORDER_ASSIGNMENT_FORBIDDEN":
      case "ORDER_CREATE_FORBIDDEN":
        return {
          message: t("common.noAccessText"),
          ok: false as const,
        };
      case "ORDER_NOT_FOUND":
        return {
          message: fallbackMessage,
          ok: false as const,
        };
      case "WORKSHOP_REQUIRED_FOR_EMPLOYEE":
        return {
          fieldErrors: { workshopId: copy.employeeRequiresWorkshop },
          message: copy.employeeRequiresWorkshop,
          ok: false as const,
        };
      default:
        break;
    }
  }

  return {
    message: getSafeActionErrorMessage(error, fallbackMessage),
    ok: false as const,
  };
}

function revalidateOrderViews(orderId?: string, trackingNumber?: string) {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/orders`);

    if (orderId) {
      revalidatePath(`/${locale}/admin/orders/${orderId}`);
    }

    if (trackingNumber) {
      revalidatePath(`/${locale}/tracking/${trackingNumber}`);
    }
  });
}

export async function createOrderAction(
  locale: AppLocale,
  input: OrderCreatePayload
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = (await getOrderWorkflowCopy(locale));
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await createOrder(access.user, input, locale);
    revalidateOrderViews(result.orderId, result.trackingNumber);

    let message = copy.orderCreatedSuccess;

    if (result.emailResult?.fallback) {
      message = copy.createdEmailFallback;
    } else if (result.emailResult && !result.emailResult.ok) {
      message = copy.createdEmailFailed;
    }

    return {
      message,
      ok: true,
      orderId: result.orderId,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "create");
  }
}

export async function updateOrderWorkflowAction(
  locale: AppLocale,
  input: OrderWorkflowUpdatePayload
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = (await getOrderWorkflowCopy(locale));
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await updateOrderWorkflow(access.user, input, locale);
    revalidateOrderViews(input.orderId, result.trackingNumber);

    let message = copy.assignmentSaved;

    if (result.emailResult?.delivered) {
      message = t("orders.publicStageSavedAndNotified");
    } else if (result.emailResult?.fallback) {
      message = copy.statusEmailFallback;
    } else if (result.emailResult && !result.emailResult.ok) {
      message = copy.statusEmailFailed;
    }

    return {
      message,
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "update");
  }
}

export async function assignOrderToEmployeeAction(
  locale: AppLocale,
  input: {
    assignmentNote: string;
    employeeId: string;
    orderId: string;
  }
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin", "employee"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await assignOrderToEmployee(access.user, input);
    revalidateOrderViews(input.orderId, result.trackingNumber);

    let message = await getAssignmentEmailMessage(locale, "saved");

    if (result.emailResult?.fallback) {
      message = await getAssignmentEmailMessage(locale, "fallback");
    } else if (result.emailResult && !result.emailResult.ok) {
      message = await getAssignmentEmailMessage(locale, "failed");
    }

    return {
      message,
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "update");
  }
}

export async function updateMyTaskAction(
  locale: AppLocale,
  input: {
    employeeNote: string;
    orderId: string;
    status: "assigned" | "accepted" | "in_progress" | "waiting" | "completed";
  }
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["employee"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await updateMyAssignmentStatus(access.user, input);
    revalidateOrderViews(input.orderId, result.trackingNumber);

    return {
      message: await getTaskSavedMessage(locale),
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "update");
  }
}

export async function archiveOrderAction(
  locale: AppLocale,
  orderId: string
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await archiveOrder(access.user, orderId);
    revalidateOrderViews(orderId, result.trackingNumber);
    return {
      message: await getLifecycleMessage(locale, "archived"),
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "update");
  }
}

export async function deleteOrderAction(
  locale: AppLocale,
  orderId: string
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await deleteOrder(access.user, orderId);
    revalidateOrderViews(orderId, result.trackingNumber);
    return {
      message: await getLifecycleMessage(locale, "deleted"),
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "update");
  }
}

export async function withdrawOrderAssignmentAction(
  locale: AppLocale,
  orderId: string
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    const result = await withdrawOrderAssignment(access.user, orderId);
    revalidateOrderViews(orderId, result.trackingNumber);
    return {
      message: await getLifecycleMessage(locale, "withdrawn"),
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return getOrderFailure(locale, error, "update");
  }
}
