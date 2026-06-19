"use client";

import { useMemo, useState, useTransition } from "react";
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
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";
import type {
  AdminOptionGroupRecord,
  AdminProductRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";

type NewOrderClientProps = {
  groups: AdminOptionGroupRecord[];
  locale: AppLocale;
  preselectedProductId?: string;
  products: AdminProductRecord[];
};

type FieldErrors = Record<string, string>;
type OptionFieldValue = boolean | number | string | string[];

type OrderFormOptionField = {
  groupKey: string;
  groupName: string;
  helpText: string;
  id: string;
  isRequired: boolean;
  key: string;
  label: string;
  placeholder: string;
  type: AdminProductRecord["optionSettings"][number]["type"];
  values: Array<{ label: string; value: string }>;
};

function getInitialProductId(
  products: AdminProductRecord[],
  preselectedProductId?: string
) {
  if (preselectedProductId && products.some((product) => product.id === preselectedProductId)) {
    return preselectedProductId;
  }

  return products[0]?.id ?? "";
}

function resolveLocalizedText(fields: LocalizedText, locale: AppLocale) {
  const preferred = fields[locale].trim();

  if (preferred.length > 0) {
    return preferred;
  }

  return fields.de.trim();
}

function getNewOrderUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      customerSectionDescription: "بيانات العميل الأساسية لإنشاء الطلب.",
      customerSectionTitle: "العميل",
      customerNote: "ملاحظة العميل",
      designLanguage: "لغة التصميم",
      designLanguageArabic: "عربي",
      designLanguageEnglish: "إنجليزي",
      helper:
        "اختر لغة التصميم المطلوبة، ويمكن كتابة الاسم بأي أحرف أو رموز.",
      internalNote: "ملاحظة داخلية",
      jewelrySectionDescription: "تفاصيل الذهب الأساسية لهذا الطلب.",
      jewelrySectionTitle: "مواصفات المجوهرات",
      karat: "العيار",
      optionDetailsDescription:
        "هذه الحقول تأتي مباشرة من مجموعة الخيارات المرتبطة بالمنتج المختار.",
      optionDetailsTitle: "تفاصيل الطلب",
      optionRequired: "يرجى تعبئة هذا الحقل.",
      requestedName: "الاسم المطلوب",
      summaryCustomization: "تخصيص الاسم",
      summaryLanguage: "لغة التصميم",
      summaryNo: "لا",
      summaryWeight: "الوزن",
      summaryYes: "نعم",
      totalAmount: "المبلغ الإجمالي",
      trackingSectionDescription: "تفعيل إشعارات البريد الإلكتروني عند الحاجة.",
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
      optionDetailsDescription:
        "Diese Felder stammen direkt aus der dem Produkt zugewiesenen Optionsgruppe.",
      optionDetailsTitle: "Auftragsdetails",
      optionRequired: "Bitte fuellen Sie dieses Pflichtfeld aus.",
      requestedName: "Gewuenschter Name",
      summaryCustomization: "Namenspersonalisierung",
      summaryLanguage: "Designsprache",
      summaryNo: "Nein",
      summaryWeight: "Gewicht",
      summaryYes: "Ja",
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
    optionDetailsDescription:
      "These fields come directly from the option group assigned to the selected product.",
    optionDetailsTitle: "Order details",
    optionRequired: "Please complete this required field.",
    requestedName: "Requested name",
    summaryCustomization: "Name personalization",
    summaryLanguage: "Design language",
    summaryNo: "No",
    summaryWeight: "Weight",
    summaryYes: "Yes",
    totalAmount: "Total amount",
    trackingSectionDescription: "Enable customer emails when needed.",
    trackingSectionTitle: "Tracking & notifications",
    weight: "Weight in grams",
  };
}

function isMissingRequiredValue(
  type: OrderFormOptionField["type"],
  value: OptionFieldValue | undefined
) {
  if (type === "boolean") {
    return value !== true;
  }

  if (type === "multi_select") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (type === "number") {
    if (typeof value === "number") {
      return !Number.isFinite(value);
    }

    return typeof value !== "string" || value.trim().length === 0;
  }

  return typeof value !== "string" || value.trim().length === 0;
}

function normalizeFieldValue(
  type: OrderFormOptionField["type"],
  value: OptionFieldValue | undefined
) {
  if (type === "boolean") {
    return value === true;
  }

  if (type === "multi_select") {
    return Array.isArray(value) ? value : [];
  }

  if (type === "number") {
    const parsed =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return typeof value === "string" ? value.trim() : value ?? null;
}

function formatOptionValue(
  locale: AppLocale,
  type: OrderFormOptionField["type"],
  value: OptionFieldValue | undefined
) {
  if (type === "boolean") {
    if (value !== true && value !== false) {
      return "";
    }

    if (locale === "ar") {
      return value ? "نعم" : "لا";
    }

    if (locale === "de") {
      return value ? "Ja" : "Nein";
    }

    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" ? value.trim() : "";
}

export function NewOrderClient({
  groups,
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
  const [optionValues, setOptionValues] = useState<Record<string, OptionFieldValue>>({});
  const requiredLabel = getRequiredFieldBadge(locale);
  const productRequiredMessage =
    locale === "de"
      ? "Bitte waehlen Sie zuerst ein Produkt aus."
      : locale === "ar"
        ? "يرجى اختيار منتج أولاً."
        : "Please choose a product first.";

  const selectedProduct =
    products.find((product) => product.id === productId) ?? products[0];
  const supportsNameCustomization =
    selectedProduct?.effectiveSupportsNameCustomization ?? false;
  const selectedGroup =
    selectedProduct?.optionGroupId
      ? groups.find((group) => group.id === selectedProduct.optionGroupId) ?? null
      : null;
  const productOptions = useMemo<OrderFormOptionField[]>(() => {
    if (!selectedProduct) {
      return [];
    }

    if (selectedGroup) {
      return selectedGroup.options.map((field) => ({
        groupKey: field.groupKey,
        groupName: selectedGroup.displayName,
        helpText: resolveLocalizedText(field.helpText, locale),
        id: field.id,
        isRequired: field.isRequired,
        key: field.key,
        label: field.displayLabel,
        placeholder: resolveLocalizedText(field.placeholder, locale),
        type: field.type,
        values: field.values,
      }));
    }

    return selectedProduct.optionSettings.map((field) => ({
      groupKey: field.groupKey,
      groupName: field.groupName,
      helpText: "",
      id: field.id,
      isRequired: field.isRequired,
      key: field.key,
      label: field.displayLabel,
      placeholder: "",
      type: field.type,
      values: field.values,
    }));
  }, [locale, selectedGroup, selectedProduct]);
  const optionSummaryRows = useMemo(
    () =>
      productOptions
        .map((field) => {
          const value = formatOptionValue(locale, field.type, optionValues[field.id]);

          if (!value) {
            return null;
          }

          return {
            label: field.label,
            value,
          };
        })
        .filter((entry): entry is { label: string; value: string } => entry !== null),
    [locale, optionValues, productOptions]
  );

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
      const nextErrors = { productId: productRequiredMessage };
      setFieldErrors(nextErrors);
      focusFirstInvalidField(nextErrors);
      return;
    }

    const nextErrors: FieldErrors = {};

    productOptions.forEach((field) => {
      if (field.isRequired && isMissingRequiredValue(field.type, optionValues[field.id])) {
        nextErrors[field.id] = uiCopy.optionRequired;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFeedback(null);
      setFieldErrors(nextErrors);
      focusFirstInvalidField(nextErrors);
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
            text:
              supportsNameCustomization && requestedName.trim().length > 0
                ? requestedName
                : null,
          },
          weightGrams: parsedWeightGrams,
        },
        quantity,
        referenceImages: [],
        selectedOptions: productOptions.map((field) => ({
          groupKey: field.groupKey,
          key: field.key,
          label: field.label,
          optionId: field.id,
          value: normalizeFieldValue(field.type, optionValues[field.id]),
        })),
        stones: {},
        totalAmount:
          parsedTotalAmount !== null && Number.isFinite(parsedTotalAmount)
            ? parsedTotalAmount
            : null,
      });

      setFeedback(result.message);
      setFieldErrors(result.fieldErrors ?? {});

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      if (result.orderId) {
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
                id="productId"
                name="productId"
                label={t("newOrder.fields.product")}
                required
                requiredLabel={requiredLabel}
                value={productId}
                errorText={fieldErrors.productId}
                onChange={(event) => {
                  const nextProductId = event.target.value;
                  setOptionValues({});
                  setFieldErrors({});
                  setFeedback(null);
                  setProductId(nextProductId);
                }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.displayName}
                  </option>
                ))}
              </AdminSelect>
              <AdminInput
                id="quantity"
                name="quantity"
                label={t("newOrder.fields.quantity")}
                type="number"
                required
                requiredLabel={requiredLabel}
                value={String(quantity)}
                errorText={fieldErrors.quantity}
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
                id="customerName"
                name="customerName"
                label={t("newOrder.fields.customerName")}
                required
                requiredLabel={requiredLabel}
                value={customerName}
                errorText={fieldErrors.customerName}
                onChange={(event) => {
                  clearFieldError("customerName");
                  setCustomerName(event.target.value);
                }}
              />
              <AdminInput
                id="customerEmail"
                name="customerEmail"
                label={t("newOrder.fields.customerEmail")}
                type="email"
                required
                requiredLabel={requiredLabel}
                value={customerEmail}
                errorText={fieldErrors.customerEmail}
                onChange={(event) => {
                  clearFieldError("customerEmail");
                  setCustomerEmail(event.target.value);
                }}
              />
              <AdminInput
                id="customerPhone"
                name="customerPhone"
                label={t("newOrder.fields.customerPhone")}
                type="tel"
                value={customerPhone}
                dir="ltr"
                inputMode="tel"
                errorText={fieldErrors.customerPhone}
                onChange={(event) => {
                  clearFieldError("customerPhone");
                  setCustomerPhone(event.target.value);
                }}
              />
              <AdminInput
                id="customerReference"
                name="customerReference"
                label={t("newOrder.fields.customerReference")}
                value={customerReference}
                onChange={(event) => {
                  clearFieldError("customerReference");
                  setCustomerReference(event.target.value);
                }}
              />
            </div>
          </AdminCard>

          <AdminCard
            title={uiCopy.jewelrySectionTitle}
            description={uiCopy.jewelrySectionDescription}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminSelect
                id="productSpecifications.karat"
                name="productSpecifications.karat"
                label={uiCopy.karat}
                required
                requiredLabel={requiredLabel}
                value={karat}
                errorText={fieldErrors["productSpecifications.karat"]}
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
                id="productSpecifications.weightGrams"
                name="productSpecifications.weightGrams"
                label={uiCopy.weight}
                type="number"
                min="0"
                step="0.01"
                required
                requiredLabel={requiredLabel}
                value={weightGrams}
                errorText={fieldErrors["productSpecifications.weightGrams"]}
                onChange={(event) => {
                  clearFieldError("productSpecifications.weightGrams");
                  setWeightGrams(event.target.value);
                }}
              />
              {supportsNameCustomization ? (
                <>
                  <AdminSelect
                    id="productSpecifications.nameCustomization.language"
                    name="productSpecifications.nameCustomization.language"
                    label={uiCopy.designLanguage}
                    required
                    requiredLabel={requiredLabel}
                    value={nameLanguage}
                    errorText={
                      fieldErrors["productSpecifications.nameCustomization.language"]
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
                    id="productSpecifications.nameCustomization.text"
                    name="productSpecifications.nameCustomization.text"
                    label={uiCopy.requestedName}
                    required
                    requiredLabel={requiredLabel}
                    value={requestedName}
                    errorText={fieldErrors["productSpecifications.nameCustomization.text"]}
                    helperText={
                      !fieldErrors["productSpecifications.nameCustomization.text"]
                        ? uiCopy.helper
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
                id="totalAmount"
                name="totalAmount"
                label={uiCopy.totalAmount}
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(event) => {
                  clearFieldError("totalAmount");
                  setTotalAmount(event.target.value);
                }}
              />
              <AdminSelect
                id="currency"
                name="currency"
                label={t("newOrder.fields.currency")}
                value={currency}
                onChange={(event) => {
                  clearFieldError("currency");
                  setCurrency(event.target.value);
                }}
              >
                {["EUR", "USD", "TRY"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </AdminCard>

          {productOptions.length > 0 ? (
            <AdminCard
              title={selectedGroup?.displayName || selectedProduct?.optionGroupName || uiCopy.optionDetailsTitle}
              description={uiCopy.optionDetailsDescription}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {productOptions.map((field) => {
                  const errorText = fieldErrors[field.id];
                  const helperText = field.helpText || undefined;
                  const currentValue = optionValues[field.id];

                  if (field.type === "textarea") {
                    return (
                      <AdminTextarea
                        key={field.id}
                        id={field.id}
                        name={field.id}
                        label={field.label}
                        required={field.isRequired}
                        requiredLabel={requiredLabel}
                        value={typeof currentValue === "string" ? currentValue : ""}
                        placeholder={field.placeholder}
                        helperText={!errorText ? helperText : undefined}
                        errorText={errorText}
                        wrapperClassName="xl:col-span-2"
                        onChange={(event) => {
                          clearFieldError(field.id);
                          setOptionValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }));
                        }}
                      />
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <AdminSelect
                        key={field.id}
                        id={field.id}
                        name={field.id}
                        label={field.label}
                        required={field.isRequired}
                        requiredLabel={requiredLabel}
                        value={typeof currentValue === "string" ? currentValue : ""}
                        helperText={!errorText ? helperText : undefined}
                        errorText={errorText}
                        onChange={(event) => {
                          clearFieldError(field.id);
                          setOptionValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }));
                        }}
                      >
                        <option value="">{field.placeholder || field.label}</option>
                        {field.values.map((value) => (
                          <option key={`${field.id}-${value.value}`} value={value.value}>
                            {value.label}
                          </option>
                        ))}
                      </AdminSelect>
                    );
                  }

                  if (field.type === "multi_select") {
                    const selectedValues = Array.isArray(currentValue) ? currentValue : [];

                    return (
                      <div key={field.id} className="space-y-2 xl:col-span-2">
                        <div className="admin-label">
                          {field.label}
                          {field.isRequired ? <span className="admin-required">*</span> : null}
                          {field.isRequired ? (
                            <span className="ms-2 text-[0.72rem] font-normal text-muted">
                              {requiredLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-4">
                          <div className="flex flex-wrap gap-3 text-sm text-foreground">
                            {field.values.map((value) => (
                              <label
                                key={`${field.id}-${value.value}`}
                                className="rtl-inline-row flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedValues.includes(value.value)}
                                  onChange={(event) => {
                                    clearFieldError(field.id);
                                    setOptionValues((current) => {
                                      const existing = Array.isArray(current[field.id])
                                        ? (current[field.id] as string[])
                                        : [];

                                      return {
                                        ...current,
                                        [field.id]: event.target.checked
                                          ? [...existing, value.value]
                                          : existing.filter((item) => item !== value.value),
                                      };
                                    });
                                  }}
                                  className="h-4 w-4 accent-[#c49a52]"
                                />
                                {value.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        {errorText ? (
                          <p className="text-xs text-rose-300">{errorText}</p>
                        ) : helperText ? (
                          <p className="admin-helper">{helperText}</p>
                        ) : null}
                      </div>
                    );
                  }

                  if (field.type === "boolean") {
                    return (
                      <div key={field.id} className="space-y-2 xl:col-span-2">
                        <div className="admin-label">
                          {field.label}
                          {field.isRequired ? <span className="admin-required">*</span> : null}
                          {field.isRequired ? (
                            <span className="ms-2 text-[0.72rem] font-normal text-muted">
                              {requiredLabel}
                            </span>
                          ) : null}
                        </div>
                        <label className="rtl-inline-row flex items-center gap-2 rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-foreground">
                          <input
                            id={field.id}
                            type="checkbox"
                            checked={currentValue === true}
                            onChange={(event) => {
                              clearFieldError(field.id);
                              setOptionValues((current) => ({
                                ...current,
                                [field.id]: event.target.checked,
                              }));
                            }}
                            className="h-4 w-4 accent-[#c49a52]"
                          />
                          {field.helpText || field.label}
                        </label>
                        {errorText ? (
                          <p className="text-xs text-rose-300">{errorText}</p>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <AdminInput
                      key={field.id}
                      id={field.id}
                      name={field.id}
                      label={field.label}
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : "text"
                      }
                      required={field.isRequired}
                      requiredLabel={requiredLabel}
                      value={
                        typeof currentValue === "number"
                          ? String(currentValue)
                          : typeof currentValue === "string"
                            ? currentValue
                            : ""
                      }
                      placeholder={field.placeholder}
                      helperText={!errorText ? helperText : undefined}
                      errorText={errorText}
                      onChange={(event) => {
                        clearFieldError(field.id);
                        setOptionValues((current) => ({
                          ...current,
                          [field.id]: event.target.value,
                        }));
                      }}
                    />
                  );
                })}
              </div>
            </AdminCard>
          ) : null}

          <AdminCard
            title={t("newOrder.sections.notes")}
            description={t("newOrder.reviewDescription")}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminTextarea
                id="notes.customerNotes"
                name="notes.customerNotes"
                label={uiCopy.customerNote}
                value={customerNotes}
                errorText={fieldErrors["notes.customerNotes"]}
                onChange={(event) => {
                  clearFieldError("notes.customerNotes");
                  setCustomerNotes(event.target.value);
                }}
              />
              <AdminTextarea
                id="notes.adminNotes"
                name="notes.adminNotes"
                label={uiCopy.internalNote}
                value={adminNotes}
                errorText={fieldErrors["notes.adminNotes"]}
                onChange={(event) => {
                  clearFieldError("notes.adminNotes");
                  setAdminNotes(event.target.value);
                }}
              />
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard
            title={t("newOrder.summaryTitle")}
            description={t("newOrder.summaryDescription")}
          >
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
                      {weightGrams.trim().length > 0
                        ? `${weightGrams} g`
                        : t("common.notProvided")}
                    </span>
                  </div>
                  {supportsNameCustomization ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-muted">{uiCopy.summaryCustomization}</span>
                        <span className="text-foreground">
                          {requestedName.trim().length > 0
                            ? requestedName
                            : t("common.notProvided")}
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
                  {optionSummaryRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-4"
                    >
                      <span className="text-muted">{row.label}</span>
                      <span className="text-end text-foreground">{row.value}</span>
                    </div>
                  ))}
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
