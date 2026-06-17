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
  createProduct,
  duplicateProduct,
  setProductActive,
  setProductFeatured,
  updateProduct,
  type ProductInput,
  type ProductUpdateInput,
} from "@/lib/db/adminCatalog";

function revalidateProductViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/shop`);
  });
}

export async function saveProductAction(
  locale: AppLocale,
  input: ProductInput | ProductUpdateInput
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
      await updateProduct(input as ProductUpdateInput);
    } else {
      await createProduct(input as ProductInput);
    }

    revalidateProductViews();

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

export async function duplicateProductAction(
  locale: AppLocale,
  productId: string
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
    await duplicateProduct(productId);
    revalidateProductViews();

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

export async function toggleProductActiveAction(
  locale: AppLocale,
  productId: string,
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
    await setProductActive(productId, isActive);
    revalidateProductViews();

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

export async function toggleProductFeaturedAction(
  locale: AppLocale,
  productId: string,
  isFeatured: boolean
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
    await setProductFeatured(productId, isFeatured);
    revalidateProductViews();

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
