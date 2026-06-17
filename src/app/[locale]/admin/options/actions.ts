"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { routing, type AppLocale } from "@/i18n/routing";
import { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  createOption,
  createOptionGroup,
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
      message:
        error instanceof Error ? error.message : t("common.noAccessText"),
      ok: false,
    };
  }
}

export async function saveOptionAction(
  locale: AppLocale,
  input: OptionInput | OptionUpdateInput
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
      message:
        error instanceof Error ? error.message : t("common.noAccessText"),
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
      message:
        error instanceof Error ? error.message : t("common.noAccessText"),
      ok: false,
    };
  }
}
