"use client";

import { ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { adminUsers } from "@/data/adminMock";
import { Link } from "@/i18n/navigation";
import { MOCK_ADMIN_ROLE, getCurrentAdminUser } from "@/lib/admin/currentUser";
import { trimDisplayHeading } from "@/lib/displayText";
import type { AppLocale } from "@/i18n/routing";
import { getBrandLogoAlt } from "@/lib/site";

export default function AdminLoginPage() {
  const t = useTranslations("Admin");
  const locale = useLocale() as AppLocale;
  const currentUser = getCurrentAdminUser();
  const brandLogoAlt = getBrandLogoAlt(locale);

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
              <h2 className="font-semibold text-foreground">{t("login.cards.securityTitle")}</h2>
              <p className="text-sm text-muted">{t("login.cards.securityText")}</p>
            </AdminCard>
            <AdminCard className="h-full" contentClassName="space-y-3 px-5 py-5">
              <UserCog className="h-6 w-6 text-gold-soft" />
              <h2 className="font-semibold text-foreground">{t("login.cards.rolesTitle")}</h2>
              <p className="text-sm text-muted">{t("login.cards.rolesText")}</p>
            </AdminCard>
            <AdminCard className="h-full" contentClassName="space-y-3 px-5 py-5">
              <Sparkles className="h-6 w-6 text-gold-soft" />
              <h2 className="font-semibold text-foreground">{t("login.cards.catalogTitle")}</h2>
              <p className="text-sm text-muted">{t("login.cards.catalogText")}</p>
            </AdminCard>
          </div>
        </div>

        <AdminCard
          title={t("login.formTitle")}
          description={t("login.formDescription")}
          action={<AdminBadge variant="info">{t(`roles.${currentUser.role}`)}</AdminBadge>}
        >
          <div className="space-y-4">
            <AdminInput
              id="email"
              label={t("login.email")}
              defaultValue={currentUser.email}
              placeholder={t("login.email")}
            />
            <AdminInput
              id="password"
              type="password"
              label={t("login.password")}
              defaultValue="demo-password"
              placeholder={t("login.password")}
            />
            <div className="rounded-[1.4rem] border border-gold/18 bg-gold/10 px-4 py-4 text-sm text-muted">
              {t("login.demoHint", { role: t(`roles.${MOCK_ADMIN_ROLE}`) })}
            </div>
            <Link href="/admin" className="admin-button-primary w-full">
              {t("buttons.next")}
            </Link>
          </div>

          <div className="mt-6 space-y-3 rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">{t("login.demoUsersTitle")}</p>
            <div className="space-y-2">
              {adminUsers.map((user) => (
                <div
                  key={user.id}
                  className="rtl-inline-row flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </div>
                  <AdminBadge
                    variant={user.role === MOCK_ADMIN_ROLE ? "gold" : "neutral"}
                  >
                    {t(`roles.${user.role}`)}
                  </AdminBadge>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
