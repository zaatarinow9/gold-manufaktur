"use client";

import clsx from "clsx";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { CatalogProduct } from "@/types/catalog";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";

type OrderEntryClientProps = {
  locale: AppLocale;
  products: CatalogProduct[];
  token: string;
};

type OptionFieldValue = boolean | number | string | string[];

function getCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      customer: "بيانات العميل",
      customerEmail: "البريد الإلكتروني",
      customerName: "اسم العميل",
      customerPhone: "رقم الهاتف",
      description:
        "هذا الرابط مخصص لإدخال الطلبات بشكل خاص. اختر المنتج واملأ البيانات المطلوبة لإرسال الطلب مباشرة إلى لوحة GoldHelwah.",
      emailInvalid: "يرجى إدخال بريد إلكتروني صحيح.",
      message: "ملاحظات الطلب",
      privacy: "رابط خاص ومحمي",
      product: "المنتج",
      productRequired: "يرجى اختيار منتج أولاً.",
      quantity: "الكمية",
      required: "يرجى تعبئة هذا الحقل.",
      specs: "مواصفات القطعة",
      submit: "إرسال الطلب",
      submitPending: "جارٍ إرسال الطلب...",
      success: "تم إنشاء الطلب بنجاح.",
      title: "إدخال طلب خاص",
      trackingCta: "عرض التتبع",
      weight: "الوزن بالغرام",
      weightInvalid: "يرجى إدخال وزن صحيح بالغرام.",
    };
  }

  if (locale === "de") {
    return {
      customer: "Kundendaten",
      customerEmail: "E-Mail",
      customerName: "Kundenname",
      customerPhone: "Telefon",
      description:
        "Dieser Link ist fuer die private Auftragserfassung gedacht. Waehlen Sie ein Produkt und senden Sie den Auftrag direkt an das GoldHelwah-Dashboard.",
      emailInvalid: "Bitte geben Sie eine gueltige E-Mail-Adresse ein.",
      message: "Auftragsnotiz",
      privacy: "Privater, geschuetzter Link",
      product: "Produkt",
      productRequired: "Bitte waehlen Sie zuerst ein Produkt aus.",
      quantity: "Menge",
      required: "Bitte fuellen Sie dieses Pflichtfeld aus.",
      specs: "Schmuckspezifikationen",
      submit: "Auftrag senden",
      submitPending: "Auftrag wird gesendet...",
      success: "Der Auftrag wurde erfolgreich angelegt.",
      title: "Private Auftragserfassung",
      trackingCta: "Tracking anzeigen",
      weight: "Gewicht in Gramm",
      weightInvalid: "Bitte geben Sie ein gueltiges Gewicht in Gramm ein.",
    };
  }

  return {
    customer: "Customer details",
    customerEmail: "Email",
    customerName: "Customer name",
    customerPhone: "Phone",
    description:
      "This private link is for secure order intake. Choose a product and send the order directly into the GoldHelwah dashboard.",
    emailInvalid: "Please enter a valid email address.",
    message: "Order note",
    privacy: "Private protected link",
    product: "Product",
    productRequired: "Please choose a product first.",
    quantity: "Quantity",
    required: "Please complete this field.",
    specs: "Jewelry specifications",
    submit: "Send order",
    submitPending: "Sending order...",
    success: "The order was created successfully.",
    title: "Private order entry",
    trackingCta: "Open tracking",
    weight: "Weight in grams",
    weightInvalid: "Please enter a valid weight in grams.",
  };
}

function getDefaultMessage(locale: AppLocale, productName: string) {
  if (locale === "ar") {
    return `أرغب في طلب ${productName}.`;
  }

  if (locale === "de") {
    return `Ich moechte ${productName} beauftragen.`;
  }

  return `I would like to order ${productName}.`;
}

function isMissingRequiredValue(type: string, value: OptionFieldValue | undefined) {
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

function normalizeFieldValue(type: string, value: OptionFieldValue): boolean | number | string | string[] | null {
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

export function OrderEntryClient({
  locale,
  products,
  token,
}: OrderEntryClientProps) {
  const copy = getCopy(locale);
  const [isPending, startTransition] = useTransition();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [message, setMessage] = useState(() =>
    products[0] ? getDefaultMessage(locale, products[0].name) : ""
  );
  const [karat, setKarat] = useState<"14" | "18" | "21">("21");
  const [weightGrams, setWeightGrams] = useState("");
  const [nameLanguage, setNameLanguage] = useState<"ar" | "en">("ar");
  const [nameText, setNameText] = useState("");
  const [optionValues, setOptionValues] = useState<Record<string, OptionFieldValue>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successTrackingNumber, setSuccessTrackingNumber] = useState<string | null>(null);

  const selectedProduct =
    products.find((product) => product.id === productId) ?? products[0] ?? null;
  const productOptions = selectedProduct?.optionGroup?.options ?? [];
  const inputClassName =
    "w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-start text-sm text-foreground outline-none transition placeholder:text-text-soft focus:border-gold/40 focus:bg-black/40";

  const hasNameCustomization = selectedProduct?.supportsNameCustomization === true;

  const handleSubmit = () => {
    if (!selectedProduct) {
      setFieldErrors({ productId: copy.productRequired });
      return;
    }

    const nextErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      nextErrors.customerName = copy.required;
    }

    if (!customerEmail.trim()) {
      nextErrors.customerEmail = copy.required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(customerEmail.trim())) {
      nextErrors.customerEmail = copy.emailInvalid;
    }

    if (!customerPhone.trim()) {
      nextErrors.customerPhone = copy.required;
    }

    if (!quantity.trim() || Number(quantity) < 1) {
      nextErrors.quantity = copy.required;
    }

    if (!weightGrams.trim() || Number(weightGrams) <= 0) {
      nextErrors.weightGrams = copy.weightInvalid;
    }

    if (hasNameCustomization && !nameText.trim()) {
      nextErrors.nameText = copy.required;
    }

    productOptions.forEach((field) => {
      if (field.isRequired && isMissingRequiredValue(field.type, optionValues[field.id])) {
        nextErrors[field.id] = copy.required;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSubmitError(null);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);

    startTransition(async () => {
      const response = await fetch("/api/order-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerEmail,
          customerName,
          customerPhone,
          karat,
          locale,
          message,
          nameLanguage: hasNameCustomization ? nameLanguage : null,
          nameText: hasNameCustomization ? nameText : "",
          optionValues: productOptions.map((field) => ({
            key: field.key,
            label: field.label,
            optionId: field.id,
            type: field.type,
            value: normalizeFieldValue(field.type, optionValues[field.id] ?? ""),
          })),
          productId: selectedProduct.id,
          quantity: Number(quantity),
          token,
          weightGrams: Number(weightGrams),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            fieldErrors?: Record<string, string[]>;
            success?: boolean;
            trackingNumber?: string;
          }
        | null;

      if (!response.ok || !payload?.success) {
        const nextErrors: Record<string, string> = {};

        if (payload?.fieldErrors) {
          Object.entries(payload.fieldErrors).forEach(([key, messages]) => {
            if (!messages?.length) {
              return;
            }

            const firstMessage = messages[0];
            nextErrors[key] =
              firstMessage === "required"
                ? copy.required
                : firstMessage === "product"
                  ? copy.productRequired
                  : copy.required;
          });
        }

        setFieldErrors(nextErrors);
        setSubmitError(payload?.error ?? "ORDER_ENTRY_FAILED");
        setSuccessTrackingNumber(null);
        return;
      }

      setSuccessTrackingNumber(payload.trackingNumber ?? null);
      setSubmitError(null);
      setFieldErrors({});
    });
  };

  const summaryRows = useMemo(
    () => [
      { label: copy.quantity, value: quantity },
      { label: "Karat", value: karat },
      { label: copy.weight, value: weightGrams ? `${weightGrams} g` : "-" },
    ],
    [copy.quantity, copy.weight, karat, quantity, weightGrams]
  );

  return (
    <div className="container-shell py-8 sm:py-10">
      <div className="content-shell grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <section className="luxury-panel flex flex-col justify-between px-6 py-8 sm:px-8 sm:py-10">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">
              {copy.privacy}
            </p>
            <h1 className="mt-6 text-4xl font-semibold text-foreground sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted">
              {copy.description}
            </p>
          </div>

          {selectedProduct ? (
            <div className="mt-8 rounded-[28px] border border-white/10 bg-black/24 p-4 sm:p-5">
              <div className="relative aspect-[4/4.6] overflow-hidden rounded-[20px] border border-white/10 bg-black/20">
                <LuxuryMedia
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  sizes="(max-width: 1279px) 100vw, 28vw"
                />
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">
                  {selectedProduct.categoryName}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  {selectedProduct.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {selectedProduct.shortDescription}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="luxury-panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-white/10 bg-black/18 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>{copy.product}</span>
                  <select
                     className={clsx(
                       inputClassName,
                       fieldErrors.productId && "border-rose-400/40 focus:border-rose-300/60"
                     )}
                     value={productId}
                     onChange={(event) => {
                       const nextProductId = event.target.value;
                       const nextProduct =
                         products.find((product) => product.id === nextProductId) ?? null;

                       setProductId(nextProductId);
                       setMessage(
                         nextProduct ? getDefaultMessage(locale, nextProduct.name) : ""
                       );
                       setOptionValues({});
                       setFieldErrors({});
                       setSuccessTrackingNumber(null);
                     }}
                   >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.productId ? (
                    <span className="text-xs text-rose-300">{fieldErrors.productId}</span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>{copy.quantity}</span>
                  <input
                    className={clsx(
                      inputClassName,
                      fieldErrors.quantity && "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                  {fieldErrors.quantity ? (
                    <span className="text-xs text-rose-300">{fieldErrors.quantity}</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/18 p-4 sm:p-5">
              <p className="muted-label">{copy.customer}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>{copy.customerName}</span>
                  <input
                    className={clsx(
                      inputClassName,
                      fieldErrors.customerName &&
                        "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                  {fieldErrors.customerName ? (
                    <span className="text-xs text-rose-300">{fieldErrors.customerName}</span>
                  ) : null}
                </label>
                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>{copy.customerEmail}</span>
                  <input
                    className={clsx(
                      inputClassName,
                      fieldErrors.customerEmail &&
                        "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                  {fieldErrors.customerEmail ? (
                    <span className="text-xs text-rose-300">{fieldErrors.customerEmail}</span>
                  ) : null}
                </label>
                <label className="flex flex-col gap-2 text-sm text-foreground md:col-span-2">
                  <span>{copy.customerPhone}</span>
                  <input
                    className={clsx(
                      inputClassName,
                      fieldErrors.customerPhone &&
                        "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    dir="ltr"
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                  {fieldErrors.customerPhone ? (
                    <span className="text-xs text-rose-300">{fieldErrors.customerPhone}</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/18 p-4 sm:p-5">
              <p className="muted-label">{copy.specs}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>Karat</span>
                  <select
                    className={inputClassName}
                    value={karat}
                    onChange={(event) => setKarat(event.target.value as "14" | "18" | "21")}
                  >
                    <option value="14">14</option>
                    <option value="18">18</option>
                    <option value="21">21</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>{copy.weight}</span>
                  <input
                    className={clsx(
                      inputClassName,
                      fieldErrors.weightGrams &&
                        "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    type="number"
                    min="0"
                    step="0.01"
                    value={weightGrams}
                    onChange={(event) => setWeightGrams(event.target.value)}
                  />
                  {fieldErrors.weightGrams ? (
                    <span className="text-xs text-rose-300">{fieldErrors.weightGrams}</span>
                  ) : null}
                </label>
                {hasNameCustomization ? (
                  <>
                    <label className="flex flex-col gap-2 text-sm text-foreground">
                      <span>Design</span>
                      <select
                        className={inputClassName}
                        value={nameLanguage}
                        onChange={(event) =>
                          setNameLanguage(event.target.value as "ar" | "en")
                        }
                      >
                        <option value="ar">Arabic</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-foreground">
                      <span>Name</span>
                      <input
                        className={clsx(
                          inputClassName,
                          fieldErrors.nameText &&
                            "border-rose-400/40 focus:border-rose-300/60"
                        )}
                        value={nameText}
                        onChange={(event) => setNameText(event.target.value)}
                      />
                      {fieldErrors.nameText ? (
                        <span className="text-xs text-rose-300">{fieldErrors.nameText}</span>
                      ) : null}
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            {productOptions.length > 0 ? (
              <div className="rounded-[26px] border border-white/10 bg-black/18 p-4 sm:p-5">
                <p className="muted-label">
                  {selectedProduct?.optionGroup?.name ?? copy.product}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {productOptions.map((field) => {
                    const currentValue = optionValues[field.id];
                    const errorText = fieldErrors[field.id];

                    if (field.type === "textarea") {
                      return (
                        <label key={field.id} className="flex flex-col gap-2 text-sm text-foreground md:col-span-2">
                          <span>{field.label}</span>
                          <textarea
                            className={clsx(
                              inputClassName,
                              "min-h-32 resize-y",
                              errorText && "border-rose-400/40 focus:border-rose-300/60"
                            )}
                            value={typeof currentValue === "string" ? currentValue : ""}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              setOptionValues((current) => ({
                                ...current,
                                [field.id]: event.target.value,
                              }))
                            }
                          />
                          {field.helpText ? (
                            <span className="text-xs text-muted">{field.helpText}</span>
                          ) : null}
                          {errorText ? (
                            <span className="text-xs text-rose-300">{errorText}</span>
                          ) : null}
                        </label>
                      );
                    }

                    if (field.type === "select") {
                      return (
                        <label key={field.id} className="flex flex-col gap-2 text-sm text-foreground">
                          <span>{field.label}</span>
                          <select
                            className={clsx(
                              inputClassName,
                              errorText && "border-rose-400/40 focus:border-rose-300/60"
                            )}
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) =>
                              setOptionValues((current) => ({
                                ...current,
                                [field.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="">{field.placeholder || field.label}</option>
                            {field.values.map((value) => (
                              <option key={`${field.id}-${value.value}`} value={value.value}>
                                {value.label}
                              </option>
                            ))}
                          </select>
                          {errorText ? (
                            <span className="text-xs text-rose-300">{errorText}</span>
                          ) : null}
                        </label>
                      );
                    }

                    if (field.type === "multi_select") {
                      const selectedValues = Array.isArray(currentValue) ? currentValue : [];

                      return (
                        <div key={field.id} className="flex flex-col gap-2 text-sm text-foreground md:col-span-2">
                          <span>{field.label}</span>
                          <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-4">
                            <div className="flex flex-wrap gap-3">
                              {field.values.map((value) => (
                                <label
                                  key={`${field.id}-${value.value}`}
                                  className="rtl-inline-row flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedValues.includes(value.value)}
                                    onChange={(event) =>
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
                                      })
                                    }
                                    className="h-4 w-4 accent-[#c49a52]"
                                  />
                                  {value.label}
                                </label>
                              ))}
                            </div>
                          </div>
                          {errorText ? (
                            <span className="text-xs text-rose-300">{errorText}</span>
                          ) : null}
                        </div>
                      );
                    }

                    if (field.type === "boolean") {
                      return (
                        <label
                          key={field.id}
                          className="rtl-inline-row flex items-center gap-2 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-foreground"
                        >
                          <input
                            type="checkbox"
                            checked={currentValue === true}
                            onChange={(event) =>
                              setOptionValues((current) => ({
                                ...current,
                                [field.id]: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 accent-[#c49a52]"
                          />
                          {field.label}
                        </label>
                      );
                    }

                    return (
                      <label key={field.id} className="flex flex-col gap-2 text-sm text-foreground">
                        <span>{field.label}</span>
                        <input
                          className={clsx(
                            inputClassName,
                            errorText && "border-rose-400/40 focus:border-rose-300/60"
                          )}
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          value={typeof currentValue === "string" ? currentValue : ""}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            setOptionValues((current) => ({
                              ...current,
                              [field.id]: event.target.value,
                            }))
                          }
                        />
                        {field.helpText ? (
                          <span className="text-xs text-muted">{field.helpText}</span>
                        ) : null}
                        {errorText ? (
                          <span className="text-xs text-rose-300">{errorText}</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm text-foreground">
              <span>{copy.message}</span>
              <textarea
                className={clsx(inputClassName, "min-h-40 resize-y")}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            <div className="rounded-[26px] border border-white/10 bg-black/18 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-gold-soft">
                <ShieldCheck className="h-4 w-4" />
                {copy.privacy}
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="text-muted">{row.label}</span>
                    <span className="text-foreground">{row.value || "-"}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="gold-button w-full justify-center"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {isPending ? copy.submitPending : copy.submit}
            </button>

            {submitError ? (
              <div className="rounded-[20px] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {submitError}
              </div>
            ) : null}

            {successTrackingNumber ? (
              <div className="rounded-[20px] border border-gold/25 bg-gold/10 px-4 py-4 text-sm text-gold-soft">
                <p>{copy.success}</p>
                <p className="mt-2 text-foreground">{successTrackingNumber}</p>
                <div className="mt-4">
                  <Link
                    href={`/tracking/${successTrackingNumber}`}
                    className="inline-flex rounded-full border border-gold/30 px-4 py-2 text-sm font-medium text-foreground transition hover:border-gold/50"
                  >
                    {copy.trackingCta}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
