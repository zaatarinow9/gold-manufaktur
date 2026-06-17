"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { routing, type AppLocale } from "@/i18n/routing";
import { requireAdminAccess } from "@/lib/admin/auth";
import {
  createOrder,
  updateOrderTracking,
  type OrderCreateInput,
  type OrderTrackingUpdateInput,
} from "@/lib/db/orders";

type OrderActionResult =
  | {
      message: string;
      ok: false;
    }
  | {
      message: string;
      ok: true;
      orderId?: string;
      trackingNumber?: string;
    };

function revalidateOrderViews(orderId?: string, trackingNumber?: string) {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/orders`);

    if (orderId) {
      revalidatePath(`/${locale}/admin/orders/${orderId}`);
    }

    if (trackingNumber) {
      revalidatePath(`/${locale}/tracking/${trackingNumber}`);
    }
  });
}

export async function createOrderAction(
  locale: AppLocale,
  input: OrderCreateInput
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin"]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  try {
    const result = await createOrder(access.user, input);
    revalidateOrderViews(result.orderId, result.trackingNumber);

    return {
      message: t("newOrder.success"),
      ok: true,
      orderId: result.orderId,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : t("common.noAccessText"),
      ok: false,
    };
  }
}

export async function updateOrderTrackingAction(
  locale: AppLocale,
  input: OrderTrackingUpdateInput
): Promise<OrderActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, [
    "super_admin",
    "admin",
    "employee",
  ]);

  if (access.state !== "authenticated" || !access.user) {
    return {
      message: t("common.noAccessText"),
      ok: false,
    };
  }

  try {
    const result = await updateOrderTracking(access.user, input);
    revalidateOrderViews(input.orderId, result.trackingNumber);

    let message = t("orders.statusSaved");

    if (input.notifyCustomer) {
      if (result.emailResult?.delivered) {
        message = t("orders.statusSavedAndNotified");
      } else if (result.emailResult?.fallback) {
        message = "Tracking status saved. Email delivery is in log-only fallback mode.";
      } else if (result.emailResult && !result.emailResult.ok) {
        message = "Tracking status saved, but the customer email could not be delivered.";
      }
    }

    return {
      message,
      ok: true,
      trackingNumber: result.trackingNumber,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : t("orders.notifyError"),
      ok: false,
    };
  }
}
