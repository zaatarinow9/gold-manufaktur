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
  engraving: string | null;
  karat: string | null;
  name: string;
  options: string[];
  quantity: number;
  size: string | null;
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
  contactLabel: string;
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
    engraving: string;
    karat: string;
    options: string;
    productName: string;
    quantity: string;
    size: string;
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

function createCopy(locale: AppLocale): CustomerEmailCopy {
  switch (locale) {
    case "ar":
      return {
        brandLabel: "GoldHelwah GmbH",
        confirmationLead:
          "شكرًا لاختيار GoldHelwah. لقد استلمنا طلبك وسنوافيك بالتحديثات الرئيسية فور تقدم العمل عليه.",
        confirmationNextStep:
          "تم استلام طلبك وسيتم تحديث الحالة العامة قريبًا عند انتقاله إلى الورشة.",
        confirmationSubject: "تم استلام طلبك من GoldHelwah",
        confirmationTitle: "لقد استلمنا طلبك",
        contactLabel: "التواصل",
        customerNoteLabel: "ملاحظة العميل",
        footerLabel: "بيانات التواصل",
        homepageLabel: "الموقع الإلكتروني",
        menuLabel: "تتبع الطلب",
        notProvided: "غير محدد",
        progressDescription:
          "التحديثات العامة المتاحة للعميل تظهر فقط عند دخول الطلب الورشة أو الشحن أو الجاهزية للاستلام.",
        progressTitle: "مسار الحالة العامة",
        productDetailsTitle: "تفاصيل المنتج",
        stages: {
          order_in_workshop: "الطلب في الورشة",
          shipping: "جاري شحن الطلب",
          ready_for_pickup: "جاهز للاستلام",
        },
        stageDescriptions: {
          order_in_workshop:
            "طلبك أصبح الآن داخل الورشة ويتم العمل عليه.",
          shipping: "طلبك قيد الشحن الآن.",
          ready_for_pickup: "طلبك جاهز للاستلام.",
        },
        stageLeadPrefix: "الحالة العامة الحالية",
        stageSubjects: {
          order_in_workshop: "طلبك الآن في الورشة - GoldHelwah",
          shipping: "طلبك قيد الشحن - GoldHelwah",
          ready_for_pickup: "طلبك جاهز للاستلام - GoldHelwah",
        },
        tableLabels: {
          engraving: "النقش/الاسم",
          karat: "العيار",
          options: "الخيارات",
          productName: "اسم المنتج",
          quantity: "الكمية",
          size: "المقاس",
          totalPrice: "السعر الإجمالي",
          unitPrice: "سعر القطعة",
          weight: "الوزن",
        },
        textGreeting: (customerName) =>
          customerName ? `مرحبًا ${customerName}،` : "مرحبًا،",
        trackingHelp:
          'يمكنك متابعة حالة طلبك من القائمة عبر تبويب "تتبع الطلب"، ثم إدخال رقم التتبع.',
        trackingNumberLabel: "رقم التتبع",
        totalAmountLabel: "إجمالي المبلغ",
      };
    case "de":
      return {
        brandLabel: "GoldHelwah GmbH",
        confirmationLead:
          "Vielen Dank, dass Sie sich für GoldHelwah entschieden haben. Wir haben Ihren Auftrag erhalten und informieren Sie bei den nächsten öffentlichen Schritten.",
        confirmationNextStep:
          "Ihr Auftrag wurde erhalten. Der öffentliche Status wird aktualisiert, sobald er in die Werkstatt geht.",
        confirmationSubject: "Wir haben Ihren Auftrag erhalten - GoldHelwah",
        confirmationTitle: "Wir haben Ihren Auftrag erhalten",
        contactLabel: "Kontakt",
        customerNoteLabel: "Kundenhinweis",
        footerLabel: "Kontaktinformationen",
        homepageLabel: "Website",
        menuLabel: "Auftrag verfolgen",
        notProvided: "Nicht angegeben",
        progressDescription:
          "Sichtbare Kundenphasen werden nur für Werkstatt, Versand und Abholung veröffentlicht.",
        progressTitle: "Öffentlicher Status",
        productDetailsTitle: "Produktdetails",
        stages: {
          order_in_workshop: "Auftrag in der Werkstatt",
          shipping: "Auftrag wird versendet",
          ready_for_pickup: "Bereit zur Abholung",
        },
        stageDescriptions: {
          order_in_workshop:
            "Ihr Auftrag befindet sich jetzt in unserer Werkstatt.",
          shipping: "Ihr Auftrag wird jetzt versendet.",
          ready_for_pickup: "Ihr Auftrag ist jetzt zur Abholung bereit.",
        },
        stageLeadPrefix: "Aktuelle öffentliche Phase",
        stageSubjects: {
          order_in_workshop: "Ihr Auftrag ist jetzt in der Werkstatt - GoldHelwah",
          shipping: "Ihr Auftrag wird versendet - GoldHelwah",
          ready_for_pickup: "Ihr Auftrag ist abholbereit - GoldHelwah",
        },
        tableLabels: {
          engraving: "Gravur/Name",
          karat: "Karat",
          options: "Optionen",
          productName: "Produkt",
          quantity: "Menge",
          size: "Größe",
          totalPrice: "Gesamtpreis",
          unitPrice: "Stückpreis",
          weight: "Gewicht",
        },
        textGreeting: (customerName) =>
          customerName ? `Hallo ${customerName},` : "Hallo,",
        trackingHelp:
          'Sie können Ihren Auftrag über den Menüpunkt "Auftrag verfolgen" verfolgen und dort Ihre Tracking-Nummer eingeben.',
        trackingNumberLabel: "Tracking-Nummer",
        totalAmountLabel: "Gesamtbetrag",
      };
    case "fr":
      return {
        brandLabel: "GoldHelwah GmbH",
        confirmationLead:
          "Merci d avoir choisi GoldHelwah. Nous avons bien recu votre commande et nous vous informerons lors des prochaines etapes publiques.",
        confirmationNextStep:
          "Votre commande a ete recue et son statut public sera bientot mis a jour lorsqu elle entrera en atelier.",
        confirmationSubject: "Nous avons bien recu votre commande - GoldHelwah",
        confirmationTitle: "Nous avons bien recu votre commande",
        contactLabel: "Contact",
        customerNoteLabel: "Note client",
        footerLabel: "Coordonnees",
        homepageLabel: "Site web",
        menuLabel: "Suivre la commande",
        notProvided: "Non renseigne",
        progressDescription:
          "Les clients ne voient que les etapes publiques atelier, expedition et retrait.",
        progressTitle: "Etape publique",
        productDetailsTitle: "Details du produit",
        stages: {
          order_in_workshop: "Commande en atelier",
          shipping: "Commande en cours d expedition",
          ready_for_pickup: "Prete au retrait",
        },
        stageDescriptions: {
          order_in_workshop:
            "Votre commande se trouve maintenant dans notre atelier.",
          shipping: "Votre commande est en cours d expedition.",
          ready_for_pickup: "Votre commande est prete au retrait.",
        },
        stageLeadPrefix: "Etape publique actuelle",
        stageSubjects: {
          order_in_workshop: "Votre commande est en atelier - GoldHelwah",
          shipping: "Votre commande est en cours d expedition - GoldHelwah",
          ready_for_pickup: "Votre commande est prete au retrait - GoldHelwah",
        },
        tableLabels: {
          engraving: "Gravure/nom",
          karat: "Carat",
          options: "Options",
          productName: "Produit",
          quantity: "Quantite",
          size: "Taille",
          totalPrice: "Prix total",
          unitPrice: "Prix unitaire",
          weight: "Poids",
        },
        textGreeting: (customerName) =>
          customerName ? `Bonjour ${customerName},` : "Bonjour,",
        trackingHelp:
          'Vous pouvez suivre votre commande depuis le menu "Suivre la commande" puis saisir votre numero de suivi.',
        trackingNumberLabel: "Numero de suivi",
        totalAmountLabel: "Montant total",
      };
    case "tr":
      return {
        brandLabel: "GoldHelwah GmbH",
        confirmationLead:
          "GoldHelwah i sectiginiz icin tesekkur ederiz. Siparisinizi aldik ve bir sonraki genel asamalarda sizi bilgilendirecegiz.",
        confirmationNextStep:
          "Siparisiniz alindi. Atolyeye gectiginde genel durum yakinda guncellenecek.",
        confirmationSubject: "Siparisinizi aldik - GoldHelwah",
        confirmationTitle: "Siparisinizi aldik",
        contactLabel: "Iletisim",
        customerNoteLabel: "Musteri notu",
        footerLabel: "Iletisim bilgileri",
        homepageLabel: "Web sitesi",
        menuLabel: "Siparisi Takip Et",
        notProvided: "Belirtilmedi",
        progressDescription:
          "Musteri tarafinda yalnizca atolyede, kargoda ve teslime hazir asamalari gosterilir.",
        progressTitle: "Genel asama",
        productDetailsTitle: "Urun detaylari",
        stages: {
          order_in_workshop: "Siparis atolyede",
          shipping: "Siparis kargoya veriliyor",
          ready_for_pickup: "Teslim almaya hazir",
        },
        stageDescriptions: {
          order_in_workshop:
            "Siparisiniz su anda atolyemizde isleme alinmistir.",
          shipping: "Siparisiniz su anda kargoya veriliyor.",
          ready_for_pickup: "Siparisiniz teslim almaya hazir.",
        },
        stageLeadPrefix: "Guncel genel asama",
        stageSubjects: {
          order_in_workshop: "Siparisiniz atolyede - GoldHelwah",
          shipping: "Siparisiniz kargoya veriliyor - GoldHelwah",
          ready_for_pickup: "Siparisiniz hazir - GoldHelwah",
        },
        tableLabels: {
          engraving: "Isim/gravur",
          karat: "Ayar",
          options: "Secenekler",
          productName: "Urun",
          quantity: "Adet",
          size: "Olcu",
          totalPrice: "Toplam fiyat",
          unitPrice: "Birim fiyat",
          weight: "Agirlik",
        },
        textGreeting: (customerName) =>
          customerName ? `Merhaba ${customerName},` : "Merhaba,",
        trackingHelp:
          'Siparisinizi web sitemizdeki "Siparisi Takip Et" menusu uzerinden takip edebilir ve takip numaranizi girebilirsiniz.',
        trackingNumberLabel: "Takip numarasi",
        totalAmountLabel: "Toplam tutar",
      };
    default:
      return {
        brandLabel: "GoldHelwah GmbH",
        confirmationLead:
          "Thank you for choosing GoldHelwah. We have received your order and will keep you informed as its public progress moves forward.",
        confirmationNextStep:
          "We received your order. The public status will be updated soon once it enters the workshop.",
        confirmationSubject: "We received your order - GoldHelwah",
        confirmationTitle: "We received your order",
        contactLabel: "Contact",
        customerNoteLabel: "Customer note",
        footerLabel: "Contact information",
        homepageLabel: "Website",
        menuLabel: "Track Order",
        notProvided: "Not specified",
        progressDescription:
          "Customers only receive public updates for workshop, shipping, and pickup.",
        progressTitle: "Public progress",
        productDetailsTitle: "Product details",
        stages: {
          order_in_workshop: "Order in workshop",
          shipping: "Order is being shipped",
          ready_for_pickup: "Ready for pickup",
        },
        stageDescriptions: {
          order_in_workshop: "Your order is now in our workshop.",
          shipping: "Your order is now being shipped.",
          ready_for_pickup: "Your order is now ready for pickup.",
        },
        stageLeadPrefix: "Current public stage",
        stageSubjects: {
          order_in_workshop: "Your order is in our workshop - GoldHelwah",
          shipping: "Your order is being shipped - GoldHelwah",
          ready_for_pickup: "Your order is ready for pickup - GoldHelwah",
        },
        tableLabels: {
          engraving: "Engraving / name",
          karat: "Karat",
          options: "Selected options",
          productName: "Product",
          quantity: "Quantity",
          size: "Size",
          totalPrice: "Total price",
          unitPrice: "Unit price",
          weight: "Weight",
        },
        textGreeting: (customerName) =>
          customerName ? `Hello ${customerName},` : "Hello,",
        trackingHelp:
          'You can track your order from the website menu using "Track Order", then enter your tracking number.',
        trackingNumberLabel: "Tracking number",
        totalAmountLabel: "Total amount",
      };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(
  locale: AppLocale,
  amount: number | null | undefined,
  currency: string | null | undefined,
  fallback: string
) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return fallback;
  }

  const normalizedCurrency = (currency || "EUR").trim().toUpperCase() || "EUR";

  try {
    return new Intl.NumberFormat(locale, {
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

function renderOptions(options: string[], fallback: string) {
  return options.length > 0 ? options.join(", ") : fallback;
}

function renderCustomerNoteHtml(note: string) {
  return escapeHtml(note).replace(/\n/g, "<br />");
}

function buildDetailRows(
  copy: CustomerEmailCopy,
  items: CustomerEmailItem[],
  locale: AppLocale,
  currency: string | null | undefined
) {
  return items
    .map((item) => {
      const unitPrice = formatCurrency(locale, item.unitPrice, currency, copy.notProvided);
      const totalPrice = formatCurrency(locale, item.totalPrice, currency, copy.notProvided);

      return `
        <tr>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#f7f1e3;font-size:13px;vertical-align:top;">${escapeHtml(item.name)}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(String(item.quantity))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.karat, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.weight, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.size, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderTextOrFallback(item.engraving, copy.notProvided))}</td>
          <td style="padding:14px 12px;border-top:1px solid rgba(255,255,255,0.08);color:#c7b99e;font-size:13px;vertical-align:top;">${escapeHtml(renderOptions(item.options, copy.notProvided))}</td>
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
  const totalAmount = formatCurrency(
    input.locale,
    input.totalAmount,
    input.currency,
    copy.notProvided
  );
  const customerNote = normalizeText(input.customerNote);
  const itemLines = input.items.flatMap((item, index) => {
    const unitPrice = formatCurrency(
      input.locale,
      item.unitPrice,
      input.currency,
      copy.notProvided
    );
    const totalPrice = formatCurrency(
      input.locale,
      item.totalPrice,
      input.currency,
      copy.notProvided
    );

    return [
      `${index + 1}. ${item.name}`,
      `   ${copy.tableLabels.quantity}: ${item.quantity}`,
      `   ${copy.tableLabels.karat}: ${renderTextOrFallback(item.karat, copy.notProvided)}`,
      `   ${copy.tableLabels.weight}: ${renderTextOrFallback(item.weight, copy.notProvided)}`,
      `   ${copy.tableLabels.size}: ${renderTextOrFallback(item.size, copy.notProvided)}`,
      `   ${copy.tableLabels.engraving}: ${renderTextOrFallback(item.engraving, copy.notProvided)}`,
      `   ${copy.tableLabels.options}: ${renderOptions(item.options, copy.notProvided)}`,
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
  const totalAmount = formatCurrency(
    input.locale,
    input.totalAmount,
    input.currency,
    copy.notProvided
  );
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
    <html lang="${input.locale}">
      <body style="margin:0;padding:0;background:#060606;color:#f7f1e3;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060606;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;border-collapse:separate;border-spacing:0;background:linear-gradient(180deg,#17120d,#090909);border:1px solid rgba(196,154,82,0.24);border-radius:28px;overflow:hidden;">
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
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.size)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.engraving)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.options)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.unitPrice)}</th>
                            <th align="left" style="padding:0 12px 12px 12px;color:#e8c987;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(copy.tableLabels.totalPrice)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${buildDetailRows(copy, input.items, input.locale, input.currency)}
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
  const copy = createCopy(input.locale);
  const subject =
    input.type === "order_confirmation"
      ? copy.confirmationSubject
      : input.publicStage
        ? copy.stageSubjects[input.publicStage]
        : copy.confirmationSubject;

  return {
    html: buildHtmlBody(input, copy),
    subject,
    text: buildTextBody(input, copy),
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
