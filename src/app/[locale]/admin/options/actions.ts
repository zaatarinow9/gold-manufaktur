"use server";

import { revalidateDashboard } from "@/lib/admin/revalidate";

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
  createOption,
  createOptionGroup,
  deleteOptionGroup,
  deleteOption,
  setOptionActive,
  updateOption,
  updateOptionGroup,
  type OptionGroupInput,
  type OptionGroupUpdateInput,
  type OptionInput,
  type OptionUpdateInput,
} from "@/lib/db/adminCatalog";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function revalidateOptionViews() {
  revalidateDashboard();
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin/options`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/admin/gallery/new-order`);
    revalidatePath(`/${locale}/shop`);
    revalidatePath(`/${locale}/tracking`);
  });
}

async function guardOptionAction(locale: AppLocale): Promise<AdminActionResult | null> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "marketing"]);

  if (access.state !== "authenticated") {
    return { message: t("common.noAccessText"), ok: false };
  }

  if (await isAdminDecoyEnabled()) {
    return { message: getAdminDecoyUnavailableMessage(locale), ok: false };
  }

  return null;
}

function getOptionFieldErrors(error: ZodError, t: Translator) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    if (!path || fieldErrors[path]) {
      continue;
    }

    if (path.startsWith("values")) {
      fieldErrors.values = t("optionsPage.errors.choices");
    } else if (path === "key") {
      fieldErrors.key = t("forms.invalidSlug");
    } else if (path.startsWith("label.") || path.startsWith("name.")) {
      fieldErrors[path] = issue.code === "too_big" ? t("forms.tooLong") : t("forms.required");
    } else {
      fieldErrors[path] = t("forms.invalidValue");
    }
  }

  return fieldErrors;
}

async function runSave(
  locale: AppLocale,
  successKey: string,
  task: () => Promise<unknown>
): Promise<AdminActionResult> {
  const blocked = await guardOptionAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });

  try {
    await task();
    revalidateOptionViews();
    return { message: t(successKey), ok: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        fieldErrors: getOptionFieldErrors(error, t),
        message: t("forms.checkFields"),
        ok: false,
      };
    }

    console.error("[options] action failed", error);
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}

export async function saveOptionGroupAction(
  locale: AppLocale,
  input: OptionGroupInput | OptionGroupUpdateInput
) {
  const isUpdate = "id" in input && typeof input.id === "string";
  return runSave(locale, `optionsPage.messages.${isUpdate ? "groupUpdated" : "groupCreated"}`, () =>
    isUpdate ? updateOptionGroup(input as OptionGroupUpdateInput) : createOptionGroup(input as OptionGroupInput)
  );
}

export async function saveOptionAction(locale: AppLocale, input: OptionInput | OptionUpdateInput) {
  const isUpdate = "id" in input && typeof input.id === "string";
  return runSave(locale, `optionsPage.messages.${isUpdate ? "fieldUpdated" : "fieldCreated"}`, () =>
    isUpdate ? updateOption(input as OptionUpdateInput) : createOption(input as OptionInput)
  );
}

export async function toggleOptionActiveAction(
  locale: AppLocale,
  optionId: string,
  isActive: boolean
) {
  return runSave(locale, `optionsPage.messages.${isActive ? "fieldShown" : "fieldHidden"}`, () =>
    setOptionActive(optionId, isActive)
  );
}

async function runDelete(
  locale: AppLocale,
  keys: { deleted: string; kept: string },
  task: () => Promise<{ mode: string }>
): Promise<AdminActionResult> {
  const blocked = await guardOptionAction(locale);

  if (blocked) {
    return blocked;
  }

  const t = await getTranslations({ locale, namespace: "Admin" });

  try {
    const result = await task();
    revalidateOptionViews();
    return {
      message: t(result.mode === "deleted" ? keys.deleted : keys.kept),
      ok: true,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, t("forms.saveFailed")),
      ok: false,
    };
  }
}

export async function deleteOptionGroupAction(locale: AppLocale, groupId: string) {
  return runDelete(
    locale,
    { deleted: "optionsPage.messages.groupDeleted", kept: "optionsPage.messages.groupArchived" },
    () => deleteOptionGroup(groupId)
  );
}

export async function deleteOptionAction(locale: AppLocale, optionId: string) {
  return runDelete(
    locale,
    { deleted: "optionsPage.messages.fieldDeleted", kept: "optionsPage.messages.fieldArchived" },
    () => deleteOption(optionId)
  );
}
