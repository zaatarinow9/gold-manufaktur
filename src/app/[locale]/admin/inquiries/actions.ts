"use server";

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

function getInquiryActionCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      deleted: "تم حذف الطلب من العرض الإداري.",
      noAccess: "لا تملك صلاحية الوصول.",
      saved: "تم تحديث حالة الطلب.",
    };
  }

  if (locale === "de") {
    return {
      deleted: "Die Anfrage wurde aus der Adminansicht entfernt.",
      noAccess: "Kein Zugriff.",
      saved: "Der Anfrage-Status wurde aktualisiert.",
    };
  }

  return {
    deleted: "The inquiry was removed from the admin view.",
    noAccess: "No access.",
    saved: "The inquiry status was updated.",
  };
}

export async function updateInquiryStatusAction(
  locale: AppLocale,
  inquiryId: string,
  status: CustomerInquiryStatus
): Promise<AdminActionResult> {
  const copy = getInquiryActionCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

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
  const copy = getInquiryActionCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

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
