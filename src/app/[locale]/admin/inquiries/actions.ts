"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import type { AppLocale } from "@/i18n/routing";
import type { AdminActionResult } from "@/lib/admin/actionResult";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import {
  type CustomerInquiryStatus,
  deleteCustomerInquiry,
  updateCustomerInquiryStatus,
} from "@/lib/db/inquiries";

function revalidateInquiryViews() {
  ["ar", "de", "en", "fr", "tr"].forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/inquiries`);
  });
}

async function getInquiryActionCopy(locale: AppLocale) {
  const t = await getTranslations({ locale, namespace: "Admin.inquiryMessages" });

  return {
    deleted: t("deleted"),
    noAccess: t("noAccess"),
    saved: t("saved"),
  };
}

export async function updateInquiryStatusAction(
  locale: AppLocale,
  inquiryId: string,
  status: CustomerInquiryStatus
): Promise<AdminActionResult> {
  const copy = (await getInquiryActionCopy(locale));
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    await updateCustomerInquiryStatus(inquiryId, status);
    revalidateInquiryViews();
    return {
      message: copy.saved,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.saved,
      ok: false,
    };
  }
}

export async function deleteInquiryAction(
  locale: AppLocale,
  inquiryId: string
): Promise<AdminActionResult> {
  const copy = (await getInquiryActionCopy(locale));
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return {
      message: copy.noAccess,
      ok: false,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false,
    };
  }

  try {
    await deleteCustomerInquiry(inquiryId);
    revalidateInquiryViews();
    return {
      message: copy.deleted,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : copy.deleted,
      ok: false,
    };
  }
}
