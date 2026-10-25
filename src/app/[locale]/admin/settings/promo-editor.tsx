"use client";

import { Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
import { AdminTranslationFields } from "@/components/admin/AdminTranslationFields";
import type { AppLocale } from "@/i18n/routing";
import type { PromoText, PublicPromoPopup } from "@/lib/db/siteSettings";

function toLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromLocalInput(value: string, endOfDay: boolean) {
  if (!value) return "";
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function pick(text: PromoText, locale: AppLocale) {
  return text[locale] || text.de || Object.values(text).find(Boolean) || "";
}

type Props = {
  disabled: boolean;
  imageControl: React.ReactNode;
  imageUrl: string;
  onChange: (next: PublicPromoPopup) => void;
  onSave: () => void;
  promo: PublicPromoPopup;
  saving: boolean;
};

/** The homepage announcement: write it once, see it as visitors will. */
export function PromoEditor({ disabled, imageControl, imageUrl, onChange, onSave, promo, saving }: Props) {
  const t = useTranslations("Admin.flow.promo");
  const locale = useLocale() as AppLocale;
  const set = <Key extends keyof PublicPromoPopup>(key: Key, value: PublicPromoPopup[Key]) => onChange({ ...promo, [key]: value });
  const setText = (key: "ctaText" | "description" | "title", target: AppLocale, value: string) =>
    onChange({ ...promo, [key]: { ...promo[key], [target]: value } });

  const title = pick(promo.title, locale);
  const description = pick(promo.description, locale);
  const ctaText = pick(promo.ctaText, locale);

  return (
    <div className="admin-panel">
      <header className="flex flex-wrap items-start gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted">{t("description")}</p>
        </div>
        <AdminButton variant="primary" onClick={onSave} disabled={disabled}>
          {saving ? t("saving") : t("save")}
        </AdminButton>
      </header>

      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <AdminSwitch
            checked={promo.enabled}
            onChange={(checked) => set("enabled", checked)}
            label={t("enabled")}
            description={promo.enabled ? t("enabledOn") : t("enabledOff")}
          />

          <AdminTranslationFields
            fields={[
              { key: "title", label: t("fieldTitle"), placeholder: t("titlePlaceholder"), required: promo.enabled, value: promo.title },
              { key: "description", label: t("fieldText"), multiline: true, placeholder: t("textPlaceholder"), value: promo.description },
              { key: "ctaText", label: t("fieldButton"), placeholder: t("buttonPlaceholder"), value: promo.ctaText },
            ]}
            onChange={(key, target, value) => setText(key as "ctaText" | "description" | "title", target, value)}
          />

          <AdminInput
            label={t("fieldLink")}
            dir="ltr"
            value={promo.ctaUrl}
            placeholder="/shop"
            helperText={t("linkHint")}
            onChange={(event) => set("ctaUrl", event.target.value)}
          />

          <div className="space-y-2">
            <p className="admin-label">{t("fieldImage")}</p>
            {imageControl}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput
              type="date"
              label={t("from")}
              helperText={t("fromHint")}
              value={toLocalInput(promo.startsAt)}
              onChange={(event) => set("startsAt", fromLocalInput(event.target.value, false))}
            />
            <AdminInput
              type="date"
              label={t("until")}
              helperText={t("untilHint")}
              value={toLocalInput(promo.endsAt)}
              onChange={(event) => set("endsAt", fromLocalInput(event.target.value, true))}
            />
          </div>

          <AdminSwitch checked={promo.showOnce} onChange={(checked) => set("showOnce", checked)} label={t("showOnce")} description={t("showOnceHint")} />
        </div>

        <aside aria-label={t("preview")} className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
            <Eye className="h-3.5 w-3.5" />
            {t("preview")}
          </p>
          <div className="rounded-[0.9rem] bg-black/40 p-3" dir={locale === "ar" ? "rtl" : "ltr"}>
            <div className="promo-card !max-h-none !animate-none">
              {imageUrl ? (
                <div className="promo-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="promo-body !p-5">
                <p className="promo-title !text-[1.4rem]">{title || t("previewEmptyTitle")}</p>
                {description ? <p className="promo-text !text-sm">{description}</p> : null}
                <div className="promo-actions !mt-4">
                  {ctaText && promo.ctaUrl ? <span className="gold-button !min-h-9 !px-4 !py-2 !text-sm">{ctaText}</span> : null}
                  <span className="promo-dismiss !text-xs">{t("previewDismiss")}</span>
                </div>
              </div>
            </div>
          </div>
          {!promo.enabled ? <p className="mt-2 text-xs text-text-soft">{t("previewOff")}</p> : null}
        </aside>
      </div>
    </div>
  );
}
