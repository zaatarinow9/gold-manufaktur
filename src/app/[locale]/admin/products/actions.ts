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
  createProduct,
  deleteProduct,
  duplicateProduct,
  setProductActive,
  setProductFeatured,
  updateProduct,
  type ProductInput,
  type ProductUpdateInput,
} from "@/lib/db/adminCatalog";

type ProductMessageKey =
  | "activated"
  | "created"
  | "deactivated"
  | "deleted"
  | "duplicated"
  | "featuredOff"
  | "featuredOn"
  | "softDeleted"
  | "updated";

function revalidateProductViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/gallery`);
    revalidatePath(`/${locale}/admin/gallery/new-order`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/shop`);
    revalidatePath(`/${locale}/tracking`);
  });
}

/** Shared guard: super admins only, and never while the decoy mode is on. */
async function guardProductAction(locale: AppLocale): Promise<AdminActionResult | null> {
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

async function runProductAction(
  locale: AppLocale,
  messageKey: ProductMessageKey | ((result: unknown) => ProductMessageKey),
  task: () => Promise<unknown>
): Promise<AdminActionResult> {
  const blocked = await guardProductAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });

  try {
    const result = await task();
    revalidateProductViews();
    const key = typeof messageKey === "function" ? messageKey(result) : messageKey;
    return { message: t(`products.messages.${key}`), ok: true };
  } catch (error) {
    console.error("[products] action failed", error);
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}

function getProductFieldErrors(
  error: ZodError,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    if (!path || fieldErrors[path]) {
      continue;
    }

    if (path === "slug") {
      fieldErrors.slug = t("forms.invalidSlug");
    } else if (path.startsWith("name.") || path.startsWith("description.")) {
      fieldErrors[path] =
        issue.code === "too_big" ? t("forms.tooLong") : t("forms.required");
    } else {
      fieldErrors[path] = t("forms.invalidValue");
    }
  }

  return fieldErrors;
}

export async function saveProductAction(
  locale: AppLocale,
  input: ProductInput | ProductUpdateInput
): Promise<AdminActionResult> {
  const blocked = await guardProductAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });
  const isUpdate = "id" in input && typeof input.id === "string";

  try {
    if (isUpdate) {
      await updateProduct(input as ProductUpdateInput);
    } else {
      await createProduct(input as ProductInput);
    }

    revalidateProductViews();

    return {
      message: t(`products.messages.${isUpdate ? "updated" : "created"}`),
      ok: true,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = getProductFieldErrors(error, t);
      return {
        fieldErrors,
        message: t("forms.checkFields"),
        ok: false,
      };
    }

    if (error instanceof Error && error.message === "INVALID_PRODUCT_SLUG") {
      return {
        fieldErrors: { slug: t("forms.invalidSlug") },
        message: t("forms.checkFields"),
        ok: false,
      };
    }

    if (error instanceof Error && error.message === "DUPLICATE_PRODUCT_SKU") {
      return {
        fieldErrors: { sku: t("forms.duplicateSku") },
        message: t("forms.checkFields"),
        ok: false,
      };
    }

    console.error("[saveProductAction] Product save failed", error);
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}

export async function duplicateProductAction(locale: AppLocale, productId: string) {
  return runProductAction(locale, "duplicated", () => duplicateProduct(productId));
}

export async function toggleProductActiveAction(
  locale: AppLocale,
  productId: string,
  isActive: boolean
) {
  return runProductAction(locale, isActive ? "activated" : "deactivated", () =>
    setProductActive(productId, isActive)
  );
}

export async function toggleProductFeaturedAction(
  locale: AppLocale,
  productId: string,
  isFeatured: boolean
) {
  return runProductAction(locale, isFeatured ? "featuredOn" : "featuredOff", () =>
    setProductFeatured(productId, isFeatured)
  );
}

export async function deleteProductAction(locale: AppLocale, productId: string) {
  return runProductAction(
    locale,
    (result) =>
      (result as { mode?: string } | undefined)?.mode === "soft_deleted_in_use"
        ? "softDeleted"
        : "deleted",
    () => deleteProduct(productId)
  );
}

/**
 * Creates a category straight from the product form, with just a name in the
 * editor's language. Image and description can be added later.
 */
export async function quickCreateCategoryAction(
  locale: AppLocale,
  name: string
): Promise<{ category?: { id: string; name: string }; message: string; ok: boolean }> {
  const blocked = await guardProductAction(locale);
  if (blocked) return blocked;

  const t = await getTranslations({ locale, namespace: "Admin" });
  const trimmed = name.trim();
  if (!trimmed) return { message: t("forms.required"), ok: false };

  try {
    const names = { ar: "", de: "", en: "", fr: "", tr: "" };
    names[locale] = trimmed;
    const row = await createCategory({
      accent: "",
      description: { ar: "", de: "", en: "", fr: "", tr: "" },
      imageUrl: "",
      isActive: true,
      name: names,
      slug: "",
      sortOrder: 0,
      supportsNameCustomization: false,
    });
    for (const routeLocale of routing.locales) {
      revalidatePath(`/${routeLocale}/admin/categories`);
      revalidatePath(`/${routeLocale}/admin/products`);
    }
    return { category: { id: row.id, name: trimmed }, message: t("categoriesPage.messages.created"), ok: true };
  } catch {
    return { message: t("productEditor.quickCategoryFailed"), ok: false };
  }
}
