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
  createProduct,
  deleteProduct,
  duplicateProduct,
  setProductActive,
  setProductFeatured,
  updateProduct,
  type ProductInput,
  type ProductUpdateInput,
} from "@/lib/db/adminCatalog";

function getProductActionMessage(
  locale: AppLocale,
  key:
    | "activated"
    | "created"
    | "deactivated"
    | "deleted"
    | "duplicated"
    | "featuredOff"
    | "featuredOn"
    | "softDeleted"
    | "updated"
) {
  if (locale === "de") {
    switch (key) {
      case "activated":
        return "Das Produkt ist jetzt sichtbar.";
      case "created":
        return "Das Produkt wurde erstellt.";
      case "deactivated":
        return "Das Produkt wurde ausgeblendet.";
      case "deleted":
        return "Das Produkt wurde geloescht.";
      case "duplicated":
        return "Das Produkt wurde dupliziert.";
      case "featuredOff":
        return "Das Produkt wurde aus der Auswahl entfernt.";
      case "featuredOn":
        return "Das Produkt wurde als Highlight markiert.";
      case "softDeleted":
        return "Das Produkt wird weiterhin in Auftraegen verwendet und wurde deshalb nur deaktiviert.";
      case "updated":
        return "Das Produkt wurde aktualisiert.";
    }
  }

  if (locale === "ar") {
    switch (key) {
      case "activated":
        return "أصبح المنتج مرئياً الآن.";
      case "created":
        return "تم إنشاء المنتج.";
      case "deactivated":
        return "تم إخفاء المنتج.";
      case "deleted":
        return "تم حذف المنتج.";
      case "duplicated":
        return "تم إنشاء نسخة من المنتج.";
      case "featuredOff":
        return "تمت إزالة المنتج من الاختيارات المميزة.";
      case "featuredOn":
        return "تم تمييز المنتج كخيار بارز.";
      case "softDeleted":
        return "المنتج مستخدم في طلبات حالية، لذلك تم تعطيله فقط.";
      case "updated":
        return "تم تحديث المنتج.";
    }
  }

  if (locale === "fr") {
    switch (key) {
      case "activated":
        return "Le produit est maintenant visible.";
      case "created":
        return "Le produit a ete cree.";
      case "deactivated":
        return "Le produit a ete masque.";
      case "deleted":
        return "Le produit a ete supprime.";
      case "duplicated":
        return "Le produit a ete duplique.";
      case "featuredOff":
        return "Le produit a ete retire de la selection mise en avant.";
      case "featuredOn":
        return "Le produit a ete marque comme piece mise en avant.";
      case "softDeleted":
        return "Ce produit est encore utilise dans des commandes et a seulement ete desactive.";
      case "updated":
        return "Le produit a ete mis a jour.";
    }
  }

  if (locale === "tr") {
    switch (key) {
      case "activated":
        return "Urun artik gorunur.";
      case "created":
        return "Urun olusturuldu.";
      case "deactivated":
        return "Urun gizlendi.";
      case "deleted":
        return "Urun silindi.";
      case "duplicated":
        return "Urun kopyalandi.";
      case "featuredOff":
        return "Urun one cikan secimden cikarildi.";
      case "featuredOn":
        return "Urun one cikan secim olarak isaretlendi.";
      case "softDeleted":
        return "Bu urun siparislerde kullanildigi icin yalnizca devre disi birakildi.";
      case "updated":
        return "Urun guncellendi.";
    }
  }

  switch (key) {
    case "activated":
      return "The product is now visible.";
    case "created":
      return "Product created.";
    case "deactivated":
      return "The product was hidden.";
    case "deleted":
      return "The product was deleted.";
    case "duplicated":
      return "The product was duplicated.";
    case "featuredOff":
      return "The product was removed from the featured selection.";
    case "featuredOn":
      return "The product was marked as featured.";
    case "softDeleted":
      return "This product is still used in orders, so it was deactivated instead of fully deleted.";
    case "updated":
      return "Product updated.";
  }
}

function revalidateProductViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}`);
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

function getProductFieldErrors(locale: AppLocale, error: ZodError) {
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
      case "sku":
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
    const isUpdate = "id" in input && typeof input.id === "string";

    if (isUpdate) {
      await updateProduct(input as ProductUpdateInput);
    } else {
      await createProduct(input as ProductInput);
    }

    revalidateProductViews();

    return {
      message: getProductActionMessage(locale, isUpdate ? "updated" : "created"),
      ok: true,
    };
  } catch (error) {
    console.error("[saveProductAction] Product save failed", error);

    if (error instanceof ZodError) {
      const fieldErrors = getProductFieldErrors(locale, error);
      return {
        fieldErrors,
        message: Object.values(fieldErrors)[0] ?? copy.formErrorFallback,
        ok: false,
      };
    }

    if (error instanceof Error && error.message === "INVALID_PRODUCT_SLUG") {
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
      message: getProductActionMessage(locale, "duplicated"),
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
      message: getProductActionMessage(locale, isActive ? "activated" : "deactivated"),
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
      message: getProductActionMessage(locale, isFeatured ? "featuredOn" : "featuredOff"),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}

export async function deleteProductAction(
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
    const result = await deleteProduct(productId);
    revalidateProductViews();

    return {
      message: getProductActionMessage(
        locale,
        result.mode === "soft_deleted_in_use" ? "softDeleted" : "deleted"
      ),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}
