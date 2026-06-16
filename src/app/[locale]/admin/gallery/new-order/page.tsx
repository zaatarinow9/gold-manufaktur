"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminReadonlyField } from "@/components/admin/AdminReadonlyField";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminStepper } from "@/components/admin/AdminStepper";
import {
  adminUsers,
  employees,
  managedProducts,
  nextMockInternalOrderNumber,
  nextMockTrackingNumber,
  workshops,
} from "@/data/adminMock";
import {
  getGroupedApplicableOptions,
  getOptionGroupTranslationKey,
  getOptionLabelTranslationKey,
  getOptionValueLabel as getRawOptionValueLabel,
  getOptionValueTranslationKey,
} from "@/lib/admin/options";
import {
  getCurrentAdminUser,
  scopeEmployeesForUser,
  scopeWorkshopsForUser,
} from "@/lib/admin/currentUser";
import type {
  OptionGroup,
  ProductOption,
  SelectedOptionValue,
} from "@/types/admin";

type StepId = "productOptions" | "customerWorkshop" | "review";

type DraftOrderState = {
  assignedAdminId: string;
  assignedEmployeeId: string;
  braceletSize: string;
  category: string;
  chainLength: string;
  customerEmail: string;
  customerName: string;
  customerNotes: string;
  customerPhone: string;
  customerReference: string;
  customMeasurements: string;
  dueDate: string;
  emailUpdatesEnabled: boolean;
  engravingNotes: string;
  engravingText: string;
  estimatedWeight: string;
  fontStyle: string;
  goldColor: string;
  goldKarat: string;
  hasNameCustomization: boolean;
  hasStones: boolean;
  internalNotes: string;
  internalOrderNumber: string;
  language: string;
  nameText: string;
  placement: string;
  priority: string;
  productId: string;
  productName: string;
  quantity: string;
  ringSize: string;
  stoneColor: string;
  stoneCount: string;
  stoneSetting: string;
  stoneShape: string;
  stoneType: string;
  surface: string;
  trackingNumber: string;
  trackingStatus: string;
  workshopId: string;
  workshopNotes: string;
};

const personalizationCategorySlug = "namensschmuck-nach-mass";

const draftKeyByOptionKey: Record<string, keyof DraftOrderState> = {
  bracelet_size: "braceletSize",
  chain_length: "chainLength",
  due_date: "dueDate",
  engraving_text: "engravingText",
  estimated_weight: "estimatedWeight",
  finish_type: "surface",
  gold_color: "goldColor",
  gold_karat: "goldKarat",
  name_text: "nameText",
  priority: "priority",
  ring_size: "ringSize",
  stone_color: "stoneColor",
  stone_type: "stoneType",
  workshop_notes: "workshopNotes",
};

function createDraftState(productId?: string): DraftOrderState {
  const product = managedProducts.find((item) => item.id === productId) ?? managedProducts[0];

  return {
    assignedAdminId: adminUsers[0]?.id ?? "",
    assignedEmployeeId: employees[0]?.id ?? "",
    braceletSize: "",
    category: product.categoryName,
    chainLength: "",
    customerEmail: "",
    customerName: "",
    customerNotes: "",
    customerPhone: "",
    customerReference: "",
    customMeasurements: "",
    dueDate: "2026-06-28",
    emailUpdatesEnabled: false,
    engravingNotes: "",
    engravingText: "",
    estimatedWeight: "",
    fontStyle: "classic",
    goldColor: "yellow_gold",
    goldKarat: "21K",
    hasNameCustomization: false,
    hasStones: false,
    internalNotes: "",
    internalOrderNumber: nextMockInternalOrderNumber,
    language: "de",
    nameText: "",
    placement: "",
    priority: "normal",
    productId: product.id,
    productName: product.name,
    quantity: "1",
    ringSize: "",
    stoneColor: "",
    stoneCount: "",
    stoneSetting: "",
    stoneShape: "",
    stoneType: "",
    surface: "polished",
    trackingNumber: nextMockTrackingNumber,
    trackingStatus: "created",
    workshopId: workshops[0]?.id ?? "",
    workshopNotes: "",
  };
}

function hasValue(value: SelectedOptionValue | string) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function getGroup(groupedOptions: Array<OptionGroup & { options: ProductOption[] }>, key: OptionGroup["key"]) {
  return groupedOptions.find((group) => group.key === key);
}

export default function AdminNewOrderPage() {
  const t = useTranslations("Admin");
  const searchParams = useSearchParams();
  const currentUser = getCurrentAdminUser();
  const initialProductId = searchParams.get("product") ?? managedProducts[0]?.id;
  const [activeStep, setActiveStep] = useState<StepId>("productOptions");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [optionValues, setOptionValues] = useState<Record<string, SelectedOptionValue>>({});
  const [draft, setDraft] = useState<DraftOrderState>(() =>
    createDraftState(initialProductId ?? undefined)
  );

  const selectedProduct =
    managedProducts.find((product) => product.id === draft.productId) ?? managedProducts[0];
  const visibleWorkshops = scopeWorkshopsForUser(currentUser, workshops);
  const visibleEmployees = scopeEmployeesForUser(currentUser, employees);
  const groupedOptions = getGroupedApplicableOptions(
    selectedProduct.id,
    selectedProduct.categorySlug,
    draft.workshopId,
    currentUser.role
  );

  const goldGroup = getGroup(groupedOptions, "gold_details");
  const measurementsGroup = getGroup(groupedOptions, "measurements");
  const personalizationGroup = getGroup(groupedOptions, "name_personalization");
  const stonesGroup = getGroup(groupedOptions, "stones");
  const workshopGroup = getGroup(groupedOptions, "workshop_notes");

  const supportsPersonalization =
    selectedProduct.categorySlug === personalizationCategorySlug ||
    Boolean(personalizationGroup?.options.length);
  const supportsStones = Boolean(stonesGroup?.options.length);
  const effectiveWorkshopId = visibleWorkshops.some((workshop) => workshop.id === draft.workshopId)
    ? draft.workshopId
    : visibleWorkshops[0]?.id ?? "";
  const workshopEmployees = visibleEmployees.filter(
    (employee) => employee.workshopId === effectiveWorkshopId
  );
  const selectableEmployees = workshopEmployees.length > 0 ? workshopEmployees : visibleEmployees;
  const effectiveAssignedEmployeeId = selectableEmployees.some(
    (employee) => employee.id === draft.assignedEmployeeId
  )
    ? draft.assignedEmployeeId
    : selectableEmployees[0]?.id ?? "";
  const steps = [
    { id: "productOptions", label: t("newOrder.steps.productOptions") },
    { id: "customerWorkshop", label: t("newOrder.steps.customerWorkshop") },
    { id: "review", label: t("newOrder.steps.review") },
  ] as const;
  const currentStepIndex = steps.findIndex((step) => step.id === activeStep);

  const updateDraft = <Key extends keyof DraftOrderState>(
    key: Key,
    value: DraftOrderState[Key]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetProductScopedFields = (productId: string) => {
    const product = managedProducts.find((item) => item.id === productId) ?? managedProducts[0];

    setDraft((current) => ({
      ...current,
      braceletSize: "",
      category: product.categoryName,
      chainLength: "",
      customMeasurements: "",
      engravingNotes: "",
      engravingText: "",
      estimatedWeight: "",
      fontStyle: "classic",
      goldColor: "yellow_gold",
      goldKarat: "21K",
      hasNameCustomization: false,
      hasStones: false,
      language: "de",
      nameText: "",
      placement: "",
      priority: "normal",
      productId: product.id,
      productName: product.name,
      ringSize: "",
      stoneColor: "",
      stoneCount: "",
      stoneSetting: "",
      stoneShape: "",
      stoneType: "",
      surface: "polished",
      workshopNotes: "",
    }));
    setOptionValues({});
  };

  const getOptionLabel = (option: ProductOption) => {
    const translationKey = getOptionLabelTranslationKey(option.key);

    return translationKey ? t(translationKey) : option.label;
  };

  const getGroupTitle = (group: OptionGroup & { options: ProductOption[] }) => {
    const translationKey = getOptionGroupTranslationKey(group.key);

    return translationKey ? t(translationKey) : group.label;
  };

  const getOptionFieldValue = (option: ProductOption) => {
    const draftKey = draftKeyByOptionKey[option.key];

    return draftKey ? draft[draftKey] : optionValues[option.id];
  };

  const getOptionDisplayValue = (option: ProductOption, value: SelectedOptionValue) => {
    if (typeof value === "string") {
      const translationKey = getOptionValueTranslationKey(option.key, value);

      if (translationKey) {
        return t(translationKey);
      }
    }

    return getRawOptionValueLabel(option, value);
  };

  const setOptionFieldValue = (option: ProductOption, value: SelectedOptionValue) => {
    const draftKey = draftKeyByOptionKey[option.key];

    if (draftKey) {
      setDraft((current) => ({
        ...current,
        [draftKey]: value as DraftOrderState[keyof DraftOrderState],
      }));
      return;
    }

    setOptionValues((current) => ({ ...current, [option.id]: value }));
  };

  const renderOptionField = (option: ProductOption) => {
    const value = getOptionFieldValue(option);
    const label = getOptionLabel(option);

    if (option.type === "select") {
      return (
        <AdminSelect
          key={option.id}
          label={label}
          value={String(value ?? "")}
          onChange={(event) => setOptionFieldValue(option, event.target.value)}
          required={option.isRequired}
        >
          <option value="">{t("common.selectPlaceholder")}</option>
          {option.values.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {getOptionDisplayValue(option, entry.value)}
            </option>
          ))}
        </AdminSelect>
      );
    }

    if (option.type === "textarea") {
      return (
        <label key={option.id} className="block space-y-2">
          <span className="admin-label">
            {label}
            {option.isRequired ? <span className="admin-required">*</span> : null}
          </span>
          <textarea
            className="admin-textarea"
            value={String(value ?? "")}
            onChange={(event) => setOptionFieldValue(option, event.target.value)}
            required={option.isRequired}
          />
        </label>
      );
    }

    if (option.type === "date") {
      return (
        <AdminInput
          key={option.id}
          type="date"
          label={label}
          value={String(value ?? "")}
          onChange={(event) => setOptionFieldValue(option, event.target.value)}
          required={option.isRequired}
        />
      );
    }

    if (option.type === "number") {
      return (
        <AdminInput
          key={option.id}
          type="number"
          label={label}
          value={String(value ?? "")}
          onChange={(event) => setOptionFieldValue(option, event.target.value)}
          required={option.isRequired}
        />
      );
    }

    return (
      <AdminInput
        key={option.id}
        label={label}
        value={String(value ?? "")}
        onChange={(event) => setOptionFieldValue(option, event.target.value)}
        required={option.isRequired}
      />
    );
  };

  const renderOptionGrid = (group?: OptionGroup & { options: ProductOption[] }) => {
    if (!group || group.options.length === 0) {
      return null;
    }

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {group.options.map((option) => renderOptionField(option))}
      </div>
    );
  };

  const buildOptionSummaryRows = (group?: OptionGroup & { options: ProductOption[] }) => {
    if (!group) {
      return [];
    }

    return group.options
      .map((option) => {
        const value = getOptionFieldValue(option);

        if (!hasValue(value ?? "")) {
          return null;
        }

        if (group.key === "name_personalization" && !draft.hasNameCustomization) {
          return null;
        }

        if (group.key === "stones" && !draft.hasStones) {
          return null;
        }

        return {
          label: getOptionLabel(option),
          value: getOptionDisplayValue(option, value ?? ""),
        };
      })
      .filter((entry): entry is { label: string; value: string } => entry !== null);
  };

  const renderSummaryCard = (
    title: string,
    rows: Array<{ label: string; value: React.ReactNode }>
  ) => {
    if (rows.length === 0) {
      return null;
    }

    return (
      <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <dl className="mt-3 grid gap-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted">{row.label}</dt>
              <dd className="max-w-[58%] text-end text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const productSummaryRows = [
    { label: t("newOrder.fields.productName"), value: draft.productName },
    { label: t("newOrder.fields.category"), value: draft.category },
    { label: t("newOrder.fields.quantity"), value: draft.quantity },
  ];
  const customerSummaryRows = [
    { label: t("newOrder.fields.customerName"), value: draft.customerName || "-" },
    { label: t("newOrder.fields.customerEmail"), value: draft.customerEmail || "-" },
    { label: t("newOrder.fields.customerPhone"), value: draft.customerPhone || "-" },
  ];
  const workshopSummaryRows = [
    {
      label: t("newOrder.fields.workshop"),
      value: visibleWorkshops.find((workshop) => workshop.id === effectiveWorkshopId)?.name ?? "-",
    },
    {
      label: t("newOrder.fields.assignedEmployee"),
      value:
        visibleEmployees.find((employee) => employee.id === effectiveAssignedEmployeeId)?.name ??
        "-",
    },
    { label: t("newOrder.fields.priority"), value: t(`priority.${draft.priority}`) },
    { label: t("newOrder.fields.dueDate"), value: draft.dueDate || "-" },
  ];
  const trackingSummaryRows = [
    { label: t("newOrder.fields.trackingNumber"), value: draft.trackingNumber },
    { label: t("newOrder.fields.trackingStatus"), value: t(`trackingStatus.${draft.trackingStatus}`) },
    {
      label: t("newOrder.fields.emailUpdatesEnabled"),
      value: draft.emailUpdatesEnabled ? t("common.enabled") : t("common.disabled"),
    },
  ];
  const measurementsSummaryRows = [
    ...buildOptionSummaryRows(measurementsGroup),
    ...(hasValue(draft.customMeasurements)
      ? [{ label: t("newOrder.fields.customMeasurements"), value: draft.customMeasurements }]
      : []),
  ];
  const personalizationSummaryRows = supportsPersonalization
    ? [
        {
          label: t("newOrder.fields.nameCustomizationEnabled"),
          value: draft.hasNameCustomization ? t("common.yes") : t("common.no"),
        },
        ...(draft.hasNameCustomization
          ? [
              ...buildOptionSummaryRows(personalizationGroup),
              { label: t("newOrder.fields.language"), value: draft.language === "ar" ? "العربية" : "Deutsch" },
              { label: t("newOrder.fields.fontStyle"), value: t(`newOrder.values.${draft.fontStyle}`) },
              { label: t("newOrder.fields.placement"), value: draft.placement || "-" },
              { label: t("newOrder.fields.engravingNotes"), value: draft.engravingNotes || "-" },
            ]
          : []),
      ]
    : [];
  const stonesSummaryRows = supportsStones
    ? [
        {
          label: t("newOrder.fields.stonesEnabled"),
          value: draft.hasStones ? t("common.yes") : t("common.no"),
        },
        ...(draft.hasStones
          ? [
              ...buildOptionSummaryRows(stonesGroup),
              { label: t("newOrder.fields.stoneShape"), value: draft.stoneShape || "-" },
              { label: t("newOrder.fields.stoneCount"), value: draft.stoneCount || "-" },
              { label: t("newOrder.fields.stoneSetting"), value: draft.stoneSetting || "-" },
            ]
          : []),
      ]
    : [];
  const goldSummaryRows = buildOptionSummaryRows(goldGroup);
  const workshopOptionSummaryRows = buildOptionSummaryRows(workshopGroup);

  const renderStepContent = () => {
    if (activeStep === "productOptions") {
      return (
        <>
          <AdminSection
            title={t("newOrder.sections.product")}
            description={t("newOrder.productDescription")}
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1rem] border border-white/10">
                <Image
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 24vw, 100vw"
                />
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <AdminBadge variant="gold">{selectedProduct.categoryName}</AdminBadge>
                  <AdminBadge variant="info">{draft.internalOrderNumber}</AdminBadge>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {selectedProduct.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {selectedProduct.shortDescription}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <AdminSelect
                    label={t("newOrder.fields.product")}
                    value={draft.productId}
                    onChange={(event) => resetProductScopedFields(event.target.value)}
                    required
                  >
                    {managedProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminInput
                    label={t("newOrder.fields.quantity")}
                    value={draft.quantity}
                    onChange={(event) => updateDraft("quantity", event.target.value)}
                    required
                  />
                  <AdminReadonlyField
                    label={t("newOrder.fields.orderNumber")}
                    value={draft.internalOrderNumber}
                  />
                  <AdminReadonlyField
                    label={t("newOrder.fields.category")}
                    value={draft.category}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {selectedProduct.gallery.slice(0, 3).map((image, index) => (
                    <div
                      key={image}
                      className="relative aspect-square overflow-hidden rounded-[0.9rem] border border-white/10"
                    >
                      <Image
                        src={image}
                        alt={`${selectedProduct.name} ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="140px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminSection>

          {goldGroup ? (
            <AdminSection
              title={getGroupTitle(goldGroup)}
              description={t("newOrder.goldDescription")}
            >
              {renderOptionGrid(goldGroup)}
            </AdminSection>
          ) : null}

          {measurementsGroup ? (
            <AdminSection
              title={getGroupTitle(measurementsGroup)}
              description={t("newOrder.measurementsDescription")}
            >
              <div className="space-y-4">
                {renderOptionGrid(measurementsGroup)}
                <label className="block space-y-2">
                  <span className="admin-label">{t("newOrder.fields.customMeasurements")}</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.customMeasurements}
                    onChange={(event) => updateDraft("customMeasurements", event.target.value)}
                  />
                </label>
              </div>
            </AdminSection>
          ) : null}

          {supportsPersonalization ? (
            <AdminSection
              title={t("newOrder.sections.personalization")}
              description={t("newOrder.personalizationDescription")}
            >
              <div className="space-y-4">
                <label className="admin-checkbox-row">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#c49a52]"
                    checked={draft.hasNameCustomization}
                    onChange={(event) =>
                      updateDraft("hasNameCustomization", event.target.checked)
                    }
                  />
                  <span className="text-sm text-foreground">
                    {t("newOrder.fields.nameCustomizationEnabled")}
                  </span>
                </label>

                {draft.hasNameCustomization ? (
                  <>
                    {renderOptionGrid(personalizationGroup)}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <AdminSelect
                        label={t("newOrder.fields.language")}
                        value={draft.language}
                        onChange={(event) => updateDraft("language", event.target.value)}
                      >
                        <option value="de">Deutsch</option>
                        <option value="ar">العربية</option>
                      </AdminSelect>
                      <AdminSelect
                        label={t("newOrder.fields.fontStyle")}
                        value={draft.fontStyle}
                        onChange={(event) => updateDraft("fontStyle", event.target.value)}
                      >
                        <option value="classic">{t("newOrder.values.classic")}</option>
                        <option value="modern">{t("newOrder.values.modern")}</option>
                        <option value="script">{t("newOrder.values.script")}</option>
                      </AdminSelect>
                      <AdminInput
                        label={t("newOrder.fields.placement")}
                        value={draft.placement}
                        onChange={(event) => updateDraft("placement", event.target.value)}
                      />
                      <label className="block space-y-2 lg:col-span-2">
                        <span className="admin-label">{t("newOrder.fields.engravingNotes")}</span>
                        <textarea
                          className="admin-textarea"
                          value={draft.engravingNotes}
                          onChange={(event) => updateDraft("engravingNotes", event.target.value)}
                        />
                      </label>
                    </div>
                  </>
                ) : null}
              </div>
            </AdminSection>
          ) : (
            <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-muted">
              {t("newOrder.personalizationDisabled")}
            </div>
          )}

          {supportsStones ? (
            <AdminSection
              title={t("newOrder.sections.stones")}
              description={t("newOrder.stonesDescription")}
            >
              <div className="space-y-4">
                <label className="admin-checkbox-row">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#c49a52]"
                    checked={draft.hasStones}
                    onChange={(event) => updateDraft("hasStones", event.target.checked)}
                  />
                  <span className="text-sm text-foreground">
                    {t("newOrder.fields.stonesEnabled")}
                  </span>
                </label>

                {draft.hasStones ? (
                  <>
                    {renderOptionGrid(stonesGroup)}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <AdminInput
                        label={t("newOrder.fields.stoneShape")}
                        value={draft.stoneShape}
                        onChange={(event) => updateDraft("stoneShape", event.target.value)}
                      />
                      <AdminInput
                        label={t("newOrder.fields.stoneCount")}
                        value={draft.stoneCount}
                        onChange={(event) => updateDraft("stoneCount", event.target.value)}
                      />
                      <AdminInput
                        label={t("newOrder.fields.stoneSetting")}
                        value={draft.stoneSetting}
                        onChange={(event) => updateDraft("stoneSetting", event.target.value)}
                        wrapperClassName="lg:col-span-2"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </AdminSection>
          ) : null}
        </>
      );
    }

    if (activeStep === "customerWorkshop") {
      return (
        <>
          <AdminSection
            title={t("orders.customerTitle")}
            description={t("orders.customerDescription")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <AdminInput
                label={t("newOrder.fields.customerName")}
                value={draft.customerName}
                onChange={(event) => updateDraft("customerName", event.target.value)}
                required
              />
              <AdminInput
                type="email"
                label={t("newOrder.fields.customerEmail")}
                value={draft.customerEmail}
                onChange={(event) => {
                  const nextEmail = event.target.value;

                  setDraft((current) => ({
                    ...current,
                    customerEmail: nextEmail,
                    emailUpdatesEnabled: nextEmail ? current.emailUpdatesEnabled : false,
                  }));
                }}
                placeholder="kundin@example.com"
              />
              <AdminInput
                label={t("newOrder.fields.customerPhone")}
                value={draft.customerPhone}
                onChange={(event) => updateDraft("customerPhone", event.target.value)}
              />
              <AdminInput
                label={t("newOrder.fields.customerReference")}
                value={draft.customerReference}
                onChange={(event) => updateDraft("customerReference", event.target.value)}
              />
              <label className="block space-y-2 lg:col-span-2">
                <span className="admin-label">{t("newOrder.fields.customerNotes")}</span>
                <textarea
                  className="admin-textarea"
                  value={draft.customerNotes}
                  onChange={(event) => updateDraft("customerNotes", event.target.value)}
                />
              </label>
              <label className="block space-y-2 lg:col-span-2">
                <span className="admin-label">{t("newOrder.fields.internalNotes")}</span>
                <textarea
                  className="admin-textarea"
                  value={draft.internalNotes}
                  onChange={(event) => updateDraft("internalNotes", event.target.value)}
                />
              </label>
            </div>
          </AdminSection>

          <AdminSection
            title={t("newOrder.sections.workshop")}
            description={t("newOrder.workshopDescription")}
          >
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <AdminSelect
                  label={t("newOrder.fields.workshop")}
                  value={effectiveWorkshopId}
                  onChange={(event) => {
                    const nextWorkshopId = event.target.value;
                    const nextWorkshopEmployees = visibleEmployees.filter(
                      (employee) => employee.workshopId === nextWorkshopId
                    );

                    setDraft((current) => ({
                      ...current,
                      workshopId: nextWorkshopId,
                      assignedEmployeeId:
                        nextWorkshopEmployees.find(
                          (employee) => employee.id === current.assignedEmployeeId
                        )?.id ??
                        nextWorkshopEmployees[0]?.id ??
                        visibleEmployees[0]?.id ??
                        "",
                    }));
                  }}
                  required
                >
                  {visibleWorkshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>
                      {workshop.name}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  label={t("newOrder.fields.assignedEmployee")}
                  value={effectiveAssignedEmployeeId}
                  onChange={(event) => updateDraft("assignedEmployeeId", event.target.value)}
                >
                  {selectableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              {renderOptionGrid(workshopGroup)}
            </div>
          </AdminSection>

          <AdminSection
            title={t("newOrder.sections.tracking")}
            description={t("newOrder.trackingDescription")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <AdminReadonlyField
                label={t("newOrder.fields.trackingNumber")}
                value={draft.trackingNumber}
                tone="gold"
              />
              <AdminReadonlyField
                label={t("newOrder.fields.trackingStatus")}
                value={t(`trackingStatus.${draft.trackingStatus}`)}
              />
              <label className="admin-checkbox-row lg:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#c49a52]"
                  checked={draft.emailUpdatesEnabled}
                  disabled={!draft.customerEmail}
                  onChange={(event) =>
                    updateDraft("emailUpdatesEnabled", event.target.checked)
                  }
                />
                <span className="text-sm text-foreground">
                  {t("newOrder.fields.emailUpdatesEnabled")}
                </span>
              </label>
              {!draft.customerEmail ? (
                <p className="lg:col-span-2 text-sm text-muted">{t("orders.noCustomerEmail")}</p>
              ) : null}
            </div>
          </AdminSection>
        </>
      );
    }

    return (
      <AdminSection
        title={t("newOrder.sections.review")}
        description={t("newOrder.reviewDescription")}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {renderSummaryCard(t("newOrder.sections.product"), productSummaryRows)}
          {renderSummaryCard(t("orders.customerTitle"), customerSummaryRows)}
          {renderSummaryCard(goldGroup ? getGroupTitle(goldGroup) : t("newOrder.sections.gold"), goldSummaryRows)}
          {renderSummaryCard(
            measurementsGroup ? getGroupTitle(measurementsGroup) : t("newOrder.sections.measurements"),
            measurementsSummaryRows
          )}
          {renderSummaryCard(t("newOrder.sections.personalization"), personalizationSummaryRows)}
          {renderSummaryCard(t("newOrder.sections.stones"), stonesSummaryRows)}
          {renderSummaryCard(t("newOrder.sections.workshop"), [
            ...workshopSummaryRows,
            ...workshopOptionSummaryRows,
          ])}
          {renderSummaryCard(t("newOrder.sections.tracking"), trackingSummaryRows)}
        </div>
      </AdminSection>
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(
          draft.customerEmail && draft.emailUpdatesEnabled
            ? t("newOrder.successWithNotifications", { number: draft.internalOrderNumber })
            : t("newOrder.success", { number: draft.internalOrderNumber })
        );
      }}
    >
      <AdminPageHeader
        eyebrow={t("newOrder.eyebrow")}
        title={t("newOrder.title")}
        description={t("newOrder.description")}
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => setFeedback(t("newOrder.draftSaved"))}
            >
              {t("buttons.saveDraft")}
            </AdminButton>
            <AdminButton type="submit" variant="primary">
              {t("buttons.submitOrder")}
            </AdminButton>
          </>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.28fr_0.86fr]">
        <div className="space-y-6">
          <AdminStepper
            currentStep={activeStep}
            onChange={(stepId) => setActiveStep(stepId as StepId)}
            steps={steps.map((step) => ({ id: step.id, label: step.label }))}
          />

          {renderStepContent()}

          <div className="flex flex-wrap justify-between gap-2">
            <AdminButton
              variant="ghost"
              onClick={() =>
                setActiveStep((current) => steps[Math.max(0, currentStepIndex - 1)]?.id ?? current)
              }
              disabled={currentStepIndex === 0}
            >
              {t("buttons.previous")}
            </AdminButton>
            {activeStep !== "review" ? (
              <AdminButton
                variant="primary"
                onClick={() =>
                  setActiveStep(
                    steps[Math.min(steps.length - 1, currentStepIndex + 1)]?.id ?? "review"
                  )
                }
              >
                {t("buttons.next")}
              </AdminButton>
            ) : (
              <AdminButton type="submit" variant="primary">
                {t("buttons.submitOrder")}
              </AdminButton>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <AdminCard
            title={t("newOrder.summaryTitle")}
            description={t("newOrder.summaryDescription")}
            className="xl:sticky xl:top-24"
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminReadonlyField
                  label={t("newOrder.fields.orderNumber")}
                  value={draft.internalOrderNumber}
                  tone="gold"
                />
                <AdminReadonlyField
                  label={t("newOrder.fields.trackingNumber")}
                  value={draft.trackingNumber}
                />
              </div>

              <div className="relative aspect-[4/3.7] overflow-hidden rounded-[1rem] border border-white/10">
                <Image
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 22vw, 100vw"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <AdminBadge variant="gold">{selectedProduct.categoryName}</AdminBadge>
                  <AdminBadge variant="neutral">
                    {steps[currentStepIndex]?.label ?? steps[0].label}
                  </AdminBadge>
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedProduct.name}
                </h2>
                <p className="text-sm leading-6 text-muted">
                  {selectedProduct.shortDescription}
                </p>
              </div>

              <div className="grid gap-4">
                <AdminReadonlyField
                  label={t("newOrder.fields.customerName")}
                  value={draft.customerName || "-"}
                />
                <AdminReadonlyField
                  label={t("newOrder.fields.workshop")}
                  value={
                    visibleWorkshops.find((workshop) => workshop.id === effectiveWorkshopId)?.name ??
                    "-"
                  }
                />
                <AdminReadonlyField
                  label={t("newOrder.fields.trackingStatus")}
                  value={t(`trackingStatus.${draft.trackingStatus}`)}
                />
              </div>
            </div>
          </AdminCard>
        </div>
      </section>
    </form>
  );
}
