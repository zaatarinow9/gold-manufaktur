"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import { createOrderAction } from "@/app/[locale]/admin/orders/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import type { AdminProductRecord } from "@/lib/db/adminCatalog";

type NewOrderClientProps = {
  locale: AppLocale;
  preselectedProductId?: string;
  products: AdminProductRecord[];
};

type FieldErrors = Record<string, string>;

function getInitialProductId(
  products: AdminProductRecord[],
  preselectedProductId?: string
) {
  if (preselectedProductId && products.some((product) => product.id === preselectedProductId)) {
    return preselectedProductId;
  }

  return products[0]?.id ?? "";
}

function getNewOrderUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      customerSectionDescription: "بيانات العميل الأساسية لإنشاء الطلب.",
      customerSectionTitle: "العميل",
      customerNote: "ملاحظات العميل",
      designLanguage: "لغة التصميم",
      designLanguageArabic: "عربي",
      designLanguageEnglish: "إنجليزي",
      helper:
        "اختر لغة التصميم المطلوبة، ويمكنك كتابة الاسم بأي أحرف أو رموز.",
      internalNote: "ملاحظات داخلية",
      jewelrySectionDescription: "تفاصيل الذهب المطلوبة للطلب.",
      jewelrySectionTitle: "مواصفات المجوهرات",
      karat: "العيار",
      requestedName: "الاسم المطلوب",
      summaryCustomization: "تخصيص الاسم",
      summaryLanguage: "لغة التصميم",
      summaryWeight: "الوزن",
      totalAmount: "المبلغ الإجمالي",
      trackingSectionDescription: "تفعيل إشعارات البريد عند الحاجة.",
      trackingSectionTitle: "التتبع والإشعارات",
      weight: "الوزن بالغرام",
    };
  }

  if (locale === "de") {
    return {
      customerSectionDescription: "Grundlegende Kundendaten fuer den Auftrag.",
      customerSectionTitle: "Kunde",
      customerNote: "Kundennotiz",
      designLanguage: "Designsprache",
      designLanguageArabic: "Arabisch",
      designLanguageEnglish: "Englisch",
      helper:
        "Waehlen Sie die gewuenschte Designsprache. Der Name kann in beliebigen Zeichen eingegeben werden.",
      internalNote: "Interne Notiz",
      jewelrySectionDescription: "Die relevanten Schmuckdaten fuer diesen Auftrag.",
      jewelrySectionTitle: "Schmuckspezifikationen",
      karat: "Legierung",
      requestedName: "Gewuenschter Name",
      summaryCustomization: "Namenspersonalisierung",
      summaryLanguage: "Designsprache",
      summaryWeight: "Gewicht",
      totalAmount: "Gesamtbetrag",
      trackingSectionDescription: "Kunden-E-Mails bei Bedarf aktivieren.",
      trackingSectionTitle: "Tracking & Benachrichtigung",
      weight: "Gewicht in Gramm",
    };
  }

  return {
    customerSectionDescription: "Basic customer information for the order.",
    customerSectionTitle: "Customer",
    customerNote: "Customer note",
    designLanguage: "Design language",
    designLanguageArabic: "Arabic",
    designLanguageEnglish: "English",
    helper:
      "Choose the intended design language. The requested name can use any characters or symbols.",
    internalNote: "Internal note",
    jewelrySectionDescription: "The relevant jewelry specifications for this order.",
    jewelrySectionTitle: "Jewelry specifications",
    karat: "Karat",
    requestedName: "Requested name",
    summaryCustomization: "Name personalization",
    summaryLanguage: "Design language",
    summaryWeight: "Weight",
    totalAmount: "Total amount",
    trackingSectionDescription: "Enable customer emails when needed.",
    trackingSectionTitle: "Tracking & notifications",
    weight: "Weight in grams",
  };
}

export function NewOrderClient({
  locale,
  preselectedProductId,
  products,
}: NewOrderClientProps) {
  const t = useTranslations("Admin");
  const uiCopy = getNewOrderUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [productId, setProductId] = useState(() =>
    getInitialProductId(products, preselectedProductId)
  );
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [karat, setKarat] = useState<"14" | "18" | "21">("21");
  const [weightGrams, setWeightGrams] = useState("");
  const [nameLanguage, setNameLanguage] = useState<"ar" | "en">("ar");
  const [requestedName, setRequestedName] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(false);

  const selectedProduct =
    products.find((product) => product.id === productId) ?? products[0];
  const supportsNameCustomization =
    selectedProduct?.effectiveSupportsNameCustomization ?? false;

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[field];
      return nextState;
    });
  };

  const submitForm = () => {
    if (!selectedProduct) {
      setFieldErrors({ productId: t("newOrder.fields.product") });
      return;
    }

    setFeedback(null);
    setFieldErrors({});

    const parsedTotalAmount = totalAmount.trim().length > 0 ? Number(totalAmount) : null;
    const parsedWeightGrams = Number(weightGrams);

    startTransition(async () => {
      const result = await createOrderAction(locale, {
        attachments: [],
        currency,
        customerEmail,
        customerLanguage: locale,
        customerName,
        customerPhone,
        customerReference,
        dueDate: "",
        emailUpdatesEnabled,
        goldDetails: {},
        measurements: {},
        notes: {
          adminNotes,
          customerNotes,
          deliveryNotes: "",
          packagingNotes: "",
          qualityRequirements: "",
          specialInstructions: "",
          workshopNotes: "",
        },
        personalization: {},
        priority: "normal",
        productCategoryName: selectedProduct.categoryName,
        productCategorySlug: selectedProduct.categorySlug || "all",
        productId: selectedProduct.id,
        productImage: selectedProduct.imageUrl,
        productName: selectedProduct.displayName,
        productSku: selectedProduct.sku,
        productSlug: selectedProduct.slug,
        productSpecifications: {
          karat,
          nameCustomization: {
            enabled: supportsNameCustomization,
            language: supportsNameCustomization ? nameLanguage : null,
            text: supportsNameCustomization && requestedName.trim().length > 0
              ? requestedName
              : null,
          },
          weightGrams: parsedWeightGrams,
        },
        quantity,
        referenceImages: [],
        selectedOptions: [],
        stones: {},
        totalAmount:
          parsedTotalAmount !== null && Number.isFinite(parsedTotalAmount)
            ? parsedTotalAmount
            : null,
      });

      setFeedback(result.message);
      setFieldErrors(result.fieldErrors ?? {});

      if (result.ok && result.orderId) {
        router.push(`/${locale}/admin/orders/${result.orderId}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("newOrder.eyebrow")}
        title={t("newOrder.title")}
        description={t("newOrder.description")}
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <AdminCard
            title={t("newOrder.sections.product")}
            description={t("newOrder.productDescription")}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminSelect
                label={t("newOrder.fields.product")}
                value={productId}
                helperText={fieldErrors.productId}
                className={fieldErrors.productId ? "border-rose-400/30" : undefined}
                onChange={(event) => {
                  clearFieldError("productId");
                  setProductId(event.target.value);
                }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.displayName}
                  </option>
                ))}
              </AdminSelect>
              <AdminInput
                label={t("newOrder.fields.quantity")}
                type="number"
                value={String(quantity)}
                helperText={fieldErrors.quantity}
                className={fieldErrors.quantity ? "border-rose-400/30" : undefined}
                onChange={(event) => {
                  clearFieldError("quantity");
                  setQuantity(Number(event.target.value || 1));
                }}
              />
            </div>
          </AdminCard>

          <AdminCard
            title={uiCopy.customerSectionTitle}
            description={uiCopy.customerSectionDescription}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminInput
                label={t("newOrder.fields.customerName")}
                value={customerName}
                helperText={fieldErrors.customerName}
                className={fieldErrors.customerName ? "border-rose-400/30" : undefined}
                onChange={(event) => {
                  clearFieldError("customerName");
                  setCustomerName(event.target.value);
                }}
              />
              <AdminInput
                label={t("newOrder.fields.customerEmail")}
                value={customerEmail}
                helperText={fieldErrors.customerEmail}
                className={fieldErrors.customerEmail ? "border-rose-400/30" : undefined}
                onChange={(event) => {
                  clearFieldError("customerEmail");
                  setCustomerEmail(event.target.value);
                }}
              />
              <AdminInput
                label={t("newOrder.fields.customerPhone")}
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
              <AdminInput
                label={t("newOrder.fields.customerReference")}
                value={customerReference}
                onChange={(event) => setCustomerReference(event.target.value)}
              />
            </div>
          </AdminCard>

          <AdminCard
            title={uiCopy.jewelrySectionTitle}
            description={uiCopy.jewelrySectionDescription}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminSelect
                label={uiCopy.karat}
                value={karat}
                helperText={fieldErrors["productSpecifications.karat"]}
                className={
                  fieldErrors["productSpecifications.karat"]
                    ? "border-rose-400/30"
                    : undefined
                }
                onChange={(event) => {
                  clearFieldError("productSpecifications.karat");
                  setKarat(event.target.value as "14" | "18" | "21");
                }}
              >
                {["14", "18", "21"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </AdminSelect>
              <AdminInput
                label={uiCopy.weight}
                type="number"
                min="0"
                step="0.01"
                value={weightGrams}
                helperText={fieldErrors["productSpecifications.weightGrams"]}
                className={
                  fieldErrors["productSpecifications.weightGrams"]
                    ? "border-rose-400/30"
                    : undefined
                }
                onChange={(event) => {
                  clearFieldError("productSpecifications.weightGrams");
                  setWeightGrams(event.target.value);
                }}
              />
              {supportsNameCustomization ? (
                <>
                  <AdminSelect
                    label={uiCopy.designLanguage}
                    value={nameLanguage}
                    helperText={
                      fieldErrors["productSpecifications.nameCustomization.language"]
                    }
                    className={
                      fieldErrors["productSpecifications.nameCustomization.language"]
                        ? "border-rose-400/30"
                        : undefined
                    }
                    onChange={(event) => {
                      clearFieldError("productSpecifications.nameCustomization.language");
                      setNameLanguage(event.target.value as "ar" | "en");
                    }}
                  >
                    <option value="ar">{uiCopy.designLanguageArabic}</option>
                    <option value="en">{uiCopy.designLanguageEnglish}</option>
                  </AdminSelect>
                  <AdminInput
                    label={uiCopy.requestedName}
                    value={requestedName}
                    helperText={
                      fieldErrors["productSpecifications.nameCustomization.text"] ||
                      uiCopy.helper
                    }
                    className={
                      fieldErrors["productSpecifications.nameCustomization.text"]
                        ? "border-rose-400/30"
                        : undefined
                    }
                    onChange={(event) => {
                      clearFieldError("productSpecifications.nameCustomization.text");
                      setRequestedName(event.target.value);
                    }}
                  />
                </>
              ) : null}
              <AdminInput
                label={uiCopy.totalAmount}
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
              />
              <AdminSelect
                label={t("newOrder.fields.currency")}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {["EUR", "USD", "TRY"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </AdminCard>

          <AdminCard title={t("newOrder.sections.notes")} description={t("newOrder.reviewDescription")}>
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminTextarea
                label={uiCopy.customerNote}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
              />
              <AdminTextarea
                label={uiCopy.internalNote}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
              />
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title={t("newOrder.summaryTitle")} description={t("newOrder.summaryDescription")}>
            {selectedProduct ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1rem] border border-white/10">
                  <Image
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.displayName}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 24vw, 100vw"
                  />
                </div>
                <div>
                  <p className="text-sm text-gold-soft">{selectedProduct.categoryName}</p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {selectedProduct.displayName}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{selectedProduct.sku}</p>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{t("newOrder.fields.quantity")}</span>
                    <span className="text-foreground">{quantity}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{uiCopy.karat}</span>
                    <span className="text-foreground">{karat}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{uiCopy.summaryWeight}</span>
                    <span className="text-foreground">
                      {weightGrams.trim().length > 0 ? `${weightGrams} g` : t("common.notProvided")}
                    </span>
                  </div>
                  {supportsNameCustomization ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-muted">{uiCopy.summaryCustomization}</span>
                        <span className="text-foreground">
                          {requestedName.trim().length > 0 ? requestedName : t("common.notProvided")}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-muted">{uiCopy.summaryLanguage}</span>
                        <span className="text-foreground">
                          {nameLanguage === "ar"
                            ? uiCopy.designLanguageArabic
                            : uiCopy.designLanguageEnglish}
                        </span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{uiCopy.totalAmount}</span>
                    <span className="text-foreground">
                      {totalAmount.trim().length > 0
                        ? `${totalAmount} ${currency}`
                        : t("common.notProvided")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("orders.empty")}</p>
            )}
          </AdminCard>

          <AdminCard
            title={uiCopy.trackingSectionTitle}
            description={uiCopy.trackingSectionDescription}
          >
            <div className="space-y-4">
              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={emailUpdatesEnabled}
                  onChange={(event) => setEmailUpdatesEnabled(event.target.checked)}
                  className="h-4 w-4 accent-[#c49a52]"
                />
                {t("newOrder.fields.emailUpdatesEnabled")}
              </label>
              <AdminButton
                block
                variant="primary"
                onClick={submitForm}
                disabled={isPending || !selectedProduct}
              >
                {t("buttons.createOrder")}
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      </section>
    </div>
  );
}
