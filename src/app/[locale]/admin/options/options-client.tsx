"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  deleteOptionAction,
  deleteOptionGroupAction,
  saveOptionAction,
  saveOptionGroupAction,
  toggleOptionActiveAction,
} from "@/app/[locale]/admin/options/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
  scrollCardIntoView,
} from "@/lib/admin/clientForm";
import type {
  AdminOptionGroupRecord,
  AdminOptionRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";
import type { OptionType } from "@/types/admin";

type OptionGroupFormState = {
  id?: string;
  isActive: boolean;
  key: string;
  name: LocalizedText;
  sortOrder: number;
};

type OptionFormState = {
  groupId: string;
  helpText: LocalizedText;
  id?: string;
  isActive: boolean;
  isRequired: boolean;
  key: string;
  label: LocalizedText;
  placeholder: LocalizedText;
  sortOrder: number;
  type: OptionType;
  valuesText: string;
};

type AdminOptionsClientProps = {
  groups: AdminOptionGroupRecord[];
  locale: AppLocale;
  options: AdminOptionRecord[];
};

type PresetKey = "customer_note" | "karat" | "name_text" | "weight_grams";

const editableLocales = ["de", "ar", "en", "fr", "tr"] as const;
const optionTypeValues: OptionType[] = [
  "text",
  "textarea",
  "number",
  "select",
  "multi_select",
  "boolean",
  "date",
  "image",
  "file",
];

function createEmptyLocalizedText(): LocalizedText {
  return {
    ar: "",
    de: "",
    en: "",
    fr: "",
    tr: "",
  };
}

function createOptionGroupForm(groups: AdminOptionGroupRecord[]): OptionGroupFormState {
  return {
    isActive: true,
    key: "",
    name: createEmptyLocalizedText(),
    sortOrder: groups.length + 1,
  };
}

function createEditGroupForm(group: AdminOptionGroupRecord): OptionGroupFormState {
  return {
    id: group.id,
    isActive: group.isActive,
    key: group.key,
    name: group.name,
    sortOrder: group.sortOrder,
  };
}

function createOptionForm(groups: AdminOptionGroupRecord[], groupId?: string): OptionFormState {
  return {
    groupId: groupId ?? groups[0]?.id ?? "",
    helpText: createEmptyLocalizedText(),
    isActive: true,
    isRequired: false,
    key: "",
    label: createEmptyLocalizedText(),
    placeholder: createEmptyLocalizedText(),
    sortOrder: 1,
    type: "text",
    valuesText: "",
  };
}

function createEditOptionForm(option: AdminOptionRecord): OptionFormState {
  return {
    groupId: option.groupId,
    helpText: option.helpText,
    id: option.id,
    isActive: option.isActive,
    isRequired: option.isRequired,
    key: option.key,
    label: option.label,
    placeholder: option.placeholder,
    sortOrder: option.sortOrder,
    type: option.type,
    valuesText: option.values.map((value) => `${value.label}:${value.value}`).join("\n"),
  };
}

function updateLocalizedText(
  current: LocalizedText,
  locale: keyof LocalizedText,
  value: string
) {
  return {
    ...current,
    [locale]: value,
  };
}

function parseOptionValues(valuesText: string) {
  return valuesText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return {
          label: line,
          value: line,
        };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((value) => value.label && value.value);
}

function getOptionsUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      addField: "إضافة حقل",
      createGroup: "إنشاء مجموعة",
      deleteFieldConfirm: "هل تريد حذف هذا الحقل من النظام؟",
      deleteGroupConfirm: "هل تريد حذف مجموعة الخيارات بالكامل؟",
      description:
        "أنشئ مجموعات خيارات واضحة، ثم أضف الحقول التي تظهر فقط مع المنتجات المرتبطة بهذه المجموعة.",
      empty: "لا توجد مجموعات خيارات بعد.",
      fieldCount: (count: number) => `${count} حقل`,
      fieldsTitle: "الحقول",
      groupFilter: "مجموعة الخيارات",
      groupHelper: "تُستخدم المجموعات لربط حقول محددة بالمنتج المناسب فقط.",
      helpTextLabel: "نص المساعدة",
      inactive: "معطل",
      keyLabel: "المفتاح",
      placeholderLabel: "النص المبدئي",
      presetCustomerNote: "ملاحظات العميل",
      presetKarat: "عيار 14 / 18 / 21",
      presetName: "اسم العميل",
      presetWeight: "الوزن بالغرام",
      presetsTitle: "إعدادات سريعة للمجوهرات",
      searchPlaceholder: "ابحث في المجموعات أو الحقول",
      sortOrderLabel: "الترتيب",
      title: "مجموعات الخيارات",
      typeLabel: "النوع",
      valuesHelper: "سطر لكل قيمة. يمكن استخدام الصيغة label:value.",
      valuesLabel: "القيم",
    };
  }

  if (locale === "de") {
    return {
      addField: "Feld anlegen",
      createGroup: "Gruppe anlegen",
      deleteFieldConfirm: "Soll dieses Feld aus dem System entfernt werden?",
      deleteGroupConfirm: "Soll diese Optionsgruppe komplett entfernt werden?",
      description:
        "Erstellen Sie klare Optionsgruppen und pflegen Sie darin nur die Felder, die zu den verknuepften Produkten gehoeren.",
      empty: "Es sind noch keine Optionsgruppen vorhanden.",
      fieldCount: (count: number) => `${count} Felder`,
      fieldsTitle: "Felder",
      groupFilter: "Optionsgruppe",
      groupHelper:
        "Gruppen werden direkt am Produkt ausgewaehlt und halten die Formulare bewusst schlank.",
      helpTextLabel: "Hilfetext",
      inactive: "Inaktiv",
      keyLabel: "Schluessel",
      placeholderLabel: "Platzhalter",
      presetCustomerNote: "Kundennotiz",
      presetKarat: "Legierung 14 / 18 / 21",
      presetName: "Namensfeld",
      presetWeight: "Gewicht in Gramm",
      presetsTitle: "Schnellvorlagen fuer Schmuck",
      searchPlaceholder: "Nach Gruppen oder Feldern suchen",
      sortOrderLabel: "Sortierung",
      title: "Optionsgruppen",
      typeLabel: "Feldtyp",
      valuesHelper: "Eine Zeile pro Wert. Optional im Format label:value.",
      valuesLabel: "Auswahlwerte",
    };
  }

  return {
    addField: "Add field",
    createGroup: "Create group",
    deleteFieldConfirm: "Remove this field from the system?",
    deleteGroupConfirm: "Remove this option group completely?",
    description:
      "Create clean option groups and keep only the fields that belong to the products using that group.",
    empty: "No option groups yet.",
    fieldCount: (count: number) => `${count} fields`,
    fieldsTitle: "Fields",
    groupFilter: "Option group",
    groupHelper:
      "Groups are selected on the product and keep customer/admin forms focused.",
    helpTextLabel: "Help text",
    inactive: "Inactive",
    keyLabel: "Key",
    placeholderLabel: "Placeholder",
    presetCustomerNote: "Customer note",
    presetKarat: "Karat 14 / 18 / 21",
    presetName: "Name field",
    presetWeight: "Weight in grams",
    presetsTitle: "Jewelry quick presets",
    searchPlaceholder: "Search groups or fields",
    sortOrderLabel: "Sort order",
    title: "Option groups",
    typeLabel: "Field type",
    valuesHelper: "One line per value. Optional format: label:value.",
    valuesLabel: "Values",
  };
}

function buildPreset(
  preset: PresetKey,
  locale: AppLocale
): Pick<OptionFormState, "helpText" | "key" | "label" | "placeholder" | "type" | "valuesText"> {
  const customerNoteDe = "Kundennotiz";
  const customerNoteAr = "ملاحظات العميل";
  const nameDe = "Name";
  const nameAr = "الاسم";
  const weightDe = "Gewicht";
  const weightAr = "الوزن";
  const karatDe = "Legierung";
  const karatAr = "العيار";

  switch (preset) {
    case "karat":
      return {
        helpText: {
          ar: "اختر العيار المناسب لهذا الطلب.",
          de: "Waehlen Sie die gewuenschte Legierung.",
          en: "",
          fr: "",
          tr: "",
        },
        key: "gold-karat",
        label: {
          ar: karatAr,
          de: karatDe,
          en: "Karat",
          fr: "",
          tr: "",
        },
        placeholder: createEmptyLocalizedText(),
        type: "select",
        valuesText: "14:14\n18:18\n21:21",
      };
    case "weight_grams":
      return {
        helpText: {
          ar: "أدخل الوزن المطلوب بالغرام.",
          de: "Gewuenschtes Gewicht in Gramm.",
          en: "",
          fr: "",
          tr: "",
        },
        key: "weight-grams",
        label: {
          ar: weightAr,
          de: weightDe,
          en: "Weight",
          fr: "",
          tr: "",
        },
        placeholder: {
          ar: "مثال: 12.5",
          de: "z. B. 12,5",
          en: "",
          fr: "",
          tr: "",
        },
        type: "number",
        valuesText: "",
      };
    case "name_text":
      return {
        helpText: {
          ar: "يمكن إدخال الاسم بأي أحرف أو رموز.",
          de: "Der Name darf beliebige Zeichen enthalten.",
          en: "",
          fr: "",
          tr: "",
        },
        key: "name-text",
        label: {
          ar: nameAr,
          de: nameDe,
          en: "Name",
          fr: "",
          tr: "",
        },
        placeholder: {
          ar: locale === "ar" ? "اكتب الاسم المطلوب" : "اكتب الاسم المطلوب",
          de: "Gewuenschten Namen eingeben",
          en: "",
          fr: "",
          tr: "",
        },
        type: "text",
        valuesText: "",
      };
    case "customer_note":
    default:
      return {
        helpText: {
          ar: "ملاحظات إضافية من العميل.",
          de: "Zusaetzliche Hinweise des Kunden.",
          en: "",
          fr: "",
          tr: "",
        },
        key: "customer-note",
        label: {
          ar: customerNoteAr,
          de: customerNoteDe,
          en: "Customer note",
          fr: "",
          tr: "",
        },
        placeholder: {
          ar: "أي تفاصيل إضافية",
          de: "Weitere Hinweise",
          en: "",
          fr: "",
          tr: "",
        },
        type: "textarea",
        valuesText: "",
      };
  }
}

function getOptionTypeLabel(type: OptionType) {
  return type.replace(/_/g, " ");
}

export function AdminOptionsClient({
  groups,
  locale,
  options,
}: AdminOptionsClientProps) {
  const t = useTranslations("Admin");
  const uiCopy = getOptionsUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [groupFormState, setGroupFormState] = useState<OptionGroupFormState>(() =>
    createOptionGroupForm(groups)
  );
  const [optionFormState, setOptionFormState] = useState<OptionFormState>(() =>
    createOptionForm(groups)
  );
  const groupEditorRef = useRef<HTMLDivElement | null>(null);
  const optionEditorRef = useRef<HTMLDivElement | null>(null);
  const requiredLabel = getRequiredFieldBadge(locale);

  useEffect(() => {
    if (showGroupForm && groupEditorRef.current) {
      scrollCardIntoView(groupEditorRef.current);
    }
  }, [showGroupForm]);

  useEffect(() => {
    if (showOptionForm && optionEditorRef.current) {
      scrollCardIntoView(optionEditorRef.current);
    }
  }, [showOptionForm, optionFormState.id]);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesGroup = groupFilter === "all" || group.id === groupFilter;

      if (!matchesGroup) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        group.displayName,
        group.key,
        ...group.options.flatMap((option) => [
          option.displayLabel,
          option.key,
          option.groupName,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [groupFilter, groups, search]);

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

  const refresh = () => {
    router.refresh();
  };

  const resetGroupForm = () => {
    setFieldErrors({});
    setGroupFormState(createOptionGroupForm(groups));
    setShowGroupForm(false);
  };

  const resetOptionForm = () => {
    setFieldErrors({});
    setOptionFormState(createOptionForm(groups));
    setShowOptionForm(false);
  };

  const openCreateGroup = () => {
    setFeedback(null);
    setFieldErrors({});
    setGroupFormState(createOptionGroupForm(groups));
    setShowGroupForm(true);
  };

  const openEditGroup = (group: AdminOptionGroupRecord) => {
    setFeedback(null);
    setFieldErrors({});
    setGroupFormState(createEditGroupForm(group));
    setShowGroupForm(true);
  };

  const openCreateField = (groupId?: string) => {
    setFeedback(null);
    setFieldErrors({});
    setOptionFormState(createOptionForm(groups, groupId));
    setShowOptionForm(true);
  };

  const openEditField = (option: AdminOptionRecord) => {
    setFeedback(null);
    setFieldErrors({});
    setOptionFormState(createEditOptionForm(option));
    setShowOptionForm(true);
  };

  const submitGroupForm = () => {
    startTransition(async () => {
      const result = await saveOptionGroupAction(locale, {
        id: groupFormState.id,
        isActive: groupFormState.isActive,
        key: groupFormState.key.trim(),
        name: groupFormState.name,
        sortOrder: Number(groupFormState.sortOrder),
      });

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback(result.message);

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      resetGroupForm();
      refresh();
    });
  };

  const submitOptionForm = () => {
    startTransition(async () => {
      const result = await saveOptionAction(locale, {
        groupId: optionFormState.groupId,
        helpText: optionFormState.helpText,
        id: optionFormState.id,
        isActive: optionFormState.isActive,
        isRequired: optionFormState.isRequired,
        key: optionFormState.key.trim(),
        label: optionFormState.label,
        placeholder: optionFormState.placeholder,
        sortOrder: Number(optionFormState.sortOrder),
        type: optionFormState.type,
        values: parseOptionValues(optionFormState.valuesText),
      });

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback(result.message);

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      resetOptionForm();
      refresh();
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!window.confirm(uiCopy.deleteGroupConfirm)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteOptionGroupAction(locale, groupId);
      setFeedback(result.message);

      if (!result.ok) {
        return;
      }

      if (groupFormState.id === groupId) {
        resetGroupForm();
      }

      if (optionFormState.groupId === groupId) {
        resetOptionForm();
      }

      refresh();
    });
  };

  const handleDeleteField = (optionId: string) => {
    if (!window.confirm(uiCopy.deleteFieldConfirm)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteOptionAction(locale, optionId);
      setFeedback(result.message);

      if (!result.ok) {
        return;
      }

      if (optionFormState.id === optionId) {
        resetOptionForm();
      }

      refresh();
    });
  };

  const applyPreset = (preset: PresetKey) => {
    const presetValues = buildPreset(preset, locale);
    setOptionFormState((current) => ({
      ...current,
      helpText: presetValues.helpText,
      key: presetValues.key,
      label: presetValues.label,
      placeholder: presetValues.placeholder,
      type: presetValues.type,
      valuesText: presetValues.valuesText,
    }));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={uiCopy.title}
        title={uiCopy.title}
        description={uiCopy.description}
        actions={
          <>
            <AdminButton variant="secondary" onClick={openCreateGroup}>
              {uiCopy.createGroup}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => openCreateField()}
              disabled={groups.length === 0}
            >
              {uiCopy.addField}
            </AdminButton>
          </>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <AdminCard title={uiCopy.groupFilter} description={uiCopy.groupHelper}>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={uiCopy.searchPlaceholder}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            label={uiCopy.groupFilter}
          >
            <option value="all">{t("common.all")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.displayName}
              </option>
            ))}
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      {showGroupForm ? (
        <div ref={groupEditorRef}>
          <AdminCard
            title={groupFormState.id ? t("buttons.edit") : uiCopy.createGroup}
            description={uiCopy.groupHelper}
            action={
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={resetGroupForm}>
                  {t("buttons.close")}
                </AdminButton>
                <AdminButton variant="primary" onClick={submitGroupForm} disabled={isPending}>
                  {t("buttons.save")}
                </AdminButton>
              </div>
            }
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminInput
                id="group.key"
                name="group.key"
                label={uiCopy.keyLabel}
                value={groupFormState.key}
                required
                requiredLabel={requiredLabel}
                errorText={fieldErrors.key}
                onChange={(event) => {
                  clearFieldError("key");
                  setGroupFormState((current) => ({
                    ...current,
                    key: event.target.value,
                  }));
                }}
              />
              <AdminInput
                id="group.sortOrder"
                name="group.sortOrder"
                label={uiCopy.sortOrderLabel}
                type="number"
                value={String(groupFormState.sortOrder)}
                onChange={(event) =>
                  setGroupFormState((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value || 0),
                  }))
                }
              />
              {editableLocales.map((language) => (
                <AdminInput
                  key={`group-name-${language}`}
                  id={`name.${language}`}
                  name={`name.${language}`}
                  label={`Name ${language.toUpperCase()}`}
                  value={groupFormState.name[language]}
                  required={language === "de" || language === "ar"}
                  requiredLabel={language === "de" || language === "ar" ? requiredLabel : undefined}
                  errorText={fieldErrors[`name.${language}`]}
                  onChange={(event) => {
                    clearFieldError(`name.${language}`);
                    setGroupFormState((current) => ({
                      ...current,
                      name: updateLocalizedText(
                        current.name,
                        language,
                        event.target.value
                      ),
                    }));
                  }}
                />
              ))}
              <div className="xl:col-span-2">
                <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={groupFormState.isActive}
                    onChange={(event) =>
                      setGroupFormState((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#c49a52]"
                  />
                  {t("common.active")}
                </label>
              </div>
            </div>
          </AdminCard>
        </div>
      ) : null}

      {showOptionForm ? (
        <div ref={optionEditorRef}>
          <AdminCard
            title={optionFormState.id ? t("buttons.edit") : uiCopy.addField}
            description={uiCopy.groupHelper}
            action={
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={resetOptionForm}>
                  {t("buttons.close")}
                </AdminButton>
                <AdminButton variant="primary" onClick={submitOptionForm} disabled={isPending}>
                  {t("buttons.save")}
                </AdminButton>
              </div>
            }
          >
            <div className="space-y-5">
              <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
                <p className="admin-label">{uiCopy.presetsTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminButton size="sm" variant="secondary" onClick={() => applyPreset("karat")}>
                    {uiCopy.presetKarat}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => applyPreset("weight_grams")}
                  >
                    {uiCopy.presetWeight}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => applyPreset("name_text")}
                  >
                    {uiCopy.presetName}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => applyPreset("customer_note")}
                  >
                    {uiCopy.presetCustomerNote}
                  </AdminButton>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <AdminSelect
                  id="groupId"
                  name="groupId"
                  label={uiCopy.groupFilter}
                  value={optionFormState.groupId}
                  errorText={fieldErrors.groupId}
                  required
                  requiredLabel={requiredLabel}
                  onChange={(event) => {
                    clearFieldError("groupId");
                    setOptionFormState((current) => ({
                      ...current,
                      groupId: event.target.value,
                    }));
                  }}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.displayName}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  id="type"
                  name="type"
                  label={uiCopy.typeLabel}
                  value={optionFormState.type}
                  onChange={(event) =>
                    setOptionFormState((current) => ({
                      ...current,
                      type: event.target.value as OptionType,
                    }))
                  }
                >
                  {optionTypeValues.map((type) => (
                    <option key={type} value={type}>
                      {getOptionTypeLabel(type)}
                    </option>
                  ))}
                </AdminSelect>
                <AdminInput
                  id="key"
                  name="key"
                  label={uiCopy.keyLabel}
                  value={optionFormState.key}
                  required
                  requiredLabel={requiredLabel}
                  errorText={fieldErrors.key}
                  onChange={(event) => {
                    clearFieldError("key");
                    setOptionFormState((current) => ({
                      ...current,
                      key: event.target.value,
                    }));
                  }}
                />
                <AdminInput
                  id="sortOrder"
                  name="sortOrder"
                  label={uiCopy.sortOrderLabel}
                  type="number"
                  value={String(optionFormState.sortOrder)}
                  onChange={(event) =>
                    setOptionFormState((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value || 0),
                    }))
                  }
                />

                {editableLocales.map((language) => (
                  <AdminInput
                    key={`option-label-${language}`}
                    id={`label.${language}`}
                    name={`label.${language}`}
                    label={`Label ${language.toUpperCase()}`}
                    value={optionFormState.label[language]}
                    required={language === "de" || language === "ar"}
                    requiredLabel={language === "de" || language === "ar" ? requiredLabel : undefined}
                    errorText={fieldErrors[`label.${language}`]}
                    onChange={(event) => {
                      clearFieldError(`label.${language}`);
                      setOptionFormState((current) => ({
                        ...current,
                        label: updateLocalizedText(
                          current.label,
                          language,
                          event.target.value
                        ),
                      }));
                    }}
                  />
                ))}

                {editableLocales.map((language) => (
                  <AdminInput
                    key={`option-placeholder-${language}`}
                    id={`placeholder.${language}`}
                    name={`placeholder.${language}`}
                    label={`${uiCopy.placeholderLabel} ${language.toUpperCase()}`}
                    value={optionFormState.placeholder[language]}
                    errorText={fieldErrors[`placeholder.${language}`]}
                    onChange={(event) => {
                      clearFieldError(`placeholder.${language}`);
                      setOptionFormState((current) => ({
                        ...current,
                        placeholder: updateLocalizedText(
                          current.placeholder,
                          language,
                          event.target.value
                        ),
                      }));
                    }}
                  />
                ))}

                {editableLocales.map((language) => (
                  <AdminTextarea
                    key={`option-help-${language}`}
                    id={`helpText.${language}`}
                    name={`helpText.${language}`}
                    label={`${uiCopy.helpTextLabel} ${language.toUpperCase()}`}
                    value={optionFormState.helpText[language]}
                    errorText={fieldErrors[`helpText.${language}`]}
                    onChange={(event) => {
                      clearFieldError(`helpText.${language}`);
                      setOptionFormState((current) => ({
                        ...current,
                        helpText: updateLocalizedText(
                          current.helpText,
                          language,
                          event.target.value
                        ),
                      }));
                    }}
                  />
                ))}

                {optionFormState.type === "select" || optionFormState.type === "multi_select" ? (
                  <div className="xl:col-span-2">
                    <AdminTextarea
                      id="values"
                      name="values"
                      label={uiCopy.valuesLabel}
                      helperText={uiCopy.valuesHelper}
                      value={optionFormState.valuesText}
                      onChange={(event) =>
                        setOptionFormState((current) => ({
                          ...current,
                          valuesText: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-5 xl:col-span-2">
                  <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={optionFormState.isRequired}
                      onChange={(event) =>
                        setOptionFormState((current) => ({
                          ...current,
                          isRequired: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#c49a52]"
                    />
                    {t("common.required")}
                  </label>
                  <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={optionFormState.isActive}
                      onChange={(event) =>
                        setOptionFormState((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#c49a52]"
                    />
                    {t("common.active")}
                  </label>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      ) : null}

      {filteredGroups.length === 0 ? (
        <AdminCard title={uiCopy.title}>
          <p className="text-sm text-muted">{uiCopy.empty}</p>
        </AdminCard>
      ) : (
        <div className="grid gap-4">
          {filteredGroups.map((group) => (
            <AdminCard
              key={group.id}
              title={group.displayName}
              description={group.key}
              action={
                <div className="flex flex-wrap gap-2">
                  <AdminBadge variant={group.isActive ? "success" : "neutral"}>
                    {group.isActive ? t("common.active") : uiCopy.inactive}
                  </AdminBadge>
                  <AdminBadge variant="gold">
                    {uiCopy.fieldCount(group.options.length)}
                  </AdminBadge>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <AdminButton size="sm" variant="secondary" onClick={() => openEditGroup(group)}>
                    {t("buttons.edit")}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="primary"
                    onClick={() => openCreateField(group.id)}
                  >
                    {uiCopy.addField}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    {t("buttons.delete")}
                  </AdminButton>
                </div>

                <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{uiCopy.fieldsTitle}</p>
                    <span className="text-xs text-muted">{group.sortOrder}</span>
                  </div>

                  {group.options.length === 0 ? (
                    <p className="text-sm text-muted">{t("options.empty")}</p>
                  ) : (
                    <div className="grid gap-3">
                      {group.options.map((option) => (
                        <div
                          key={option.id}
                          className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">
                                {option.displayLabel}
                              </p>
                              <p className="text-xs text-muted">
                                {option.key} {" · "} {getOptionTypeLabel(option.type)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <AdminBadge variant={option.isActive ? "success" : "neutral"}>
                                {option.isActive ? t("common.active") : uiCopy.inactive}
                              </AdminBadge>
                              {option.isRequired ? (
                                <AdminBadge variant="gold">{t("common.required")}</AdminBadge>
                              ) : null}
                            </div>
                          </div>

                          {(option.placeholder.de ||
                            option.placeholder.ar ||
                            option.helpText.de ||
                            option.helpText.ar ||
                            option.values.length > 0) ? (
                            <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
                              {option.placeholder.de || option.placeholder.ar ? (
                                <div>
                                  <p className="font-medium text-foreground">
                                    {uiCopy.placeholderLabel}
                                  </p>
                                  <p className="mt-1">
                                    {option.placeholder.de || option.placeholder.ar}
                                  </p>
                                </div>
                              ) : null}
                              {option.helpText.de || option.helpText.ar ? (
                                <div>
                                  <p className="font-medium text-foreground">
                                    {uiCopy.helpTextLabel}
                                  </p>
                                  <p className="mt-1">{option.helpText.de || option.helpText.ar}</p>
                                </div>
                              ) : null}
                              {option.values.length > 0 ? (
                                <div className="md:col-span-2">
                                  <p className="font-medium text-foreground">
                                    {uiCopy.valuesLabel}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {option.values.map((value) => (
                                      <AdminBadge
                                        key={`${option.id}-${value.value}`}
                                        variant="info"
                                      >
                                        {value.label}
                                      </AdminBadge>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <AdminButton
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditField(option)}
                            >
                              {t("buttons.edit")}
                            </AdminButton>
                            <AdminButton
                              size="sm"
                              variant={option.isActive ? "ghost" : "danger"}
                              onClick={() =>
                                startTransition(async () => {
                                  const result = await toggleOptionActiveAction(
                                    locale,
                                    option.id,
                                    !option.isActive
                                  );
                                  setFeedback(result.message);
                                  if (result.ok) {
                                    refresh();
                                  }
                                })
                              }
                            >
                              {option.isActive
                                ? t("buttons.deactivate")
                                : t("buttons.activate")}
                            </AdminButton>
                            <AdminButton
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteField(option.id)}
                            >
                              {t("buttons.delete")}
                            </AdminButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {options.length === 0 && groups.length === 0 ? null : undefined}
    </div>
  );
}
