import "server-only";

import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import type { OrderDetailRecord } from "@/lib/db/orders";

/**
 * Emails sent to the team (workshop managers and their staff). They are
 * written in the language of the person who triggered them, share one
 * layout, and never contain customer contact details.
 */

type Row = { label: string; value: string };

type StaffEmailContent = {
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
  greeting: string;
  paragraphs: string[];
  rows?: Row[];
  subject: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function renderStaffEmail(locale: AppLocale, content: StaffEmailContent) {
  const t = await getTranslations({ locale, namespace: "StaffEmail" });
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const rows = (content.rows ?? []).filter((row) => row.value.trim().length > 0);

  const text = [
    content.greeting,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...rows.map((row) => `${row.label}: ${row.value}`),
    rows.length ? "" : null,
    content.ctaUrl ? `${content.ctaLabel ?? ""}: ${content.ctaUrl}` : null,
    content.footnote ? `\n${content.footnote}` : null,
    "",
    t("signature"),
  ]
    .filter((line) => line !== null)
    .join("\n");

  const rowsHtml = rows.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">${rows
        .map(
          (row) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #eee2c8;color:#6b5a3a;width:40%;vertical-align:top;text-align:${align}">${escapeHtml(
              row.label
            )}</td><td style="padding:8px 0;border-bottom:1px solid #eee2c8;color:#16120b;font-weight:600;vertical-align:top;text-align:${align};white-space:pre-wrap">${escapeHtml(
              row.value
            )}</td></tr>`
        )
        .join("")}</table>`
    : "";

  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#f6f1e7;padding:24px 12px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#16120b;line-height:1.6;text-align:${align}" dir="${dir}">
<div style="background:#0f0d0a;padding:20px 28px;color:#e4c67f;font-size:15px;letter-spacing:.04em;font-weight:700">GoldHelwah</div>
<div style="padding:28px">
<p style="margin:0 0 14px;font-size:16px">${escapeHtml(content.greeting)}</p>
${content.paragraphs.map((paragraph) => `<p style="margin:0 0 12px;font-size:15px">${escapeHtml(paragraph)}</p>`).join("")}
${rowsHtml}
${
  content.ctaUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(content.ctaUrl)}" style="display:inline-block;background:#c49a52;color:#16120b;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${escapeHtml(
        content.ctaLabel ?? content.ctaUrl
      )}</a></p><p style="margin:0 0 12px;font-size:12px;color:#7a6c55">${escapeHtml(t("linkFallback"))}<br><a href="${escapeHtml(
        content.ctaUrl
      )}" style="color:#7a5b20;word-break:break-all">${escapeHtml(content.ctaUrl)}</a></p>`
    : ""
}
${content.footnote ? `<p style="margin:16px 0 0;font-size:13px;color:#7a6c55">${escapeHtml(content.footnote)}</p>` : ""}
<p style="margin:24px 0 0;font-size:14px;white-space:pre-line">${escapeHtml(t("signature"))}</p>
</div></div></body></html>`;

  return { html, subject: content.subject, text };
}

export async function buildStaffAccessEmailContent(input: {
  callbackUrl: string;
  displayName: string;
  kind: "invite" | "password_reset";
  locale: AppLocale;
  roleLabel?: "manager" | "employee" | "staff";
  workshopName?: string;
}) {
  const t = await getTranslations({ locale: input.locale, namespace: "StaffEmail" });
  const name = input.displayName.trim();
  if (input.kind === "password_reset") {
    return renderStaffEmail(input.locale, {
      ctaLabel: t("reset.cta"),
      ctaUrl: input.callbackUrl,
      footnote: t("privateLink"),
      greeting: name ? t("greeting", { name }) : t("greetingPlain"),
      paragraphs: [t("reset.intro")],
      subject: t("reset.subject"),
    });
  }

  const intro =
    input.roleLabel === "manager" && input.workshopName
      ? t("invite.introManager", { workshop: input.workshopName })
      : input.roleLabel === "employee" && input.workshopName
        ? t("invite.introEmployee", { workshop: input.workshopName })
        : t("invite.introStaff");

  return renderStaffEmail(input.locale, {
    ctaLabel: t("invite.cta"),
    ctaUrl: input.callbackUrl,
    footnote: t("privateLink"),
    greeting: name ? t("greeting", { name }) : t("greetingPlain"),
    paragraphs: [intro, t("invite.steps")],
    subject: t("invite.subject"),
  });
}

const detailFieldKeys: Record<string, string> = {
  braceletSize: "braceletSize",
  chainLength: "chainLength",
  customerNotes: "customerNotes",
  deliveryNotes: "deliveryNotes",
  engravingText: "engravingText",
  goldColor: "goldColor",
  goldKarat: "goldKarat",
  nameLanguage: "nameLanguage",
  nameText: "nameText",
  packagingNotes: "packagingNotes",
  qualityRequirements: "qualityRequirements",
  ringSize: "ringSize",
  specialInstructions: "attachmentNotes",
  stoneColor: "stoneColor",
  stoneType: "stoneType",
  weightGrams: "estimatedWeight",
  workshopNotes: "workshopNotes",
};

function formatOptionValue(value: unknown) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(", ");
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value.trim();
  return "";
}

/** The production details a workshop needs; no customer contact data. */
export async function buildOrderDetailRows(locale: AppLocale, order: OrderDetailRecord): Promise<Row[]> {
  const t = await getTranslations({ locale, namespace: "StaffEmail" });
  const ta = await getTranslations({ locale, namespace: "Admin" });
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const item = order.items[0];
  const rows: Row[] = [
    { label: t("rows.order"), value: order.internalOrderNumber },
    { label: t("rows.product"), value: item?.productName || order.previewProductName },
    { label: t("rows.quantity"), value: String(item?.quantity ?? order.itemCount ?? 1) },
    { label: t("rows.priority"), value: ta(`priority.${order.priority}`) },
    { label: t("rows.dueDate"), value: order.dueDate ? format.format(new Date(order.dueDate)) : "" },
  ];

  for (const orderItem of order.items) {
    for (const option of orderItem.selectedOptions) {
      rows.push({ label: option.label, value: formatOptionValue(option.value) });
    }
  }

  const groups = [order.goldDetails, order.measurements, order.personalization, order.stones, order.notes];
  for (const group of groups) {
    for (const [key, value] of Object.entries(group)) {
      const fieldKey = detailFieldKeys[key];
      if (!fieldKey || !value?.trim()) continue;
      rows.push({ label: ta(`newOrder.fields.${fieldKey}`), value });
    }
  }

  return rows;
}

export async function buildWorkshopOrderEmail(input: {
  locale: AppLocale;
  note: string;
  order: OrderDetailRecord;
  recipientName: string;
  url: string;
  workshopName: string;
}) {
  const t = await getTranslations({ locale: input.locale, namespace: "StaffEmail" });
  const rows = await buildOrderDetailRows(input.locale, input.order);
  if (input.note) rows.splice(1, 0, { label: t("rows.noteFromOffice"), value: input.note });
  return renderStaffEmail(input.locale, {
    ctaLabel: t("workshopOrder.cta"),
    ctaUrl: input.url,
    greeting: input.recipientName ? t("greeting", { name: input.recipientName }) : t("greetingPlain"),
    paragraphs: [t("workshopOrder.intro", { workshop: input.workshopName }), t("workshopOrder.next")],
    rows,
    subject: t("workshopOrder.subject", { order: input.order.internalOrderNumber }),
  });
}

export async function buildEmployeeTaskEmail(input: {
  locale: AppLocale;
  managerName: string;
  note: string;
  order: OrderDetailRecord;
  recipientName: string;
  url: string;
}) {
  const t = await getTranslations({ locale: input.locale, namespace: "StaffEmail" });
  const rows = await buildOrderDetailRows(input.locale, input.order);
  if (input.note) rows.splice(1, 0, { label: t("rows.noteFromManager"), value: input.note });
  return renderStaffEmail(input.locale, {
    ctaLabel: t("employeeTask.cta"),
    ctaUrl: input.url,
    greeting: input.recipientName ? t("greeting", { name: input.recipientName }) : t("greetingPlain"),
    paragraphs: [t("employeeTask.intro", { manager: input.managerName }), t("employeeTask.next")],
    rows,
    subject: t("employeeTask.subject", { order: input.order.internalOrderNumber }),
  });
}

export async function buildTaskAlertEmail(input: {
  employeeName: string;
  locale: AppLocale;
  note: string;
  orderNumber: string;
  recipientName: string;
  status: "declined" | "problem";
  url: string;
}) {
  const t = await getTranslations({ locale: input.locale, namespace: "StaffEmail" });
  return renderStaffEmail(input.locale, {
    ctaLabel: t("taskAlert.cta"),
    ctaUrl: input.url,
    greeting: input.recipientName ? t("greeting", { name: input.recipientName }) : t("greetingPlain"),
    paragraphs: [t(`taskAlert.${input.status}`, { employee: input.employeeName, order: input.orderNumber })],
    rows: input.note ? [{ label: t("rows.reason"), value: input.note }] : [],
    subject: t(`taskAlert.${input.status}Subject`, { order: input.orderNumber }),
  });
}
