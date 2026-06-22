"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createOrderAction } from "@/app/[locale]/admin/orders/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import type { AppLocale } from "@/i18n/routing";
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

type CategoryChoice = {
  id: string;
  label: string;
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

function getInitialCategoryId(products: AdminProductRecord[], productId: string) {
  const selectedProduct = products.find((product) => product.id === productId);

  if (selectedProduct?.categoryId) {
    return selectedProduct.categoryId;
  }

  return "all";
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
      allCategories: "كل التصنيفات",
      categoryEmpty: "لا توجد منتجات ضمن هذا التصنيف.",
      customerSectionDescription: "أدخل بيانات العميل ثم اختر إن كانت تحديثات البريد مطلوبة.",
      customerSectionTitle: "بيانات العميل",
      customerNote: "ملاحظة العميل",
      emailUpdatesHint:
        "سيتم إرسال التحديثات فقط عند إدخال بريد إلكتروني صالح.",
      internalNote: "ملاحظة داخلية",
      noOptionGroup: "لا توجد خيارات مخصصة لهذا المنتج.",
      optionDetailsDescription:
        "تظهر فقط الحقول القادمة من مجموعة الخيارات المرتبطة بالمنتج المحدد.",
      optionDetailsTitle: "خيارات المنتج",
      optionRequired: "يرجى تعبئة هذا الحقل.",
      previewCategory: "التصنيف",
      previewGroup: "مجموعة الخيارات",
      previewSku: "رمز المنتج",
      previewValues: "القيم المحددة",
      productSectionDescription:
        "اختر التصنيف أولاً ثم حدد المنتج المرتبط به لإظهار خياراته فقط.",
      summaryActionDescription:
        "راجع المعاينة ثم أنشئ طلب الورشة عند اكتمال البيانات.",
      summaryActionTitle: "الإنشاء والمتابعة",
      summaryDescription:
        "تتحدث بطاقة المعاينة فوراً مع تغيير المنتج أو تعبئة الخيارات.",
      trackingSectionTitle: "التحديثات البريدية",
    };
  }

  if (locale === "de") {
    return {
      allCategories: "Alle Kategorien",
      categoryEmpty: "Fuer diese Kategorie sind keine Produkte verfuegbar.",
      customerSectionDescription:
        "Pflegen Sie die Kundendaten und aktivieren Sie E-Mail-Updates nur bei Bedarf.",
      customerSectionTitle: "Kundendaten",
      customerNote: "Kundennotiz",
      emailUpdatesHint:
        "Updates werden nur versendet, wenn eine gueltige E-Mail-Adresse eingetragen ist.",
      internalNote: "Interne Notiz",
      noOptionGroup: "Diesem Produkt ist keine eigene Optionsgruppe zugewiesen.",
      optionDetailsDescription:
        "Es werden nur die Felder aus der zugewiesenen Optionsgruppe des Produkts angezeigt.",
      optionDetailsTitle: "Produktoptionen",
      optionRequired: "Bitte fuellen Sie dieses Pflichtfeld aus.",
      previewCategory: "Kategorie",
      previewGroup: "Optionsgruppe",
      previewSku: "SKU",
      previewValues: "Ausgewaehlte Werte",
      productSectionDescription:
        "Waehlen Sie zuerst eine Kategorie und danach nur ein passendes Produkt aus dieser Kategorie.",
      summaryActionDescription:
        "Die Auftragsvorschau bleibt sichtbar, waehrend wir die Werkstattanfrage vorbereiten.",
      summaryActionTitle: "Auftrag anlegen",
      summaryDescription:
        "Produktbild, Kategorie, SKU und gewaehlte Optionen bleiben hier im Blick.",
      trackingSectionTitle: "E-Mail-Updates",
    };
  }

  return {
    allCategories: "All categories",
    categoryEmpty: "No products are available in this category.",
    customerSectionDescription:
      "Capture customer details and enable email updates only when they make sense.",
    customerSectionTitle: "Customer details",
    customerNote: "Customer note",
    emailUpdatesHint:
      "Updates are only sent when a valid customer email address is provided.",
    internalNote: "Internal note",
    noOptionGroup: "No custom options are assigned to this product.",
    optionDetailsDescription:
      "Only fields from the selected product's assigned option group appear here.",
    optionDetailsTitle: "Product options",
    optionRequired: "Please complete this required field.",
    previewCategory: "Category",
    previewGroup: "Option group",
    previewSku: "SKU",
    previewValues: "Selected values",
    productSectionDescription:
      "Choose a category first, then pick one product from that filtered list.",
    summaryActionDescription:
      "Review the live snapshot, then create the workshop order once everything looks right.",
    summaryActionTitle: "Create workshop order",
    summaryDescription:
      "The preview updates immediately as the product and option values change.",
    trackingSectionTitle: "Email updates",
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

function formatProductLabel(product: AdminProductRecord) {
  return `${product.displayName} - ${product.sku}`;
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
  const [selectedCategoryId, setSelectedCategoryId] = useState(() =>
    getInitialCategoryId(products, getInitialProductId(products, preselectedProductId))
  );
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);
  const [optionValues, setOptionValues] = useState<Record<string, OptionFieldValue>>({});
  const requiredLabel = getRequiredFieldBadge(locale);
  const productRequiredMessage =
    locale === "de"
      ? "Bitte waehlen Sie zuerst ein Produkt aus."
      : locale === "ar"
        ? "يرجى اختيار منتج أولاً."
        : "Please choose a product first.";
  const emailInvalidMessage =
    locale === "de"
      ? "Bitte geben Sie eine gueltige E-Mail-Adresse ein."
      : locale === "ar"
        ? "يرجى إدخال بريد إلكتروني صالح."
        : "Please enter a valid email address.";

  const categoryChoices = useMemo<CategoryChoice[]>(() => {
    const seen = new Set<string>();

    return products.flatMap((product) => {
      if (!product.categoryId || seen.has(product.categoryId)) {
        return [];
      }

      seen.add(product.categoryId);
      return [
        {
          id: product.categoryId,
          label: product.categoryName,
        },
      ];
    });
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      selectedCategoryId === "all"
        ? products
        : products.filter((product) => product.categoryId === selectedCategoryId),
    [products, selectedCategoryId]
  );

  const selectedProduct =
    products.find((product) => product.id === productId) ?? filteredProducts[0] ?? null;
  const selectedGroup =
    selectedProduct?.optionGroupId
      ? groups.find((group) => group.id === selectedProduct.optionGroupId) ?? null
      : null;
  const productOptions = useMemo<OrderFormOptionField[]>(() => {
    if (!selectedGroup) {
      return [];
    }

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
  }, [locale, selectedGroup]);
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
  const canSendEmailUpdates = customerEmail.trim().length > 0;
  const emailUpdatesChecked = canSendEmailUpdates ? emailUpdatesEnabled : false;

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

  const handleProductChange = (nextProductId: string) => {
    setOptionValues({});
    setFieldErrors({});
    setFeedback(null);
    setProductId(nextProductId);
  };

  const submitForm = () => {
    if (!selectedProduct) {
      const nextErrors = { productId: productRequiredMessage };
      setFieldErrors(nextErrors);
      focusFirstInvalidField(nextErrors);
      return;
    }

    const nextErrors: FieldErrors = {};

    if (!customerName.trim()) {
      nextErrors.customerName =
        locale === "ar"
          ? "يرجى إدخال اسم العميل."
          : locale === "de"
            ? "Bitte geben Sie den Kundennamen ein."
            : "Please enter the customer name.";
    }

    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(customerEmail.trim())) {
      nextErrors.customerEmail = emailInvalidMessage;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      nextErrors.quantity =
        locale === "ar"
          ? "يرجى إدخال كمية صحيحة."
          : locale === "de"
            ? "Bitte geben Sie eine gueltige Menge ein."
            : "Please enter a valid quantity.";
    }

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

    startTransition(async () => {
      const result = await createOrderAction(locale, {
        attachments: [],
        currency: "EUR",
        customerEmail: customerEmail.trim(),
        customerLanguage: locale,
        customerName,
        customerPhone,
        customerReference,
        dueDate: "",
        emailUpdatesEnabled: emailUpdatesChecked,
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
          karat: null,
          nameCustomization: {
            enabled: false,
            language: null,
            text: null,
          },
          weightGrams: null,
        },
        quantity,
        referenceImages: [],
        selectedOptions: productOptions.map((field) => ({
          groupKey: field.groupKey,
          key: field.key,
          label: field.label,
          optionId: field.id,
          type: field.type,
          value: normalizeFieldValue(field.type, optionValues[field.id]),
        })),
        stones: {},
        totalAmount: null,
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
            description={uiCopy.productSectionDescription}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <AdminSelect
                id="categoryId"
                name="categoryId"
                label={t("newOrder.fields.category")}
                value={selectedCategoryId}
                onChange={(event) => {
                  const nextCategoryId = event.target.value;
                  const nextFilteredProducts =
                    nextCategoryId === "all"
                      ? products
                      : products.filter((product) => product.categoryId === nextCategoryId);

                  setSelectedCategoryId(nextCategoryId);
                  setFeedback(null);
                  setFieldErrors({});
                  setOptionValues({});

                  if (!nextFilteredProducts.some((product) => product.id === productId)) {
                    setProductId(nextFilteredProducts[0]?.id ?? "");
                  }
                }}
              >
                <option value="all">{uiCopy.allCategories}</option>
                {categoryChoices.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </AdminSelect>

              <AdminSelect
                id="productId"
                name="productId"
                label={t("newOrder.fields.product")}
                required
                requiredLabel={requiredLabel}
                value={productId}
                errorText={fieldErrors.productId}
                wrapperClassName="xl:col-span-2"
                onChange={(event) => handleProductChange(event.target.value)}
              >
                {filteredProducts.length === 0 ? (
                  <option value="">{uiCopy.categoryEmpty}</option>
                ) : null}
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {formatProductLabel(product)}
                  </option>
                ))}
              </AdminSelect>

              <AdminInput
                id="quantity"
                name="quantity"
                label={t("newOrder.fields.quantity")}
                type="number"
                min="1"
                step="1"
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

              <div className="space-y-3">
                <AdminInput
                  id="customerEmail"
                  name="customerEmail"
                  label={t("newOrder.fields.customerEmail")}
                  type="email"
                  value={customerEmail}
                  errorText={fieldErrors.customerEmail}
                  onChange={(event) => {
                    clearFieldError("customerEmail");
                    setCustomerEmail(event.target.value);
                  }}
                />
                <div className="space-y-2">
                  <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={emailUpdatesChecked}
                      disabled={!canSendEmailUpdates}
                      onChange={(event) => setEmailUpdatesEnabled(event.target.checked)}
                      className="h-4 w-4 accent-[#c49a52] disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    {t("newOrder.fields.emailUpdatesEnabled")}
                  </label>
                  <p className="text-xs text-muted">{uiCopy.emailUpdatesHint}</p>
                </div>
              </div>

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
            title={selectedGroup?.displayName || uiCopy.optionDetailsTitle}
            description={uiCopy.optionDetailsDescription}
          >
            {selectedProduct && productOptions.length === 0 ? (
              <p className="text-sm text-muted">{uiCopy.noOptionGroup}</p>
            ) : (
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
            )}
          </AdminCard>

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
            description={uiCopy.summaryDescription}
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
                    <span className="text-muted">{uiCopy.previewCategory}</span>
                    <span className="text-end text-foreground">
                      {selectedProduct.categoryName || t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{uiCopy.previewSku}</span>
                    <span className="text-end text-foreground">
                      {selectedProduct.sku || t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{uiCopy.previewGroup}</span>
                    <span className="text-end text-foreground">
                      {selectedGroup?.displayName || t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{t("newOrder.fields.quantity")}</span>
                    <span className="text-end text-foreground">{quantity}</span>
                  </div>
                  {optionSummaryRows.length > 0 ? (
                    optionSummaryRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-start justify-between gap-4"
                      >
                        <span className="text-muted">{row.label}</span>
                        <span className="text-end text-foreground">{row.value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted">{uiCopy.previewValues}</span>
                      <span className="text-end text-foreground">
                        {productOptions.length === 0
                          ? uiCopy.noOptionGroup
                          : t("common.notProvided")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{uiCopy.categoryEmpty}</p>
            )}
          </AdminCard>

          <AdminCard
            title={uiCopy.summaryActionTitle}
            description={uiCopy.summaryActionDescription}
          >
            <div className="space-y-4">
              <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4 text-sm text-muted">
                {uiCopy.trackingSectionTitle}:{" "}
                {emailUpdatesChecked ? t("common.enabled") : t("common.disabled")}
              </div>
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
