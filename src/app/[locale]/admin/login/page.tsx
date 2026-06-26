import { ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminBrand } from "@/components/admin/AdminBrand";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { resolveLocale } from "@/lib/site";
import { trimDisplayHeading } from "@/lib/displayText";
import { getBrandLogoAlt } from "@/lib/site";
import { getAdminSessionContext } from "@/lib/admin/auth";

type AdminLoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; notice?: string }>;
};

function getLoginNoticeCopy(
  notice: string | undefined,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  switch (notice) {
    case "account_inactive":
      return t("login.notices.accountInactive");
    case "account_not_configured":
      return t("login.notices.accountNotConfigured");
    case "invalid_link":
      return t("login.notices.invalidLink");
    case "password_updated":
      return t("login.notices.passwordUpdated");
    default:
      return "";
  }
}

export default async function AdminLoginPage({
  params,
  searchParams,
}: AdminLoginPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const brandLogoAlt = getBrandLogoAlt(locale);
  const access = await getAdminSessionContext();
  const resolvedSearchParams = await searchParams;
  const redirectTo =
    resolvedSearchParams.next?.startsWith(`/${locale}/admin`) &&
    !resolvedSearchParams.next.startsWith(`/${locale}/admin/login`)
      ? resolvedSearchParams.next
      : "";
  const noticeCopy = getLoginNoticeCopy(resolvedSearchParams.notice, t);

  if (access.state === "authenticated" && access.user) {
    redirect(redirectTo || getRoleDashboardPath(locale, access.user.role));
  }

  if (access.state === "denied") {
    const description =
      access.deniedReason === "inactive"
        ? t("login.notices.accountInactive")
        : t("login.notices.accountNotConfigured");

    return (
      <div className="space-y-8">
        <AdminBrand
          alt={brandLogoAlt}
          subtitle={t("header.adminArea")}
          className="w-fit"
          logoClassName="h-[3.1rem] sm:h-[3.55rem]"
          priority
        />
        <AdminCard
          title={t("common.noAccessTitle")}
          description={description}
          action={
            <AdminLogoutButton className="admin-button-secondary">
              {t("buttons.demoLogin")}
            </AdminLogoutButton>
          }
        />
      </div>
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

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="admin-heading text-foreground">
              {trimDisplayHeading(t("login.title"))}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted">
              {t("login.description")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <AdminCard className="h-full" contentClassName="space-y-3 px-5 py-5">
              <ShieldCheck className="h-6 w-6 text-gold-soft" />
              <h2 className="font-semibold text-foreground">
                {t("login.cards.securityTitle")}
              </h2>
              <p className="text-sm text-muted">{t("login.cards.securityText")}</p>
            </AdminCard>
            <AdminCard className="h-full" contentClassName="space-y-3 px-5 py-5">
              <UserCog className="h-6 w-6 text-gold-soft" />
              <h2 className="font-semibold text-foreground">
                {t("login.cards.rolesTitle")}
              </h2>
              <p className="text-sm text-muted">{t("login.cards.rolesText")}</p>
            </AdminCard>
            <AdminCard className="h-full" contentClassName="space-y-3 px-5 py-5">
              <Sparkles className="h-6 w-6 text-gold-soft" />
              <h2 className="font-semibold text-foreground">
                {t("login.cards.catalogTitle")}
              </h2>
              <p className="text-sm text-muted">{t("login.cards.catalogText")}</p>
            </AdminCard>
          </div>
        </div>

        <AdminCard
          title={t("login.formTitle")}
          description={t("login.formDescription")}
          action={<AdminBadge variant="info">{t("header.adminArea")}</AdminBadge>}
        >
          {noticeCopy ? (
            <div className="mb-4 rounded-[1.4rem] border border-gold/18 bg-gold/10 px-4 py-4 text-sm text-foreground">
              {noticeCopy}
            </div>
          ) : null}

          <AdminLoginForm locale={locale} redirectTo={redirectTo} />

          <div className="mt-6 space-y-3 rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">
              {t("login.cards.rolesTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              <AdminBadge variant="gold">{t("roles.super_admin")}</AdminBadge>
              <AdminBadge variant="neutral">{t("roles.admin")}</AdminBadge>
              <AdminBadge variant="neutral">{t("roles.employee")}</AdminBadge>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
