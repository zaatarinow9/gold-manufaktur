import "server-only";

import type { Json } from "@/lib/supabase/types";
import { brandLogoPath, companyInfo, siteName } from "@/lib/site";
import type { AppLocale } from "@/i18n/routing";
import { normalizePublicTrackingStage } from "@/lib/orderTracking/publicStages";
import type { PublicTrackingStage } from "@/types/admin";

export type CustomerEmailTemplateType =
  | "order_confirmation"
  | "public_stage_update";

export type CustomerEmailItem = {
  customerNote: string | null;
  designLanguage: string | null;
  karat: string | null;
  name: string;
  quantity: number;
  requestedName: string | null;
  totalPrice: number | null;
  unitPrice: number | null;
  weight: string | null;
};

type CustomerEmailCopy = {
  brandLabel: string;
  confirmationLead: string;
  confirmationNextStep: string;
  confirmationSubject: string;
  confirmationTitle: string;
  customerNoteLabel: string;
  footerLabel: string;
  homepageLabel: string;
  menuLabel: string;
  notProvided: string;
  progressDescription: string;
  progressTitle: string;
  productDetailsTitle: string;
  stages: Record<PublicTrackingStage, string>;
  stageDescriptions: Record<PublicTrackingStage, string>;
  stageLeadPrefix: string;
  stageSubjects: Record<PublicTrackingStage, string>;
  tableLabels: {
    customerNote: string;
    designLanguage: string;
    karat: string;
    productName: string;
    quantity: string;
    requestedName: string;
    totalPrice: string;
    unitPrice: string;
    weight: string;
  };
  textGreeting: (customerName: string) => string;
  trackingHelp: string;
  trackingNumberLabel: string;
  totalAmountLabel: string;
};

type CustomerOrderEmailInput = {
  currency?: string | null;
  customerName: string;
  customerNote?: string | null;
  items: CustomerEmailItem[];
  locale: AppLocale;
  publicStage?: PublicTrackingStage | null;
  totalAmount?: number | null;
  trackingNumber: string;
  type: CustomerEmailTemplateType;
};

const germanCopy: CustomerEmailCopy = {
  brandLabel: "GoldHelwah GmbH",
  confirmationLead:
    "Vielen Dank, dass Sie sich fuer GoldHelwah entschieden haben. Wir haben Ihren Auftrag erhalten und bestaetigt.",
  confirmationNextStep:
    'Sie koennen Ihren Auftrag ueber den Menuepunkt "Auftrag verfolgen" auf unserer Website verfolgen und dort Ihre Tracking-Nummer eingeben.',
  confirmationSubject: "Wir haben Ihren Auftrag erhalten - GoldHelwah",
  confirmationTitle: "Wir haben Ihren Auftrag erhalten",
  customerNoteLabel: "Kundenhinweis",
  footerLabel: "Kontaktinformationen",
  homepageLabel: "Website",
  menuLabel: "Auftrag verfolgen",
  notProvided: "Nicht angegeben",
  progressDescription:
    "Oeffentliche Statusupdates werden nur fuer Werkstatt, Versand und Abholung angezeigt.",
  progressTitle: "Oeffentlicher Status",
  productDetailsTitle: "Produktdetails",
  stages: {
    order_in_workshop: "Auftrag in der Werkstatt",
    shipping: "Auftrag wird versendet",
    ready_for_pickup: "Bereit zur Abholung",
  },
  stageDescriptions: {
    order_in_workshop: "Ihr Auftrag befindet sich jetzt in unserer Werkstatt.",
    shipping: "Ihr Auftrag wird jetzt versendet.",
    ready_for_pickup: "Ihr Auftrag ist jetzt zur Abholung bereit.",
  },
  stageLeadPrefix: "Aktuelle oeffentliche Phase",
  stageSubjects: {
    order_in_workshop: "Ihr Auftrag ist jetzt in der Werkstatt - GoldHelwah",
    shipping: "Ihr Auftrag wird versendet - GoldHelwah",
    ready_for_pickup: "Ihr Auftrag ist abholbereit - GoldHelwah",
  },
  tableLabels: {
    customerNote: "Kundennotiz",
    designLanguage: "Designsprache",
    karat: "Legierung",
    productName: "Produkt",
    quantity: "Menge",
    requestedName: "Gewuenschter Name",
    totalPrice: "Gesamtbetrag",
    unitPrice: "Einzelpreis",
    weight: "Gewicht",
  },
  textGreeting: (customerName) =>
    customerName ? `Guten Tag ${customerName},` : "Guten Tag,",
  trackingHelp:
    'Sie koennen Ihren Auftrag ueber den Menuepunkt "Auftrag verfolgen" auf unserer Website verfolgen und dort Ihre Tracking-Nummer eingeben.',
  trackingNumberLabel: "Tracking-Nummer",
  totalAmountLabel: "Gesamtbetrag",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(
  amount: number | null | undefined,
  currency: string | null | undefined,
  fallback: string
) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return fallback;
  }

  const normalizedCurrency = (currency || "EUR").trim().toUpperCase() || "EUR";

  try {
    return new Intl.NumberFormat("de", {
      currency: normalizedCurrency,
      style: "currency",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`;
  }
}

function buildHomepageUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://gold-manufaktur.vercel.app";

  return siteUrl.replace(/\/$/, "");
}

function buildLogoUrl() {
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim();

  if (logoUrl) {
    return logoUrl;
  }

  return `${buildHomepageUrl()}${brandLogoPath}`;
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "";
}

function renderTextOrFallback(value: string | null | undefined, fallback: string) {
  const normalized = normalizeText(value);
  return normalized || fallback;
}

function renderCustomerNoteHtml(note: string) {
  return escapeHtml(note).replace(/\n/g, "<br />");
}

function buildDetailRows(
  copy: CustomerEmailCopy,
  items: CustomerEmailItem[],
  currency: string | null | undefined
) {
  return items
    .map((item) => {
      const unitPrice = formatCurrency(item.unitPrice, currency, copy.notProvided);
      const totalPrice = formatCurrency(item.totalPrice, currency, copy.notProvided);

      return `
        <tr>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#f7f1e3;font-size:13px;vertical-align:top;">${escapeHtml(item.name)}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(String(item.quantity))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.karat, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.weight, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.requestedName, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.designLanguage, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.customerNote, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#f7f1e3;font-size:13px;vertical-align:top;">${escapeHtml(unitPrice)}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#f7f1e3;font-size:13px;vertical-align:top;">${escapeHtml(totalPrice)}</td>
        </tr>
      `;
    })
    .join("");
}

function buildProgressRows(copy: CustomerEmailCopy, publicStage: PublicTrackingStage | null) {
  return (["order_in_workshop", "shipping", "ready_for_pickup"] as const)
    .map((stage, index) => {
      const currentIndex = publicStage
        ? (["order_in_workshop", "shipping", "ready_for_pickup"] as const).indexOf(publicStage)
        : -1;
      const isCurrent = currentIndex === index;
      const isComplete = currentIndex > index;
      const background = isCurrent
        ? "rgba(196,154,82,0.16)"
        : isComplete
          ? "rgba(232,201,135,0.08)"
          : "rgba(255,255,255,0.03)";
      const border = isCurrent || isComplete
        ? "rgba(196,154,82,0.28)"
        : "rgba(255,255,255,0.08)";

      return `
        <tr>
          <td style="padding:0 0 12px 0;">
            <div style="border:1px solid ${border};border-radius:18px;background:${background};padding:14px 16px;">
              <div style="color:#e8c987;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:6px;">0${index + 1}</div>
              <div style="color:#f7f1e3;font-size:15px;font-weight:600;">${escapeHtml(copy.stages[stage])}</div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildTextBody(input: CustomerOrderEmailInput, copy: CustomerEmailCopy) {
  const homepageUrl = buildHomepageUrl();
  const publicStageLine =
    input.type === "public_stage_update" && input.publicStage
      ? `${copy.stageLeadPrefix}: ${copy.stages[input.publicStage]}`
      : "";
  const totalAmount = formatCurrency(input.totalAmount, input.currency, copy.notProvided);
  const customerNote = normalizeText(input.customerNote);
  const itemLines = input.items.flatMap((item, index) => {
    const unitPrice = formatCurrency(item.unitPrice, input.currency, copy.notProvided);
    const totalPrice = formatCurrency(item.totalPrice, input.currency, copy.notProvided);

    return [
      `${index + 1}. ${item.name}`,
      `   ${copy.tableLabels.quantity}: ${item.quantity}`,
      `   ${copy.tableLabels.karat}: ${renderTextOrFallback(item.karat, copy.notProvided)}`,
      `   ${copy.tableLabels.weight}: ${renderTextOrFallback(item.weight, copy.notProvided)}`,
      `   ${copy.tableLabels.requestedName}: ${renderTextOrFallback(item.requestedName, copy.notProvided)}`,
      `   ${copy.tableLabels.designLanguage}: ${renderTextOrFallback(item.designLanguage, copy.notProvided)}`,
      `   ${copy.tableLabels.customerNote}: ${renderTextOrFallback(item.customerNote, copy.notProvided)}`,
      `   ${copy.tableLabels.unitPrice}: ${unitPrice}`,
      `   ${copy.tableLabels.totalPrice}: ${totalPrice}`,
    ];
  });

  const intro =
    input.type === "order_confirmation"
      ? `${copy.confirmationTitle}\n${copy.confirmationLead}\n${copy.confirmationNextStep}`
      : input.publicStage
        ? `${copy.stageLeadPrefix}: ${copy.stages[input.publicStage]}\n${copy.stageDescriptions[input.publicStage]}`
        : copy.progressDescription;

  return [
    siteName,
    "",
    copy.textGreeting(input.customerName),
    "",
    intro,
    "",
    `${copy.trackingNumberLabel}: ${input.trackingNumber}`,
    publicStageLine,
    `${copy.totalAmountLabel}: ${totalAmount}`,
    customerNote ? `${copy.customerNoteLabel}: ${customerNote}` : "",
    "",
    copy.productDetailsTitle,
    ...itemLines,
    "",
    copy.trackingHelp,
    homepageUrl,
    "",
    `${copy.footerLabel}:`,
    companyInfo.address,
    companyInfo.phoneDisplay,
    companyInfo.emailDisplay,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtmlBody(input: CustomerOrderEmailInput, copy: CustomerEmailCopy) {
  const homepageUrl = buildHomepageUrl();
  const logoUrl = buildLogoUrl();
  const customerNote = normalizeText(input.customerNote);
  const totalAmount = formatCurrency(input.totalAmount, input.currency, copy.notProvided);
  const introTitle =
    input.type === "order_confirmation"
      ? copy.confirmationTitle
      : input.publicStage
        ? copy.stages[input.publicStage]
        : copy.progressTitle;
  const introText =
    input.type === "order_confirmation"
      ? `${copy.confirmationLead} ${copy.confirmationNextStep}`
      : input.publicStage
        ? copy.stageDescriptions[input.publicStage]
        : copy.progressDescription;

  return `
    <!doctype html>
    <html lang="de">
      <body style="margin:0;padding:0;background:#060606;color:#f7f1e3;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060606;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;border-collapse:separate;border-spacing:0;background:linear-gradient(180deg,#17120d,#090909);border:1px solid rgba(196,154,82,0.24);border-radius:28px;overflow:hidden;">
                <tr>
                  <td style="padding:30px 28px 20px 28px;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="text-align:center;">
                      <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" width="164" style="display:block;margin:0 auto 14px auto;height:auto;max-width:164px;" />
                      <div style="color:#e8c987;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(copy.brandLabel)}</div>
                      <h1 style="margin:0;color:#f7f1e3;font-size:30px;line-height:1.15;">${escapeHtml(introTitle)}</h1>
                      <p style="margin:14px auto 0 auto;max-width:560px;color:#c7b99e;font-size:15px;line-height:1.7;">${escapeHtml(copy.textGreeting(input.customerName))}<br />${escapeHtml(introText)}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 0 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 14px;">
                      <tr>
                        <td width="50%" style="vertical-align:top;padding-right:7px;">
                          <div style="border:1px solid rgba(196,154,82,0.22);border-radius:22px;background:rgba(196,154,82,0.08);padding:18px 18px;">
                            <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(copy.trackingNumberLabel)}</div>
                            <div style="color:#f7f1e3;font-size:22px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(input.trackingNumber)}</div>
                          </div>
                        </td>
                        <td width="50%" style="vertical-align:top;padding-left:7px;">
                          <div style="border:1px solid rgba(255,255,255,0.08);border-radius:22px;background:rgba(255,255,255,0.03);padding:18px 18px;">
                            <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(copy.totalAmountLabel)}</div>
                            <div style="color:#f7f1e3;font-size:22px;font-weight:700;">${escapeHtml(totalAmount)}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 0 28px;">
                    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:20px 20px;">
                      <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(copy.progressTitle)}</div>
                      <p style="margin:0 0 14px 0;color:#c7b99e;font-size:14px;line-height:1.7;">${escapeHtml(copy.progressDescription)}</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        ${buildProgressRows(copy, input.publicStage ?? null)}
                      </table>
                    </div>
                  </td>
                </tr>
                ${
                  customerNote
                    ? `
                <tr>
                  <td style="padding:20px 28px 0 28px;">
                    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:20px 20px;">
                      <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">${escapeHtml(copy.customerNoteLabel)}</div>
                      <p style="margin:0;color:#f7f1e3;font-size:14px;line-height:1.7;">${renderCustomerNoteHtml(customerNote)}</p>
                    </div>
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:20px 28px 0 28px;">
                    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:20px 20px;">
                      <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:14px;">${escapeHtml(copy.productDetailsTitle)}</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <thead>
                          <tr>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.productName)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.quantity)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.karat)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.weight)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.requestedName)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.designLanguage)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.customerNote)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.unitPrice)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.totalPrice)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${buildDetailRows(copy, input.items, input.currency)}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 0 28px;">
                    <div style="border:1px solid rgba(196,154,82,0.22);border-radius:24px;background:rgba(196,154,82,0.08);padding:20px 20px;">
                      <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">${escapeHtml(copy.menuLabel)}</div>
                      <p style="margin:0 0 10px 0;color:#f7f1e3;font-size:14px;line-height:1.7;">${escapeHtml(copy.trackingHelp)}</p>
                      <a href="${escapeHtml(homepageUrl)}" style="color:#f7f1e3;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(copy.homepageLabel)}: ${escapeHtml(homepageUrl)}</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 30px 28px;">
                    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;">
                      <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">${escapeHtml(copy.footerLabel)}</div>
                      <p style="margin:0;color:#c7b99e;font-size:13px;line-height:1.8;">
                        ${escapeHtml(companyInfo.name)}<br />
                        ${escapeHtml(companyInfo.address)}<br />
                        ${escapeHtml(companyInfo.phoneDisplay)}<br />
                        ${escapeHtml(companyInfo.emailDisplay)}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function buildCustomerOrderEmail(input: CustomerOrderEmailInput) {
  const subject =
    input.type === "order_confirmation"
      ? germanCopy.confirmationSubject
      : input.publicStage
        ? germanCopy.stageSubjects[input.publicStage]
        : germanCopy.confirmationSubject;

  return {
    html: buildHtmlBody(input, germanCopy),
    subject,
    text: buildTextBody(input, germanCopy),
  };
}

export function getEmailTemplateTypeFromMetadata(
  metadata: Json | null | undefined
): CustomerEmailTemplateType | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const templateType = (metadata as Record<string, Json | undefined>).templateType;

  return templateType === "order_confirmation" || templateType === "public_stage_update"
    ? templateType
    : null;
}

export function getEmailPublicStageFromMetadata(
  metadata: Json | null | undefined
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return normalizePublicTrackingStage(
    typeof (metadata as Record<string, Json | undefined>).publicStage === "string"
      ? ((metadata as Record<string, Json | undefined>).publicStage as string)
      : null
  );
}
