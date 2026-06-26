import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextPath(locale: string, nextPath: string | null) {
  const value = nextPath?.trim() ?? "";

  if (
    value.startsWith(`/${locale}/admin`) &&
    !value.startsWith(`/${locale}/admin/login`) &&
    !value.startsWith(`/${locale}/admin/auth`)
  ) {
    return value;
  }

  return "";
}

function buildLoginRedirect(
  request: NextRequest,
  locale: string,
  notice: "account_inactive" | "account_not_configured" | "invalid_link"
) {
  const url = new URL(`/${locale}/admin/login`, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  const tokenHash = request.nextUrl.searchParams.get("token_hash")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type");
  const mode =
    request.nextUrl.searchParams.get("mode") === "password_reset"
      ? "password_reset"
      : "invite";
  const nextPath = getSafeNextPath(
    locale,
    request.nextUrl.searchParams.get("next")
  );

  if (!tokenHash || (type !== "invite" && type !== "recovery")) {
    return buildLoginRedirect(request, locale, "invalid_link");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error || !data.user) {
    return buildLoginRedirect(request, locale, "invalid_link");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, is_active, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.role) {
    console.error(
      `[admin-auth-callback] Verified auth user ${data.user.id} (${data.user.email ?? "unknown_email"}) has no configured profile.`
    );
    await supabase.auth.signOut();
    return buildLoginRedirect(request, locale, "account_not_configured");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return buildLoginRedirect(request, locale, "account_inactive");
  }

  const setupUrl = new URL(`/${locale}/admin/auth/set-password`, request.url);
  setupUrl.searchParams.set("mode", mode);

  if (nextPath) {
    setupUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(setupUrl);
}
