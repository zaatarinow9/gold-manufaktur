"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { routing, type AppLocale } from "@/i18n/routing";
import {
  getOrderWorkflowCopy,
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import {
  createWorkshop,
  setWorkshopActive,
  updateWorkshop,
  type WorkshopInput,
  type WorkshopUpdateInput,
} from "@/lib/db/workshops";

function revalidateWorkshopViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/workshops`);
  });
}

export async function saveWorkshopAction(
  locale: AppLocale,
  input: WorkshopInput | WorkshopUpdateInput
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false as const,
    };
  }

  try {
    if ("id" in input && typeof input.id === "string") {
      await updateWorkshop(input as WorkshopUpdateInput);
    } else {
      await createWorkshop(input as WorkshopInput);
    }

    revalidateWorkshopViews();

    return {
      message: t("common.mockSubmit"),
      ok: true as const,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false as const,
    };
  }
}

export async function toggleWorkshopActiveAction(
  locale: AppLocale,
  workshopId: string,
  isActive: boolean
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false as const,
    };
  }

  try {
    await setWorkshopActive(workshopId, isActive);
    revalidateWorkshopViews();

    return {
      message: t("common.mockSubmit"),
      ok: true as const,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false as const,
    };
  }
}
