"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
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
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
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

export function AdminOptionsClient({
  groups,
  locale,
  options,
}: AdminOptionsClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requiredFilter, setRequiredFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [groupFormState, setGroupFormState] = useState<OptionGroupFormState>(() =>
    createOptionGroupForm(groups)
  );
  const [optionFormState, setOptionFormState] = useState<OptionFormState>(() =>
    createOptionForm(groups)
  );

  const filteredOptions = useMemo(
    () =>
      options.filter((option) => {
        const normalizedSearch = search.toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          option.displayLabel.toLowerCase().includes(normalizedSearch) ||
          option.key.toLowerCase().includes(normalizedSearch);
        const matchesGroup = groupFilter === "all" || option.groupKey === groupFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? option.isActive : !option.isActive);
        const matchesRequired =
          requiredFilter === "all" ||
          (requiredFilter === "required" ? option.isRequired : !option.isRequired);

        return matchesSearch && matchesGroup && matchesStatus && matchesRequired;
      }),
    [groupFilter, options, requiredFilter, search, statusFilter]
  );

  const resetGroupForm = () => {
    setGroupFormState(createOptionGroupForm(groups));
    setShowGroupForm(false);
  };

  const resetOptionForm = () => {
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

      setFeedback(result.message);

      if (result.ok) {
        resetGroupForm();
        router.refresh();
      }
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

      setFeedback(result.message);

      if (result.ok) {
        resetOptionForm();
        router.refresh();
      }
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
      id: "type",
      header: t("options.table.type"),
      cell: (option) => option.type,
    },
    {
      id: "group",
      header: t("options.table.group"),
      cell: (option) => option.groupName,
    },
    {
      id: "required",
      header: t("common.required"),
      cell: (option) => (
        <AdminBadge variant={option.isRequired ? "gold" : "neutral"}>
          {option.isRequired ? t("common.required") : t("common.optional")}
        </AdminBadge>
      ),
    },
    {
      id: "status",
      header: t("options.table.status"),
      cell: (option) => (
        <AdminBadge variant={option.isActive ? "success" : "danger"}>
          {option.isActive ? t("common.active") : t("common.inactive")}
        </AdminBadge>
      ),
    },
    {
      id: "assignments",
      header: t("options.table.assignments"),
      cell: (option) => (
        <div className="space-y-1">
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
      header: t("options.table.actions"),
      align: "end",
      cell: (option) => (
        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("options.eyebrow")}
        title={t("options.title")}
        description={t("options.description")}
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => {
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
                setFeedback(null);
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
        <AdminCard
          title={t("buttons.createOptionGroup")}
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
              label="Key"
              value={groupFormState.key}
              onChange={(event) =>
                setGroupFormState((current) => ({
                  ...current,
                  key: event.target.value,
                }))
              }
            />
            <AdminInput
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
                label={`Name ${language.toUpperCase()}`}
                value={groupFormState.name[language]}
                onChange={(event) =>
                  setGroupFormState((current) => ({
                    ...current,
                    name: updateLocalizedText(
                      current.name,
                      language,
                      event.target.value
                    ),
                  }))
                }
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
      ) : null}

      {showOptionForm ? (
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
              label={t("options.table.group")}
              value={optionFormState.groupId}
              onChange={(event) =>
                setOptionFormState((current) => ({
                  ...current,
                  groupId: event.target.value,
                }))
              }
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.displayName}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
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
              label="Key"
              value={optionFormState.key}
              onChange={(event) =>
                setOptionFormState((current) => ({
                  ...current,
                  key: event.target.value,
                }))
              }
            />
            <AdminInput
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
                label={`Label ${language.toUpperCase()}`}
                value={optionFormState.label[language]}
                onChange={(event) =>
                  setOptionFormState((current) => ({
                    ...current,
                    label: updateLocalizedText(
                      current.label,
                      language,
                      event.target.value
                    ),
                  }))
                }
              />
            ))}
            <AdminTextarea
              label="Values"
              helperText="One option per line. Use label:value if needed."
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
      ) : null}

      <AdminCard title={t("options.groupsTitle")} description={t("options.groupsDescription")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
            >
              <p className="font-semibold text-foreground">{group.displayName}</p>
              <p className="mt-1 text-xs text-muted">
                {group.optionCount} {t("options.groupCount")}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminTabs
          tabs={[
            { id: "all", label: t("common.all"), count: options.length },
            ...groups.map((group) => ({
              id: group.key,
              label: group.displayName,
              count: options.filter((option) => option.groupKey === group.key).length,
            })),
          ]}
          value={groupFilter}
          onChange={setGroupFilter}
        />
      </div>

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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            label={t("filters.status")}
          >
            <option value="all">{t("common.all")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </AdminSelect>
          <AdminSelect
            value={requiredFilter}
            onChange={(event) => setRequiredFilter(event.target.value)}
            label={t("common.required")}
          >
            <option value="all">{t("common.all")}</option>
            <option value="required">{t("common.required")}</option>
            <option value="optional">{t("common.optional")}</option>
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
