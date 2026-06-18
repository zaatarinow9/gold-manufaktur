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
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/options`);
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

function getKeyMessage(locale: AppLocale) {
  if (locale === "de") {
    return "Verwenden Sie nur Kleinbuchstaben, Zahlen und Bindestriche.";
  }

  if (locale === "ar") {
    return "استخدم أحرفاً صغيرة وأرقاماً وشرطات فقط.";
  }

  if (locale === "fr") {
    return "Utilisez uniquement des lettres minuscules, des chiffres et des tirets.";
  }

  if (locale === "tr") {
    return "Yalnizca kucuk harfler, rakamlar ve tire kullanin.";
  }

  return "Use lowercase letters, numbers, and hyphens only.";
}

function getOptionFieldErrors(locale: AppLocale, error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  const requiredMessage = getRequiredFieldLabel(locale);
  const keyMessage = getKeyMessage(locale);

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    if (!path || fieldErrors[path]) {
      continue;
    }

    switch (path) {
      case "key":
        fieldErrors.key = keyMessage;
        break;
      case "label.de":
      case "label.ar":
      case "name.de":
      case "name.ar":
      case "groupId":
        fieldErrors[path] = requiredMessage;
        break;
      default:
        fieldErrors[path] = issue.message || requiredMessage;
        break;
    }
  }

  return fieldErrors;
}

function getOptionDeleteMessage(locale: AppLocale, mode: "deleted" | "soft_deleted_in_use") {
  if (locale === "de") {
    return mode === "deleted"
      ? "Das Element wurde aus dem System entfernt."
      : "Die Option wurde aus aktiven Formularen entfernt und bleibt nur in historischen Auftraegen erhalten.";
  }

  if (locale === "ar") {
    return mode === "deleted"
      ? "تم حذف العنصر من النظام."
      : "تمت إزالة الخيار من النماذج النشطة وسيبقى فقط ضمن الطلبات السابقة.";
  }

  if (locale === "fr") {
    return mode === "deleted"
      ? "L'element a ete retire du systeme."
      : "L'option a ete retiree des formulaires actifs et reste uniquement dans l'historique.";
  }

  if (locale === "tr") {
    return mode === "deleted"
      ? "Oge sistemden kaldirildi."
      : "Secenek aktif formlardan kaldirildi ve yalnizca gecmis siparislerde tutuluyor.";
  }

  return mode === "deleted"
    ? "The item was removed from the system."
    : "The option was removed from active forms and is only kept for historical orders.";
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
    if (error instanceof ZodError) {
      const fieldErrors = getOptionFieldErrors(locale, error);
      return {
        fieldErrors,
        message: Object.values(fieldErrors)[0] ?? copy.formErrorFallback,
        ok: false,
      };
    }

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
    if (error instanceof ZodError) {
      const fieldErrors = getOptionFieldErrors(locale, error);
      return {
        fieldErrors,
        message: Object.values(fieldErrors)[0] ?? copy.formErrorFallback,
        ok: false,
      };
    }

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

    return {
      message: getOptionDeleteMessage(locale, result.mode),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false,
    };
  }
}
