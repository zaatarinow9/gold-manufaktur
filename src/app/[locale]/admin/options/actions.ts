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
  createOption,
  createOptionGroup,
  deleteOption,
  setOptionActive,
  updateOption,
  type OptionGroupInput,
  type OptionInput,
  type OptionUpdateInput,
} from "@/lib/db/adminCatalog";

function revalidateOptionViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin/options`);
    revalidatePath(`/${locale}/admin/products`);
  });
}

export async function saveOptionGroupAction(
  locale: AppLocale,
  input: OptionGroupInput
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
    await createOptionGroup(input);
    revalidateOptionViews();

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

export async function saveOptionAction(
  locale: AppLocale,
  input: OptionInput | OptionUpdateInput
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
      await updateOption(input as OptionUpdateInput);
    } else {
      await createOption(input as OptionInput);
    }

    revalidateOptionViews();

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

export async function toggleOptionActiveAction(
  locale: AppLocale,
  optionId: string,
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
    await setOptionActive(optionId, isActive);
    revalidateOptionViews();

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

export async function deleteOptionAction(
  locale: AppLocale,
  optionId: string
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
    const result = await deleteOption(optionId);
    revalidateOptionViews();

    if (result.mode === "soft_deleted_in_use") {
      return {
        message: locale === "de"
          ? "Die Option wird weiterhin verwendet und wurde deshalb nur deaktiviert."
          : locale === "ar"
            ? "الخيار ما زال مستخدماً، لذلك تم تعطيله فقط."
            : locale === "fr"
              ? "Cette option est encore utilisee et a seulement ete desactivee."
              : locale === "tr"
                ? "Bu secenek hala kullanildigi icin yalnizca devre disi birakildi."
            : "This option is still in use, so it was deactivated instead of fully deleted.",
        ok: true,
      };
    }

    return {
      message: locale === "de"
        ? "Die Option wurde geloescht."
        : locale === "ar"
          ? "تم حذف الخيار."
          : locale === "fr"
            ? "L'option a ete supprimee."
            : locale === "tr"
              ? "Secenek silindi."
          : "The option was deleted.",
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}
