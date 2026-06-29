import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { AdminLanguageSwitcher } from "@/components/admin/AdminLanguageSwitcher";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { Link } from "@/i18n/navigation";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { getAdminSessionContext } from "@/lib/admin/auth";
import { resolveLocale } from "@/lib/site";
import { trimDisplayHeading } from "@/lib/displayText";
import { getBrandLogoAlt } from "@/lib/site";

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

  const isDenied = access.state === "denied";
  const deniedDescription = isDenied
    ? access.deniedReason === "inactive"
      ? t("login.notices.accountInactive")
      : t("login.notices.accountNotConfigured")
    : "";

  return (
    <div className="admin-login-shell">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminBrand
            alt={brandLogoAlt}
            href="/"
            subtitle={t("header.adminArea")}
            className="w-fit gap-3"
            logoClassName="h-[3.2rem] sm:h-[3.8rem]"
            priority
          />

          <div className="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:self-auto">
            <Link
              href="/"
              className="admin-button admin-button-ghost w-full justify-center rounded-[1rem] px-4 sm:w-auto"
            >
              {t("header.toWebsite")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <AdminLanguageSwitcher className="w-full justify-between sm:w-auto sm:justify-start" />
          </div>
        </div>

        <div className="flex flex-1 items-start py-6 sm:py-8 lg:items-center lg:py-14">
          <div className="grid w-full items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(25rem,31rem)] lg:items-center lg:gap-8 xl:gap-10">
            <section className="admin-login-hero order-2 p-6 sm:p-8 lg:order-1 lg:p-10 xl:min-h-[36rem] xl:p-12">
              <div className="relative flex h-full flex-col justify-between gap-12">
                <div className="space-y-6 sm:space-y-8">
                  <span className="inline-flex w-fit rounded-full border border-gold/18 bg-gold/10 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-soft">
                    {t("header.adminArea")}
                  </span>
                  <div className="space-y-4">
                    <h1 className="max-w-[11ch] font-display text-[clamp(2.4rem,13vw,5.8rem)] leading-[0.92] tracking-[-0.05em] text-foreground [overflow-wrap:anywhere]">
                      {trimDisplayHeading(t("login.title"))}
                    </h1>
                    <p className="max-w-[38rem] text-base leading-8 text-muted sm:text-lg">
                      {t("login.description")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/34 to-transparent" />
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-gold-soft">
                    Gold Helwah
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/34 to-transparent" />
                </div>
              </div>
            </section>

            <section className="admin-login-panel order-1 mx-auto w-full max-w-[31rem] lg:order-2">
              <div className="relative p-6 sm:p-8 lg:p-10">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <span className="inline-flex w-fit rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-gold-soft">
                      {isDenied ? t("common.noAccessTitle") : t("login.formTitle")}
                    </span>
                    <div className="space-y-2">
                      <h2 className="text-[1.95rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.2rem]">
                        {isDenied ? t("common.noAccessTitle") : t("login.formTitle")}
                      </h2>
                      <p className="text-sm leading-7 text-muted sm:text-[0.95rem]">
                        {isDenied ? deniedDescription : t("login.formDescription")}
                      </p>
                    </div>
                  </div>

                  {!isDenied && noticeCopy ? (
                    <div className="admin-login-notice border border-gold/18 bg-gold/10 text-foreground">
                      {noticeCopy}
                    </div>
                  ) : null}

                  {isDenied ? (
                    <AdminLogoutButton className="admin-button-secondary w-full rounded-[1.15rem] py-3">
                      {t("buttons.demoLogin")}
                    </AdminLogoutButton>
                  ) : (
                    <AdminLoginForm locale={locale} redirectTo={redirectTo} />
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
