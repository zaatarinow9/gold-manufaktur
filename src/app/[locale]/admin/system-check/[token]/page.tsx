import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminAccess } from "@/lib/admin/auth";
import { clearAdminDecoySession, hasValidAdminDecoySession } from "@/lib/admin/decoyGateSession";
import {
  assertCanUseDecoyGate,
  getAdminDecoyControl,
  isAdminDecoyConfigured,
  logAdminDecoyAudit,
  validateAdminDecoyGateToken,
} from "@/lib/db/adminDecoy";
import { resolveLocale } from "@/lib/site";

import { SystemCheckClient } from "./system-check-client";

type SystemCheckPageProps = {
  params: Promise<{ locale: string; token: string }>;
};

async function getAuditMeta() {
  const requestHeaders = await headers();
  return {
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: requestHeaders.get("user-agent") ?? "",
  };
}

export default async function SystemCheckPage({ params }: SystemCheckPageProps) {
  const { token, locale: localeParam } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const t = await getTranslations({ locale, namespace: "Admin.systemCheck" });
  const access = await requireAdminAccess(locale);
  const auditMeta = await getAuditMeta();

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied
        title={t("unavailable")}
        description={t("unavailable")}
      />
    );
  }

  try {
    assertCanUseDecoyGate(access.user);
  } catch {
    await logAdminDecoyAudit("decoy_gate_forbidden", {
      email: access.user.email,
      source: "system-check-page",
      userAgent: auditMeta.userAgent,
      userId: access.user.id,
    });

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t("title")}
          title={t("title")}
          description={t("description")}
        />
        <AdminCard title={t("unavailable")}>
          <p className="text-sm text-muted">{t("unavailable")}</p>
        </AdminCard>
      </div>
    );
  }

  if (!isAdminDecoyConfigured()) {
    await clearAdminDecoySession();
    await logAdminDecoyAudit("decoy_gate_unavailable", {
      email: access.user.email,
      source: "system-check-page",
      userAgent: auditMeta.userAgent,
      userId: access.user.id,
    }, {
      reason: "env_missing",
    });

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t("title")}
          title={t("title")}
          description={t("description")}
        />
        <AdminCard title={t("unavailable")}>
          <p className="text-sm text-muted">{t("unavailable")}</p>
        </AdminCard>
      </div>
    );
  }

  const tokenValid = await validateAdminDecoyGateToken(token);

  if (!tokenValid) {
    await clearAdminDecoySession();
    await logAdminDecoyAudit("decoy_gate_unavailable", {
      email: access.user.email,
      source: "system-check-page",
      userAgent: auditMeta.userAgent,
      userId: access.user.id,
    }, {
      reason: "token_invalid",
    });

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t("title")}
          title={t("title")}
          description={t("description")}
        />
        <AdminCard title={t("unavailable")}>
          <p className="text-sm text-muted">{t("unavailable")}</p>
        </AdminCard>
      </div>
    );
  }

  const control = await getAdminDecoyControl();
  const unlocked = await hasValidAdminDecoySession({
    tokenHash: control.gateTokenHash,
    tokenVersion: control.tokenVersion,
    userId: access.user.id,
  });

  await logAdminDecoyAudit(unlocked ? "decoy_gate_view" : "decoy_gate_locked_view", {
    email: access.user.email,
    source: "system-check-page",
    userAgent: auditMeta.userAgent,
    userId: access.user.id,
  }, {
    tokenVersion: control.tokenVersion,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("title")}
        title={t("title")}
        description={t("description")}
      />
      <SystemCheckClient
        initialControl={control}
        locale={locale}
        token={token}
        unlocked={unlocked}
      />
    </div>
  );
}
