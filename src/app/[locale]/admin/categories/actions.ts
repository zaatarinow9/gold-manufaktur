"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { routing, type AppLocale } from "@/i18n/routing";
import { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  createCategory,
  setCategoryActive,
  updateCategory,
  type CategoryInput,
  type CategoryUpdateInput,
} from "@/lib/db/adminCatalog";

function revalidateCategoryViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin/categories`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/shop`);
  });
}

export async function saveCategoryAction(
  locale: AppLocale,
  input: CategoryInput | CategoryUpdateInput
): Promise<AdminActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
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
    return {
      message:
        error instanceof Error ? error.message : t("common.noAccessText"),
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
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
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
      message:
        error instanceof Error ? error.message : t("common.noAccessText"),
      ok: false,
    };
  }
}
