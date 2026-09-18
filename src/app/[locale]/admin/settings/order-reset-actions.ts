"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import { requireAdminAccess } from "@/lib/admin/auth";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const resetOrdersSchema = z.object({ confirmed: z.literal(true) });

type OrderResetResult = { count: number; message: string; ok: boolean };

function hasSameOrigin(requestHeaders: Headers) {
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  if (!origin || !host) return false;
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

async function getOrderResetAccess(locale: AppLocale) {
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user || await isAdminDecoyEnabled()) return null;
  return access.user;
}

export async function getOrderResetCountAction(locale: AppLocale): Promise<OrderResetResult> {
  try {
    const user = await getOrderResetAccess(locale);
    if (!user) return { count: 0, message: "PERMISSION_DENIED", ok: false };
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase.from("orders").select("id", { count: "exact", head: true });
    if (error) throw error;
    return { count: count ?? 0, message: "", ok: true };
  } catch {
    return { count: 0, message: "RESET_FAILED", ok: false };
  }
}

export async function resetOrdersToColdArchiveAction(locale: AppLocale, input: unknown): Promise<OrderResetResult> {
  if (!resetOrdersSchema.safeParse(input).success) return { count: 0, message: "INVALID_INPUT", ok: false };
  try {
    const requestHeaders = await headers();
    if (!hasSameOrigin(requestHeaders)) return { count: 0, message: "PERMISSION_DENIED", ok: false };
    const user = await getOrderResetAccess(locale);
    if (!user) return { count: 0, message: "PERMISSION_DENIED", ok: false };
    const supabase = await createSupabaseServerClient() as unknown as {
      rpc: (name: "archive_and_reset_orders") => Promise<{ data: { archived_order_count: number; removed_order_count: number }[] | null; error: { message: string } | null }>;
    };
    const { data, error } = await supabase.rpc("archive_and_reset_orders");
    if (error || !data?.[0] || data[0].archived_order_count !== data[0].removed_order_count) throw new Error(error?.message ?? "RESET_FAILED");
    routing.locales.forEach((targetLocale) => {
      ["", "/admin", "/admin/orders", "/admin/archive", "/admin/my-tasks", "/admin/reports", "/admin/settings"].forEach((path) => revalidatePath(`/${targetLocale}${path}`));
    });
    return { count: data[0].removed_order_count, message: "", ok: true };
  } catch {
    return { count: 0, message: "RESET_FAILED", ok: false };
  }
}
