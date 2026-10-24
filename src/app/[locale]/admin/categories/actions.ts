"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import { AdminActionResult } from "@/lib/admin/actionResult";
import { getSafeActionErrorMessage } from "@/lib/admin/orderWorkflow";
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
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/categories`);
    revalidatePath(`/${locale}/admin/gallery`);
    revalidatePath(`/${locale}/admin/gallery/new-order`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/shop`);
    revalidatePath(`/${locale}/tracking`);
  });
}

async function guardCategoryAction(locale: AppLocale): Promise<AdminActionResult | null> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return { message: t("common.noAccessText"), ok: false };
  }

  if (await isAdminDecoyEnabled()) {
    return { message: getAdminDecoyUnavailableMessage(locale), ok: false };
  }

  return null;
}

export async function saveCategoryAction(
  locale: AppLocale,
  input: CategoryInput | CategoryUpdateInput
): Promise<AdminActionResult> {
  const blocked = await guardCategoryAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });
  const isUpdate = "id" in input && typeof input.id === "string";

  try {
    if (isUpdate) {
      await updateCategory(input as CategoryUpdateInput);
    } else {
      await createCategory(input as CategoryInput);
    }

    revalidateCategoryViews();

    return {
      message: t(`categoriesPage.messages.${isUpdate ? "updated" : "created"}`),
      ok: true,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};

      for (const issue of error.issues) {
        const path = issue.path.join(".");
        if (!path || fieldErrors[path]) continue;
        fieldErrors[path] =
          path === "slug"
            ? t("forms.invalidSlug")
            : issue.code === "too_big"
              ? t("forms.tooLong")
              : path.startsWith("name.")
                ? t("forms.required")
                : t("forms.invalidValue");
      }

      return { fieldErrors, message: t("forms.checkFields"), ok: false };
    }

    if (error instanceof Error && error.message === "INVALID_CATEGORY_SLUG") {
      return {
        fieldErrors: { slug: t("forms.invalidSlug") },
        message: t("forms.checkFields"),
        ok: false,
      };
    }

    console.error("[saveCategoryAction] Category save failed", error);
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}

export async function toggleCategoryActiveAction(
  locale: AppLocale,
  categoryId: string,
  isActive: boolean
): Promise<AdminActionResult> {
  const blocked = await guardCategoryAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });

  try {
    await setCategoryActive(categoryId, isActive);
    revalidateCategoryViews();
    return {
      message: t(`categoriesPage.messages.${isActive ? "shown" : "hidden"}`),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}

export async function deleteCategoryAction(
  locale: AppLocale,
  categoryId: string
): Promise<AdminActionResult> {
  const blocked = await guardCategoryAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });

  try {
    await deleteCategory(categoryId);
    revalidateCategoryViews();
    return { message: t("categoriesPage.messages.deleted"), ok: true };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}
