"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { routing, type AppLocale } from "@/i18n/routing";
import { AdminActionResult } from "@/lib/admin/actionResult";
import {
  getOrderWorkflowCopy,
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
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

  try {
    const result = await deleteCategory(categoryId);
    revalidateCategoryViews();

    if (result.mode === "blocked_has_products") {
      return {
        message: locale === "de"
          ? "Die Kategorie kann nicht geloescht werden, da sie Produkte enthaelt."
          : locale === "ar"
            ? "لا يمكن حذف التصنيف لأنه يحتوي على منتجات."
            : locale === "fr"
              ? "Cette categorie ne peut pas etre supprimee car elle contient des produits."
              : locale === "tr"
                ? "Bu kategori urunler icerdigi icin silinemez."
            : "This category cannot be deleted because it still contains products.",
        ok: false,
      };
    }

    return {
      message: locale === "de"
        ? "Die Kategorie wurde geloescht."
        : locale === "ar"
          ? "تم حذف التصنيف."
          : locale === "fr"
            ? "La categorie a ete supprimee."
            : locale === "tr"
              ? "Kategori silindi."
          : "The category was deleted.",
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}
