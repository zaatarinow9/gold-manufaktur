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
import type { EmployeeRecord } from "@/lib/db/employees";
import type { WorkshopRecord } from "@/lib/db/workshops";

type NewOrderClientProps = {
  employees: EmployeeRecord[];
  locale: AppLocale;
  preselectedProductId?: string;
  products: AdminProductRecord[];
  workshops: WorkshopRecord[];
};

type OptionValueMap = Record<string, string | string[] | boolean>;

function getInitialProductId(
  products: AdminProductRecord[],
  preselectedProductId?: string
) {
  if (preselectedProductId && products.some((product) => product.id === preselectedProductId)) {
    return preselectedProductId;
  }

  return products[0]?.id ?? "";
}

function getOptionDisplayValue(value: string | string[] | boolean) {
  if (Array.isArray(value)) {
    return value;
  }

  return value;
}

function serializeSelectedOptionValue(value: string | string[] | boolean) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value;
}

function getGroupRecord(
  selectedOptions: Array<{
    groupKey: string;
    label: string;
    value: string | string[] | boolean;
  }>,
  groupKey: string
) {
  return Object.fromEntries(
    selectedOptions
      .filter((option) => option.groupKey === groupKey)
      .map((option) => [option.label, serializeSelectedOptionValue(option.value)])
  );
}

export function NewOrderClient({
  employees,
  locale,
  preselectedProductId,
  products,
  workshops,
}: NewOrderClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [productId, setProductId] = useState(() =>
    getInitialProductId(products, preselectedProductId)
  );
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"express" | "normal" | "urgent">("normal");
  const [workshopId, setWorkshopId] = useState(workshops[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(false);
  const [workshopNotes, setWorkshopNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [packagingNotes, setPackagingNotes] = useState("");
  const [qualityRequirements, setQualityRequirements] = useState("");
  const [optionValues, setOptionValues] = useState<OptionValueMap>({});

  const selectedProduct =
    products.find((product) => product.id === productId) ?? products[0];
  const visibleEmployees = employees.filter(
    (employee) => employee.workshopId === workshopId
  );
  const productOptions = selectedProduct?.optionSettings ?? [];

  const updateOptionValue = (optionId: string, value: string | string[] | boolean) => {
    setOptionValues((current) => ({
      ...current,
      [optionId]: value,
    }));
  };

  const submitForm = () => {
    if (!selectedProduct) {
      setFeedback("Please choose a product first.");
      return;
    }

    const selectedOptions = productOptions
      .map((option) => ({
        groupKey: option.groupKey,
        key: option.key,
        label: option.displayLabel,
        optionId: option.id,
        value: getOptionDisplayValue(optionValues[option.id] ?? ""),
      }))
      .filter((option) => {
        if (Array.isArray(option.value)) {
          return option.value.length > 0;
        }

        if (typeof option.value === "boolean") {
          return option.value;
        }

        return String(option.value).trim().length > 0;
      });

    const goldDetails = getGroupRecord(selectedOptions, "gold_details");
    const measurements = getGroupRecord(selectedOptions, "measurements");
    const personalization = getGroupRecord(
      selectedOptions,
      "name_personalization"
    );
    const stones = getGroupRecord(selectedOptions, "stones");

    startTransition(async () => {
      const result = await createOrderAction(locale, {
        attachments: [],
        customerEmail,
        customerName,
        customerPhone,
        customerReference,
        dueDate,
        emailUpdatesEnabled,
        employeeId,
        goldDetails,
        measurements,
        notes: {
          adminNotes,
          customerNotes,
          deliveryNotes,
          packagingNotes,
          qualityRequirements,
          specialInstructions: "",
          workshopNotes,
        },
        personalization,
        priority,
        productCategoryName: selectedProduct.categoryName,
        productCategorySlug: selectedProduct.categorySlug || "all",
        productId: selectedProduct.id,
        productImage: selectedProduct.imageUrl,
        productName: selectedProduct.displayName,
        productSku: selectedProduct.sku,
        productSlug: selectedProduct.slug,
        quantity,
        referenceImages: [],
        selectedOptions,
        stones,
        workshopId,
      });

      setFeedback(result.message);

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
          <AdminCard title={t("newOrder.sections.product")} description={t("newOrder.productDescription")}>
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminSelect
                label={t("newOrder.fields.product")}
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
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
                onChange={(event) => setQuantity(Number(event.target.value || 1))}
              />
            </div>
          </AdminCard>

          <AdminCard title={t("newOrder.sections.order")} description={t("newOrder.orderDescription")}>
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminInput
                label={t("newOrder.fields.customerName")}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <AdminInput
                label={t("newOrder.fields.customerEmail")}
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
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
              <AdminInput
                label={t("newOrder.fields.dueDate")}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
              <AdminSelect
                label={t("newOrder.fields.priority")}
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as "express" | "normal" | "urgent")
                }
              >
                {["normal", "urgent", "express"].map((value) => (
                  <option key={value} value={value}>
                    {t(`priority.${value}`)}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </AdminCard>

          <AdminCard title={t("newOrder.sections.workshop")} description={t("newOrder.workshopDescription")}>
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminSelect
                label={t("newOrder.fields.workshop")}
                value={workshopId}
                onChange={(event) => {
                  setWorkshopId(event.target.value);
                  setEmployeeId("");
                }}
              >
                {workshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label={t("newOrder.fields.assignedEmployee")}
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
              >
                <option value="">{t("common.unassigned")}</option>
                {visibleEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </AdminCard>

          {productOptions.length > 0 ? (
            <AdminCard
              title={t("newOrder.additionalOptionsTitle")}
              description={t("newOrder.additionalOptionsDescription")}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {productOptions.map((option) => {
                  const currentValue = optionValues[option.id];

                  if (option.type === "textarea") {
                    return (
                      <AdminTextarea
                        key={option.id}
                        label={option.displayLabel}
                        value={typeof currentValue === "string" ? currentValue : ""}
                        onChange={(event) =>
                          updateOptionValue(option.id, event.target.value)
                        }
                      />
                    );
                  }

                  if (option.type === "boolean") {
                    return (
                      <div key={option.id} className="flex items-center gap-2 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(currentValue)}
                          onChange={(event) =>
                            updateOptionValue(option.id, event.target.checked)
                          }
                          className="h-4 w-4 accent-[#c49a52]"
                        />
                        <span className="text-sm text-foreground">{option.displayLabel}</span>
                      </div>
                    );
                  }

                  if (option.type === "multi_select") {
                    return (
                      <label key={option.id} className="block space-y-2">
                        <span className="admin-label">{option.displayLabel}</span>
                        <select
                          multiple
                          className="admin-select min-h-40"
                          value={Array.isArray(currentValue) ? currentValue : []}
                          onChange={(event) =>
                            updateOptionValue(
                              option.id,
                              Array.from(event.target.selectedOptions).map(
                                (selectedOption) => selectedOption.value
                              )
                            )
                          }
                        >
                          {option.values.map((value) => (
                            <option key={value.value} value={value.value}>
                              {value.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  if (option.type === "select") {
                    return (
                      <AdminSelect
                        key={option.id}
                        label={option.displayLabel}
                        value={typeof currentValue === "string" ? currentValue : ""}
                        onChange={(event) =>
                          updateOptionValue(option.id, event.target.value)
                        }
                      >
                        <option value="">{t("common.selectPlaceholder")}</option>
                        {option.values.map((value) => (
                          <option key={value.value} value={value.value}>
                            {value.label}
                          </option>
                        ))}
                      </AdminSelect>
                    );
                  }

                  return (
                    <AdminInput
                      key={option.id}
                      label={option.displayLabel}
                      type={option.type === "number" ? "number" : option.type === "date" ? "date" : "text"}
                      value={typeof currentValue === "string" ? currentValue : ""}
                      onChange={(event) =>
                        updateOptionValue(option.id, event.target.value)
                      }
                    />
                  );
                })}
              </div>
            </AdminCard>
          ) : null}

          <AdminCard title={t("newOrder.sections.notes")} description={t("newOrder.reviewDescription")}>
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminTextarea
                label={t("newOrder.fields.workshopNotes")}
                value={workshopNotes}
                onChange={(event) => setWorkshopNotes(event.target.value)}
              />
              <AdminTextarea
                label={t("newOrder.fields.customerNotes")}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
              />
              <AdminTextarea
                label={t("newOrder.fields.internalNotes")}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
              />
              <AdminTextarea
                label={t("newOrder.fields.deliveryNotes")}
                value={deliveryNotes}
                onChange={(event) => setDeliveryNotes(event.target.value)}
              />
              <AdminTextarea
                label={t("newOrder.fields.packagingNotes")}
                value={packagingNotes}
                onChange={(event) => setPackagingNotes(event.target.value)}
              />
              <AdminTextarea
                label={t("newOrder.fields.qualityRequirements")}
                value={qualityRequirements}
                onChange={(event) => setQualityRequirements(event.target.value)}
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
                    <span className="text-muted">{t("newOrder.fields.priority")}</span>
                    <span className="text-foreground">{t(`priority.${priority}`)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{t("newOrder.fields.workshop")}</span>
                    <span className="text-foreground">
                      {workshops.find((workshop) => workshop.id === workshopId)?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{t("newOrder.fields.assignedEmployee")}</span>
                    <span className="text-foreground">
                      {visibleEmployees.find((employee) => employee.id === employeeId)?.fullName ||
                        t("common.unassigned")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted">{t("newOrder.fields.emailUpdatesEnabled")}</span>
                    <span className="text-foreground">
                      {emailUpdatesEnabled ? t("common.enabled") : t("common.disabled")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("orders.empty")}</p>
            )}
          </AdminCard>

          <AdminCard title={t("newOrder.sections.tracking")} description={t("newOrder.trackingDescription")}>
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
                {t("buttons.submitOrder")}
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      </section>
    </div>
  );
}
