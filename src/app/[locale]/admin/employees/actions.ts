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
  createEmployee,
  setEmployeeActive,
  updateEmployee,
  type EmployeeInput,
  type EmployeeUpdateInput,
} from "@/lib/db/employees";

function revalidateEmployeeViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/employees`);
  });
}

export async function saveEmployeeAction(
  locale: AppLocale,
  input: EmployeeInput | EmployeeUpdateInput
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  try {
    if ("id" in input && typeof input.id === "string") {
      await updateEmployee(input as EmployeeUpdateInput);
    } else {
      await createEmployee(input as EmployeeInput);
    }

    revalidateEmployeeViews();

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

export async function toggleEmployeeActiveAction(
  locale: AppLocale,
  employeeId: string,
  isActive: boolean
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  try {
    await setEmployeeActive(employeeId, isActive);
    revalidateEmployeeViews();

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
