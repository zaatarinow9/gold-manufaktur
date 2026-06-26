import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminBrand } from "@/components/admin/AdminBrand";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSetPasswordForm } from "@/components/admin/AdminSetPasswordForm";
import { getAdminSessionContext } from "@/lib/admin/auth";
import { getBrandLogoAlt, resolveLocale } from "@/lib/site";
import { trimDisplayHeading } from "@/lib/displayText";

type AdminSetPasswordPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; next?: string }>;
};

function getSafeRedirectPath(locale: string, nextPath: string | undefined) {
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

export default async function AdminSetPasswordPage({
  params,
  searchParams,
}: AdminSetPasswordPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const brandLogoAlt = getBrandLogoAlt(locale);
  const access = await getAdminSessionContext();
  const resolvedSearchParams = await searchParams;
  const mode =
    resolvedSearchParams.mode === "password_reset" ? "password_reset" : "invite";
  const redirectTo = getSafeRedirectPath(locale, resolvedSearchParams.next);

  if (access.state === "anonymous") {
    redirect(`/${locale}/admin/login?notice=invalid_link`);
  }

  if (access.state === "denied") {
    redirect(
      `/${locale}/admin/login?notice=${
        access.deniedReason === "inactive"
          ? "account_inactive"
          : "account_not_configured"
      }`
    );
  }

  return (
    <div className="space-y-8">
      <AdminBrand
        alt={brandLogoAlt}
        subtitle={t("header.adminArea")}
        className="w-fit"
        logoClassName="h-[3.1rem] sm:h-[3.55rem]"
        priority
      />

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="admin-heading text-foreground">
              {trimDisplayHeading(
                mode === "password_reset"
                  ? t("accountSetup.resetTitle")
                  : t("accountSetup.title")
              )}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted">
              {mode === "password_reset"
                ? t("accountSetup.resetDescription")
                : t("accountSetup.description")}
            </p>
          </div>

          <AdminCard className="max-w-xl" contentClassName="space-y-3 px-5 py-5">
            <ShieldCheck className="h-6 w-6 text-gold-soft" />
            <h2 className="font-semibold text-foreground">
              {t("accountSetup.securityTitle")}
            </h2>
            <p className="text-sm text-muted">
              {t("accountSetup.securityText")}
            </p>
          </AdminCard>
        </div>

        <AdminCard
          title={
            mode === "password_reset"
              ? t("accountSetup.resetFormTitle")
              : t("accountSetup.formTitle")
          }
          description={
            mode === "password_reset"
              ? t("accountSetup.resetFormDescription")
              : t("accountSetup.formDescription")
          }
          action={<AdminBadge variant="info">{t("header.adminArea")}</AdminBadge>}
        >
          <AdminSetPasswordForm
            locale={locale}
            mode={mode}
            redirectTo={redirectTo}
          />
        </AdminCard>
      </div>
    </div>
  );
}
