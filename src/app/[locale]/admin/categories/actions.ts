"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import { AdminActionResult } from "@/lib/admin/actionResult";
import {
  getOrderWorkflowCopy,
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import {
  createCategory,
  deleteCategory,
  setCategoryActive,
  updateCategory,
  type CategoryInput,
  type CategoryUpdateInput,
} from "@/lib/db/adminCatalog";

function revalidateCategoryViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/categories`);
    revalidatePath(`/${locale}/admin/gallery`);
    revalidatePath(`/${locale}/admin/gallery/new-order`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/shop`);
    revalidatePath(`/${locale}/tracking`);
  });
}

function getRequiredFieldLabel(locale: AppLocale) {
  if (locale === "de") {
    return "Bitte fuellen Sie dieses Pflichtfeld aus.";
  }

  if (locale === "ar") {
    return "يرجى تعبئة هذا الحقل المطلوب.";
  }

  if (locale === "fr") {
    return "Veuillez renseigner ce champ obligatoire.";
  }

  if (locale === "tr") {
    return "Lutfen bu zorunlu alani doldurun.";
  }

  return "Please complete this required field.";
}

function getInvalidSlugMessage(locale: AppLocale) {
  if (locale === "de") {
    return "Bitte geben Sie einen gueltigen Slug ein oder lassen Sie das Feld leer.";
  }

  if (locale === "ar") {
    return "يرجى إدخال slug صالح أو ترك الحقل فارغاً.";
  }

  if (locale === "fr") {
    return "Saisissez un slug valide ou laissez ce champ vide.";
  }

  if (locale === "tr") {
    return "Lutfen gecerli bir slug girin veya alani bos birakin.";
  }

  return "Enter a valid slug or leave the field empty.";
}

function getCategoryFieldErrors(locale: AppLocale, error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  const requiredMessage = getRequiredFieldLabel(locale);

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    if (!path || fieldErrors[path]) {
      continue;
    }

    switch (path) {
      case "name.de":
      case "name.ar":
        fieldErrors[path] = requiredMessage;
        break;
      case "slug":
        fieldErrors.slug = getInvalidSlugMessage(locale);
        break;
      default:
        fieldErrors[path] = issue.message || requiredMessage;
        break;
    }
  }

  return fieldErrors;
}

function getCategoryDeleteMessage(locale: AppLocale) {
  if (locale === "de") {
    return "Das Element wurde aus dem System entfernt.";
  }

  if (locale === "ar") {
    return "تم حذف العنصر من النظام.";
  }

  if (locale === "fr") {
    return "L'element a ete retire du systeme.";
  }

  if (locale === "tr") {
    return "Oge sistemden kaldirildi.";
  }

  return "The item was removed from the system.";
}

export async function saveCategoryAction(
  locale: AppLocale,
  input: CategoryInput | CategoryUpdateInput
): Promise<AdminActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
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
    if ("id" in input && typeof input.id === "string") {
      await updateCategory(input as CategoryUpdateInput);
    } else {
      await createCategory(input as CategoryInput);
    }

    revalidateCategoryViews();

    return {
      message: t("common.mockSubmit"),
      ok: true,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = getCategoryFieldErrors(locale, error);
      return {
        fieldErrors,
        message: Object.values(fieldErrors)[0] ?? copy.formErrorFallback,
        ok: false,
      };
    }

    if (error instanceof Error && error.message === "INVALID_CATEGORY_SLUG") {
      const message = getInvalidSlugMessage(locale);
      return {
        fieldErrors: { slug: message },
        message,
        ok: false,
      };
    }

    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}

export async function toggleCategoryActiveAction(
  locale: AppLocale,
  categoryId: string,
  isActive: boolean
): Promise<AdminActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
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
    await setCategoryActive(categoryId, isActive);
    revalidateCategoryViews();

    return {
      message: t("common.mockSubmit"),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}

export async function deleteCategoryAction(
  locale: AppLocale,
  categoryId: string
): Promise<AdminActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
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
    await deleteCategory(categoryId);
    revalidateCategoryViews();

    return {
      message: getCategoryDeleteMessage(locale),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}
