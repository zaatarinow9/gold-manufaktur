"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import {
  getOrderWorkflowCopy,
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  createOrder,
  updateOrderWorkflow,
  type OrderCreatePayload,
  type OrderWorkflowUpdatePayload,
} from "@/lib/db/orders";

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

function getLocalizedOrderFieldMessage(
  locale: AppLocale,
  key:
    | "customerNameRequired"
    | "nameCustomizationLanguageRequired"
    | "nameCustomizationTextRequired"
    | "productKaratRequired"
    | "productWeightRequired"
) {
  switch (key) {
    case "customerNameRequired":
      return locale === "de"
        ? "Bitte geben Sie den Kundennamen ein."
        : locale === "ar"
          ? "يرجى إدخال اسم العميل."
          : "Please enter the customer name.";
    case "nameCustomizationLanguageRequired":
      return locale === "de"
        ? "Bitte waehlen Sie eine Designsprache aus."
        : locale === "ar"
          ? "يرجى اختيار لغة التصميم."
          : "Please select a design language.";
    case "nameCustomizationTextRequired":
      return locale === "de"
        ? "Bitte geben Sie den gewuenschten Namen ein."
        : locale === "ar"
          ? "يرجى إدخال الاسم المطلوب."
          : "Please enter the requested name.";
    case "productKaratRequired":
      return locale === "de"
        ? "Bitte waehlen Sie eine Legierung aus."
        : locale === "ar"
          ? "يرجى اختيار العيار."
          : "Please select a karat value.";
    case "productWeightRequired":
      return locale === "de"
        ? "Bitte geben Sie ein gueltiges Gewicht in Gramm ein."
        : locale === "ar"
          ? "يرجى إدخال وزن صحيح بالغرام."
          : "Please enter a valid weight in grams.";
  }
}

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

function getOrderFieldErrors(locale: AppLocale, error: ZodError) {
  const copy = getOrderWorkflowCopy(locale);
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
        fieldErrors.customerName = issue.code === "too_small"
          ? "customerNameRequired"
          : copy.formErrorFallback;
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

async function getLocalizedFieldErrors(
  locale: AppLocale,
  error: ZodError
) {
  const fieldErrors = getOrderFieldErrors(locale, error);

  if (fieldErrors.customerName === "customerNameRequired") {
    fieldErrors.customerName = getLocalizedOrderFieldMessage(
      locale,
      "customerNameRequired"
    );
  }

  if (fieldErrors["productSpecifications.karat"] === "productKaratRequired") {
    fieldErrors["productSpecifications.karat"] = getLocalizedOrderFieldMessage(
      locale,
      "productKaratRequired"
    );
  }

  if (
    fieldErrors["productSpecifications.weightGrams"] === "productWeightRequired"
  ) {
    fieldErrors["productSpecifications.weightGrams"] =
      getLocalizedOrderFieldMessage(locale, "productWeightRequired");
  }

  if (
    fieldErrors["productSpecifications.nameCustomization.language"] ===
    "nameCustomizationLanguageRequired"
  ) {
    fieldErrors["productSpecifications.nameCustomization.language"] =
      getLocalizedOrderFieldMessage(locale, "nameCustomizationLanguageRequired");
  }

  if (
    fieldErrors["productSpecifications.nameCustomization.text"] ===
    "nameCustomizationTextRequired"
  ) {
    fieldErrors["productSpecifications.nameCustomization.text"] =
      getLocalizedOrderFieldMessage(locale, "nameCustomizationTextRequired");
  }

  return fieldErrors;
}

async function getOrderFailure(
  locale: AppLocale,
  error: unknown,
  mode: "create" | "update"
) {
  const copy = getOrderWorkflowCopy(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
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
              getLocalizedOrderFieldMessage(
                locale,
                "nameCustomizationLanguageRequired"
              ),
          },
          message: getLocalizedOrderFieldMessage(
            locale,
            "nameCustomizationLanguageRequired"
          ),
          ok: false as const,
        };
      case "NAME_CUSTOMIZATION_TEXT_REQUIRED":
        return {
          fieldErrors: {
            "productSpecifications.nameCustomization.text":
              getLocalizedOrderFieldMessage(locale, "nameCustomizationTextRequired"),
          },
          message: getLocalizedOrderFieldMessage(
            locale,
            "nameCustomizationTextRequired"
          ),
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
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
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
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, [
    "super_admin",
    "admin",
    "employee",
  ]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
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
