"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { routing, type AppLocale } from "@/i18n/routing";
import {
  getOrderWorkflowCopy,
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import type { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import {
  createEmployeeWithAccount,
  type EmployeeAccountInput,
  type EmployeeAccountUpdateInput,
  linkEmployeeToExistingAuthUser,
  parseEmployeeAccountInput,
  sendEmployeeInvite,
  sendEmployeePasswordReset,
  setEmployeeAccountActive,
  updateEmployeeWithAccount,
} from "@/lib/db/employeeAccounts";
import { StaffAccountError } from "@/lib/admin/staffAuth";

function revalidateEmployeeViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/employees`);
  });
}

function getEmployeeActionErrorMessage(
  error: unknown,
  locale: AppLocale,
  t: Awaited<ReturnType<typeof getTranslations>>,
  fallback: string
) {
  if (error instanceof StaffAccountError) {
    switch (error.code) {
      case "account_not_configured":
        return t("login.notices.accountNotConfigured");
      case "account_not_linked":
        return t("employees.account.notLinked");
      case "account_role_conflict":
        return t("employees.account.roleConflict");
      case "duplicate_email":
        return t("employees.account.duplicateEmail");
      case "email_required":
        return t("employees.account.emailRequired");
      case "employee_not_found":
        return t("employees.account.notFound");
      case "link_in_use":
        return t("employees.account.linkInUse");
      case "role_not_allowed":
        return t("employees.account.roleNotAllowed");
      case "workshop_forbidden":
        return t("common.noAccessText");
    }
  }

  return getSafeActionErrorMessage(error, fallback || locale);
}

function getEmailDispatchResultMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  type: "invite" | "password_reset",
  delivered: boolean
) {
  if (type === "invite") {
    return delivered
      ? t("employees.account.inviteSent")
      : t("employees.account.inviteDeliveryFailed");
  }

  return delivered
    ? t("employees.account.passwordResetSent")
    : t("employees.account.passwordResetDeliveryFailed");
}

export async function saveEmployeeAction(
  locale: AppLocale,
  input: EmployeeAccountInput | EmployeeAccountUpdateInput
): Promise<AdminActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

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

  const actor = access.user;

  if (!actor) {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  if ("role" in input && input.role !== "employee") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  try {
    if ("id" in input && typeof input.id === "string") {
      const parsed = parseEmployeeAccountInput(input, "update");
      await updateEmployeeWithAccount({
        actor,
        values: parsed,
      });
      revalidateEmployeeViews();

      return {
        message: t("employees.account.saved"),
        ok: true,
        shouldRefresh: true,
      };
    } else {
      const parsed = parseEmployeeAccountInput(input, "create");
      const result = await createEmployeeWithAccount({
        actor,
        locale,
        values: parsed,
      });
      revalidateEmployeeViews();

      return {
        message: getEmailDispatchResultMessage(
          t,
          "invite",
          result.emailResult.status === "sent"
        ),
        ok: result.emailResult.status === "sent",
        shouldRefresh: true,
      };
    }
  } catch (error) {
    return {
      message: getEmployeeActionErrorMessage(
        error,
        locale,
        t,
        copy.formErrorFallback
      ),
      ok: false,
    };
  }
}

export async function toggleEmployeeActiveAction(
  locale: AppLocale,
  employeeId: string,
  isActive: boolean
): Promise<AdminActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

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

  const actor = access.user;

  if (!actor) {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  try {
    await setEmployeeAccountActive({
      actor,
      employeeId,
      isActive,
    });
    revalidateEmployeeViews();

    return {
      message: isActive
        ? t("employees.account.reactivated")
        : t("employees.account.deactivated"),
      ok: true,
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message: getEmployeeActionErrorMessage(
        error,
        locale,
        t,
        copy.formErrorFallback
      ),
      ok: false,
    };
  }
}

export async function sendEmployeeInviteAction(
  locale: AppLocale,
  employeeId: string
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

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  const actor = access.user;

  if (!actor) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  try {
    const result = await sendEmployeeInvite({
      actor,
      employeeId,
      locale,
    });
    revalidateEmployeeViews();

    return {
      message: getEmailDispatchResultMessage(
        t,
        "invite",
        result.emailResult.status === "sent"
      ),
      ok: result.emailResult.status === "sent",
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message: getEmployeeActionErrorMessage(
        error,
        locale,
        t,
        copy.formErrorFallback
      ),
      ok: false,
    };
  }
}

export async function sendEmployeePasswordResetAction(
  locale: AppLocale,
  employeeId: string
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

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  const actor = access.user;

  if (!actor) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  try {
    const result = await sendEmployeePasswordReset({
      actor,
      employeeId,
      locale,
    });
    revalidateEmployeeViews();

    return {
      message: getEmailDispatchResultMessage(
        t,
        "password_reset",
        result.emailResult.status === "sent"
      ),
      ok: result.emailResult.status === "sent",
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message: getEmployeeActionErrorMessage(
        error,
        locale,
        t,
        copy.formErrorFallback
      ),
      ok: false,
    };
  }
}

export async function linkEmployeeAccountAction(
  locale: AppLocale,
  employeeId: string
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

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  const actor = access.user;

  if (!actor) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  try {
    await linkEmployeeToExistingAuthUser({
      actor,
      employeeId,
      locale,
    });
    revalidateEmployeeViews();

    return {
      message: t("employees.account.linked"),
      ok: true,
      shouldRefresh: true,
    };
  } catch (error) {
    return {
      message: getEmployeeActionErrorMessage(
        error,
        locale,
        t,
        copy.formErrorFallback
      ),
      ok: false,
    };
  }
}
