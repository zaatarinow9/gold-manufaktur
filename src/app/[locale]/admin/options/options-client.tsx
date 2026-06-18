"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  deleteOptionAction,
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
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
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

type OptionGroupFormState = {
  isActive: boolean;
  key: string;
  name: LocalizedText;
  sortOrder: number;
};

type OptionFormState = {
  groupId: string;
  id?: string;
  isActive: boolean;
  isRequired: boolean;
  key: string;
  label: LocalizedText;
  sortOrder: number;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "multi_select"
    | "boolean"
    | "date"
    | "image"
    | "file";
  valuesText: string;
};

type AdminOptionsClientProps = {
  groups: AdminOptionGroupRecord[];
  locale: AppLocale;
  options: AdminOptionRecord[];
};

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

function createOptionForm(groups: AdminOptionGroupRecord[]): OptionFormState {
  return {
    groupId: groups[0]?.id ?? "",
    isActive: true,
    isRequired: false,
    key: "",
    label: createEmptyLocalizedText(),
    sortOrder: 1,
    type: "text",
    valuesText: "",
  };
}

function createEditOptionForm(option: AdminOptionRecord): OptionFormState {
  return {
    groupId: option.groupId,
    id: option.id,
    isActive: option.isActive,
    isRequired: option.isRequired,
    key: option.key,
    label: option.label,
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
      deleteConfirm: "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u062e\u064a\u0627\u0631\u061f",
      description:
        "\u0627\u062d\u062a\u0641\u0638 \u0628\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u0644\u0644\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0641\u0642\u0637. \u0627\u0644\u0639\u064a\u0627\u0631 \u0648\u0627\u0644\u0648\u0632\u0646 \u0648\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0627\u0633\u0645 \u064a\u064f\u062f\u0627\u0631 \u0622\u0646\u0627\u064b \u0645\u0646 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0644\u062a\u0635\u0646\u064a\u0641.",
      groupHelper:
        "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u062a\u0633\u0627\u0639\u062f \u0641\u0642\u0637 \u0641\u064a \u062a\u0646\u0638\u064a\u0645 \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a.",
      openNow: "\u0645\u0641\u062a\u0648\u062d \u0627\u0644\u0622\u0646",
      slugHelper:
        "\u0627\u0633\u062a\u062e\u062f\u0645 \u0645\u0641\u062a\u0627\u062d\u0627\u064b \u0642\u0635\u064a\u0631\u0627\u064b \u0628\u0623\u062d\u0631\u0641 \u0648\u0623\u0631\u0642\u0627\u0645 \u0648\u0634\u0631\u0637\u0627\u062a.",
      valuesHelper:
        "\u0633\u0637\u0631 \u0644\u0643\u0644 \u0642\u064a\u0645\u0629. \u064a\u0645\u0643\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 label:value \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629.",
    };
  }

  if (locale === "de") {
    return {
      deleteConfirm: "Moechten Sie diese Option wirklich entfernen?",
      description:
        "Verwalten Sie hier nur wiederverwendbare Zusatzoptionen. Legierung, Gewicht und Namenspersonalisierung werden jetzt direkt ueber Auftrag und Kategorie gesteuert.",
      groupHelper: "Gruppen dienen nur zur einfachen Ordnung im Katalog.",
      openNow: "Geoeffnet",
      slugHelper: "Verwenden Sie einen kurzen Schluessel mit Buchstaben, Zahlen und Bindestrichen.",
      valuesHelper: "Eine Zeile pro Wert. Bei Bedarf im Format label:value.",
    };
  }

  return {
    deleteConfirm: "Do you really want to remove this option?",
    description:
      "Keep this screen for reusable add-ons only. Karat, weight, and name personalization now live on the order and category flow.",
    groupHelper: "Groups are only used to keep the catalog organized.",
    openNow: "Opened",
    slugHelper: "Use a short key with letters, numbers, and dashes.",
    valuesHelper: "One line per value. Use label:value when needed.",
  };
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
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
  }, [showOptionForm, editingOptionId]);

  const filteredOptions = useMemo(
    () =>
      options.filter((option) => {
        const normalizedSearch = search.toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          option.displayLabel.toLowerCase().includes(normalizedSearch) ||
          option.key.toLowerCase().includes(normalizedSearch);
        const matchesGroup = groupFilter === "all" || option.groupId === groupFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? option.isActive : !option.isActive);

        return matchesSearch && matchesGroup && matchesStatus;
      }),
    [groupFilter, options, search, statusFilter]
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

  const resetGroupForm = () => {
    setFieldErrors({});
    setGroupFormState(createOptionGroupForm(groups));
    setShowGroupForm(false);
  };

  const resetOptionForm = () => {
    setFieldErrors({});
    setEditingOptionId(null);
    setOptionFormState(createOptionForm(groups));
    setShowOptionForm(false);
  };

  const submitGroupForm = () => {
    startTransition(async () => {
      const result = await saveOptionGroupAction(locale, {
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
      router.refresh();
    });
  };

  const submitOptionForm = () => {
    const payload = {
      groupId: optionFormState.groupId,
      isActive: optionFormState.isActive,
      isRequired: optionFormState.isRequired,
      key: optionFormState.key.trim(),
      label: optionFormState.label,
      sortOrder: Number(optionFormState.sortOrder),
      type: optionFormState.type,
      values: parseOptionValues(optionFormState.valuesText),
    };

    startTransition(async () => {
      const result = optionFormState.id
        ? await saveOptionAction(locale, { ...payload, id: optionFormState.id })
        : await saveOptionAction(locale, payload);

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback(result.message);

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      resetOptionForm();
      router.refresh();
    });
  };

  const columns: AdminTableColumn<AdminOptionRecord>[] = [
    {
      id: "option",
      header: t("options.table.option"),
      cell: (option) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{option.displayLabel}</p>
          <p className="text-xs text-muted">{option.key}</p>
        </div>
      ),
    },
    {
      id: "group",
      header: t("options.table.group"),
      cell: (option) => option.groupName,
    },
    {
      id: "type",
      header: t("options.table.type"),
      cell: (option) => option.type.replace(/_/g, " "),
    },
    {
      id: "status",
      header: t("options.table.status"),
      cell: (option) => (
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant={option.isActive ? "success" : "danger"}>
            {option.isActive ? t("common.active") : t("common.inactive")}
          </AdminBadge>
          {option.isRequired ? (
            <AdminBadge variant="gold">{t("common.required")}</AdminBadge>
          ) : null}
        </div>
      ),
    },
    {
      id: "assignments",
      header: t("options.table.assignments"),
      cell: (option) => (
        <div className="space-y-1 text-sm">
          <p className="text-foreground">
            {`${option.productCount} ${t("options.productsScope")}`}
          </p>
          <p className="text-xs text-muted">
            {`${option.categoryCount} ${t("options.categoriesScope")}`}
          </p>
        </div>
      ),
    },
    {
      id: "actions",
      align: "end",
      header: t("options.table.actions"),
      cell: (option) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showOptionForm && editingOptionId === option.id ? (
            <AdminBadge variant="info">{uiCopy.openNow}</AdminBadge>
          ) : null}
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
              setFieldErrors({});
              setEditingOptionId(option.id);
              setOptionFormState(createEditOptionForm(option));
              setShowOptionForm(true);
            }}
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
                  router.refresh();
                }
              })
            }
          >
            {option.isActive ? t("buttons.deactivate") : t("buttons.activate")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="danger"
            onClick={() => {
              if (!window.confirm(uiCopy.deleteConfirm)) {
                return;
              }

              startTransition(async () => {
                const result = await deleteOptionAction(locale, option.id);
                setFeedback(result.message);
                if (result.ok) {
                  if (editingOptionId === option.id) {
                    resetOptionForm();
                  }
                  router.refresh();
                }
              });
            }}
          >
            {t("buttons.delete")}
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("options.eyebrow")}
        title={t("options.title")}
        description={uiCopy.description}
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setFieldErrors({});
                setFeedback(null);
                setGroupFormState(createOptionGroupForm(groups));
                setShowGroupForm(true);
              }}
            >
              {t("buttons.createOptionGroup")}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => {
                setFieldErrors({});
                setFeedback(null);
                setEditingOptionId("new");
                setOptionFormState(createOptionForm(groups));
                setShowOptionForm(true);
              }}
            >
              {t("buttons.addOption")}
            </AdminButton>
          </>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {showGroupForm ? (
        <div ref={groupEditorRef}>
          <AdminCard
            title={t("buttons.createOptionGroup")}
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
                label="Key"
                value={groupFormState.key}
                errorText={fieldErrors.key}
                helperText={!fieldErrors.key ? uiCopy.slugHelper : undefined}
                required
                requiredLabel={requiredLabel}
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
                label="Sort Order"
                type="number"
                value={String(groupFormState.sortOrder)}
                onChange={(event) =>
                  setGroupFormState((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value || 0),
                  }))
                }
              />
              {(["de", "ar", "en", "fr", "tr"] as const).map((language) => (
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
                      name: updateLocalizedText(current.name, language, event.target.value),
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
            title={optionFormState.id ? t("buttons.edit") : t("buttons.addOption")}
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
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminSelect
                id="groupId"
                name="groupId"
                label={t("options.table.group")}
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
                label={t("options.table.type")}
                value={optionFormState.type}
                onChange={(event) =>
                  setOptionFormState((current) => ({
                    ...current,
                    type: event.target.value as OptionFormState["type"],
                  }))
                }
              >
                <option value="text">text</option>
                <option value="textarea">textarea</option>
                <option value="number">number</option>
                <option value="select">select</option>
                <option value="multi_select">multi_select</option>
                <option value="boolean">boolean</option>
                <option value="date">date</option>
                <option value="image">image</option>
                <option value="file">file</option>
              </AdminSelect>
              <AdminInput
                id="key"
                name="key"
                label="Key"
                value={optionFormState.key}
                errorText={fieldErrors.key}
                helperText={!fieldErrors.key ? uiCopy.slugHelper : undefined}
                required
                requiredLabel={requiredLabel}
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
                label="Sort Order"
                type="number"
                value={String(optionFormState.sortOrder)}
                onChange={(event) =>
                  setOptionFormState((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value || 0),
                  }))
                }
              />
              {(["de", "ar", "en", "fr", "tr"] as const).map((language) => (
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
                      label: updateLocalizedText(current.label, language, event.target.value),
                    }));
                  }}
                />
              ))}
              <AdminTextarea
                id="values"
                name="values"
                label="Values"
                helperText={uiCopy.valuesHelper}
                value={optionFormState.valuesText}
                onChange={(event) =>
                  setOptionFormState((current) => ({
                    ...current,
                    valuesText: event.target.value,
                  }))
                }
              />
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
          </AdminCard>
        </div>
      ) : null}

      <AdminCard title={t("options.groupsTitle")} description={uiCopy.groupHelper}>
        <div className="flex flex-wrap gap-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-foreground"
            >
              {group.displayName} {" · "} {group.optionCount}
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title={t("options.filtersTitle")} description={t("options.filtersDescription")}>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("options.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            label={t("options.table.group")}
          >
            <option value="all">{t("common.all")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.displayName}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            label={t("filters.status")}
          >
            <option value="all">{t("common.all")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filteredOptions}
          getRowKey={(option) => option.id}
          cardTitle={(option) => option.displayLabel}
          emptyState={t("options.empty")}
        />
      </AdminCard>
    </div>
  );
}
