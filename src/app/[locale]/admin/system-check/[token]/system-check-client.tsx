"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { unlockSystemCheckAction, runSystemCheckAction } from "@/app/[locale]/admin/system-check/[token]/actions";
import type { AppLocale } from "@/i18n/routing";
import type { AdminDecoyControlRecord } from "@/lib/db/adminDecoy";

type SystemCheckClientProps = {
  initialControl: AdminDecoyControlRecord;
  locale: AppLocale;
  token: string;
  unlocked: boolean;
};

function toLocalDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function formatLabel(value: string) {
  if (!value) {
    return "-";
  }

  return value.slice(0, 16).replace("T", " ");
}

export function SystemCheckClient({
  initialControl,
  locale,
  token,
  unlocked,
}: SystemCheckClientProps) {
  const t = useTranslations("Admin.systemCheck");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pin, setPin] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [currentControl, setCurrentControl] = useState(initialControl);
  const [expiresAt, setExpiresAt] = useState(
    toLocalDateTimeInput(initialControl.expiresAt)
  );
  const [latestEmailSent, setLatestEmailSent] = useState<boolean | null>(null);
  const [latestLink, setLatestLink] = useState("");
  const syncLabel = currentControl.isDecoyEnabled
    ? t("statusEnabled")
    : t("statusDisabled");
  const gateLabel = currentControl.gateEnabled
    ? t("gateEnabled")
    : t("gateDisabled");
  const currentModeLabel = useMemo(
    () => ({
      gate: gateLabel,
      sync: syncLabel,
    }),
    [gateLabel, syncLabel]
  );

  const handleUnlock = () => {
    startTransition(async () => {
      const result = await unlockSystemCheckAction(locale, token, pin);
      setFeedback(result.message);

      if (result.ok) {
        setPin("");
        router.refresh();
      }
    });
  };

  const handleAction = (intent: "disable_gate" | "rotate" | "set_expiry" | "sync_off" | "sync_on") => {
    startTransition(async () => {
      const result = await runSystemCheckAction(locale, token, {
        expiresAt: fromLocalDateTimeInput(expiresAt),
        intent,
      });

      setFeedback(result.message);

      if (result.control) {
        setCurrentControl(result.control);
        setExpiresAt(toLocalDateTimeInput(result.control.expiresAt));
      }

      if (result.link) {
        setLatestEmailSent(result.emailSent ?? null);
        setLatestLink(result.link);
      } else if (intent !== "rotate") {
        setLatestEmailSent(null);
        setLatestLink("");
      }

      if (result.ok && result.refresh !== false) {
        router.refresh();
      }
    });
  };

  const handleCopyLink = async () => {
    if (!latestLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestLink);
      setFeedback(t("copySuccess"));
    } catch {
      setFeedback(latestLink);
    }
  };

  if (!unlocked) {
    return (
      <AdminCard title={t("title")} description={t("unlockDescription")}>
        <div className="space-y-4">
          {feedback ? (
            <div className="rounded-[0.95rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
              {feedback}
            </div>
          ) : null}
          <AdminInput
            id="systemCheckPin"
            name="systemCheckPin"
            label={t("pinLabel")}
            value={pin}
            placeholder={t("pinPlaceholder")}
            onChange={(event) => setPin(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="primary"
              onClick={handleUnlock}
              disabled={isPending || pin.trim().length === 0}
            >
              {t("continue")}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => router.refresh()} disabled={isPending}>
              {t("refresh")}
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="rounded-[0.95rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {latestLink ? (
        <AdminCard
          title={t("linkReadyTitle")}
          description={t("linkReadyDescription")}
        >
          <div className="space-y-4">
            <div className="rounded-[0.95rem] border border-gold/18 bg-gold/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                {t("deliveryStatusLabel")}
              </p>
              <div className="mt-2">
                <AdminBadge variant={latestEmailSent ? "gold" : "neutral"}>
                  {latestEmailSent ? t("deliverySent") : t("deliveryFailed")}
                </AdminBadge>
              </div>
            </div>

            <AdminInput
              id="systemCheckLink"
              name="systemCheckLink"
              label={t("newLinkLabel")}
              value={latestLink}
              readOnly
              className="font-mono text-xs"
            />

            <p className="text-sm text-muted">{t("linkShownOnce")}</p>

            <div className="flex flex-wrap gap-2">
              <AdminButton variant="primary" onClick={handleCopyLink} disabled={isPending}>
                {t("copyLink")}
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard title={t("statusTitle")} description={t("statusDescription")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("sync")}</p>
            <div className="mt-2">
              <AdminBadge variant={currentControl.isDecoyEnabled ? "gold" : "neutral"}>
                {currentModeLabel.sync}
              </AdminBadge>
            </div>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("gate")}</p>
            <div className="mt-2">
              <AdminBadge variant={currentControl.gateEnabled ? "info" : "neutral"}>
                {currentModeLabel.gate}
              </AdminBadge>
            </div>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("version")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {currentControl.tokenVersion}
            </p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("expiresAt")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatLabel(currentControl.expiresAt)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("lastRotatedAt")}</p>
            <p className="mt-2 text-sm text-foreground">
              {formatLabel(currentControl.lastRotatedAt)}
            </p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("lastUsedAt")}</p>
            <p className="mt-2 text-sm text-foreground">
              {formatLabel(currentControl.lastUsedAt)}
            </p>
          </div>
        </div>
      </AdminCard>

      <AdminCard title={t("title")} description={t("description")}>
        <div className="space-y-4">
          <AdminInput
            id="systemCheckExpiresAt"
            name="systemCheckExpiresAt"
            type="datetime-local"
            label={t("expiresAt")}
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="primary"
              onClick={() => handleAction("sync_on")}
              disabled={isPending}
            >
              {t("syncOn")}
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => handleAction("sync_off")}
              disabled={isPending}
            >
              {t("syncOff")}
            </AdminButton>
            <AdminButton
              variant="ghost"
              onClick={() => handleAction("set_expiry")}
              disabled={isPending}
            >
              {t("setExpiry")}
            </AdminButton>
            <AdminButton
              variant="ghost"
              onClick={() => handleAction("rotate")}
              disabled={isPending}
            >
              {t("rotate")}
            </AdminButton>
            <AdminButton
              variant="danger"
              onClick={() => handleAction("disable_gate")}
              disabled={isPending}
            >
              {t("disableGate")}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => router.refresh()} disabled={isPending}>
              {t("refresh")}
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
