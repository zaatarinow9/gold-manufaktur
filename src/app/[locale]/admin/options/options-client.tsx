"use client";

import clsx from "clsx";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  Eye,
  EyeOff,
  Hash,
  ListChecks,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  deleteOptionAction,
  deleteOptionGroupAction,
  saveOptionAction,
  saveOptionGroupAction,
  toggleOptionActiveAction,
} from "@/app/[locale]/admin/options/actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
import { AdminTranslationFields } from "@/components/admin/AdminTranslationFields";
import type { AppLocale } from "@/i18n/routing";
import { nextEditorKey } from "@/lib/admin/editorKey";
import type { OptionValueLabels } from "@/lib/catalog/optionValues";
import type {
  AdminOptionGroupRecord,
  AdminOptionRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";
import { localeLabels } from "@/lib/site";
import type { OptionType } from "@/types/admin";

type AdminOptionsClientProps = {
  groups: AdminOptionGroupRecord[];
  locale: AppLocale;
  options: AdminOptionRecord[];
};

/** Field types the order and inquiry forms can render. */
const fieldTypes = ["text", "textarea", "number", "select", "multi_select", "boolean", "date"] as const;
type FieldType = (typeof fieldTypes)[number];

const fieldTypeIcons: Record<FieldType, LucideIcon> = {
  boolean: CheckSquare,
  date: Calendar,
  multi_select: ListChecks,
  number: Hash,
  select: ListOrdered,
  text: Type,
  textarea: AlignLeft,
};

const presetKeys = ["engraving", "karat", "weight", "note"] as const;
type PresetKey = (typeof presetKeys)[number];

type ChoiceRow = { id: string; labels: Record<"de" | "ar", string>; extra?: OptionValueLabels; value: string };

type FieldFormState = {
  choices: ChoiceRow[];
  groupId: string;
  helpText: LocalizedText;
  id?: string;
  isActive: boolean;
  isRequired: boolean;
  key: string;
  label: LocalizedText;
  placeholder: LocalizedText;
  sortOrder: number;
  type: FieldType;
};

type GroupFormState = {
  id?: string;
  isActive: boolean;
  key: string;
  name: LocalizedText;
  sortOrder: number;
};

const emptyText = (): LocalizedText => ({ ar: "", de: "", en: "", fr: "", tr: "" });
const newRowId = () => Math.random().toString(36).slice(2, 10);

function toFieldType(type: OptionType): FieldType {
  return (fieldTypes as readonly string[]).includes(type) ? (type as FieldType) : "text";
}

function createFieldForm(option: AdminOptionRecord | null, groupId: string, sortOrder: number): FieldFormState {
  if (!option) {
    return {
      choices: [],
      groupId,
      helpText: emptyText(),
      isActive: true,
      isRequired: false,
      key: "",
      label: emptyText(),
      placeholder: emptyText(),
      sortOrder,
      type: "text",
    };
  }

  return {
    choices: option.values.map((choice) => {
      const { de, ar, ...extra } = choice.labels ?? {};
      return {
        extra,
        id: newRowId(),
        labels: { ar: ar ?? "", de: de ?? choice.label },
        value: choice.value,
      };
    }),
    groupId: option.groupId,
    helpText: { ...option.helpText },
    id: option.id,
    isActive: option.isActive,
    isRequired: option.isRequired,
    key: option.key,
    label: { ...option.label },
    placeholder: { ...option.placeholder },
    sortOrder: option.sortOrder,
    type: toFieldType(option.type),
  };
}

function FieldEditor({
  groups,
  initialState,
  locale,
  onClose,
  onSaved,
}: {
  groups: AdminOptionGroupRecord[];
  initialState: FieldFormState;
  locale: AppLocale;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const t = useTranslations("Admin.optionsPage");
  const tc = useTranslations("Admin");
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isNew = !form.id;
  const hasChoices = form.type === "select" || form.type === "multi_select";
  const hasPlaceholder = form.type === "text" || form.type === "textarea" || form.type === "number";

  const applyPreset = (preset: PresetKey) => {
    const read = (key: string) =>
      Object.fromEntries(
        (["de", "ar", "en", "fr", "tr"] as const).map((language) => [
          language,
          t(`presets.${preset}.${key}.${language}`),
        ])
      ) as LocalizedText;

    setForm((current) => ({
      ...current,
      choices:
        preset === "karat"
          ? ["14", "18", "21"].map((karat) => ({
              id: newRowId(),
              labels: { ar: karat, de: karat },
              value: karat,
            }))
          : [],
      helpText: read("help"),
      label: read("label"),
      placeholder: preset === "karat" ? emptyText() : read("placeholder"),
      type: preset === "engraving" ? "text" : preset === "karat" ? "select" : preset === "weight" ? "number" : "textarea",
    }));
    setErrors({});
  };

  const submit = () => {
    setFormMessage(null);

    if (hasChoices && form.choices.filter((choice) => choice.labels.de.trim() || choice.labels.ar.trim()).length === 0) {
      setErrors({ values: t("errors.choices") });
      setFormMessage(tc("forms.checkFields"));
      return;
    }

    startSaving(async () => {
      const values = hasChoices
        ? form.choices
            .map((choice) => {
              const de = choice.labels.de.trim();
              const ar = choice.labels.ar.trim();
              const label = de || ar;
              return {
                label,
                labels: { ...choice.extra, ar, de },
                value: choice.value.trim() || label,
              };
            })
            .filter((choice) => choice.label)
        : [];
      const payload = {
        groupId: form.groupId,
        helpText: form.helpText,
        isActive: form.isActive,
        isRequired: form.isRequired,
        key: form.key,
        label: form.label,
        placeholder: hasPlaceholder ? form.placeholder : emptyText(),
        sortOrder: form.sortOrder,
        type: form.type,
        values,
      };
      const result = await saveOptionAction(locale, form.id ? { ...payload, id: form.id } : payload);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormMessage(result.message);
        return;
      }

      onSaved(result.message);
    });
  };

  const updateText = (fieldKey: string, fieldLocale: AppLocale, value: string) => {
    const key = fieldKey as "label" | "helpText" | "placeholder";
    setForm((current) => ({ ...current, [key]: { ...current[key], [fieldLocale]: value } }));
    setErrors((current) => {
      const errorKey = `${fieldKey}.${fieldLocale}`;
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      title={isNew ? t("fieldTitleNew") : t("fieldTitleEdit")}
      description={t("fieldDescription")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {formMessage ? (
            <p role="alert" className="text-sm text-rose-300">{formMessage}</p>
          ) : (
            <span className="text-xs text-muted">{tc("productEditor.requiredHint")}</span>
          )}
          <div className="ms-auto flex gap-2">
            <AdminButton variant="ghost" onClick={onClose}>{tc("buttons.cancel")}</AdminButton>
            <AdminButton variant="primary" onClick={submit} disabled={isSaving}>
              {isSaving ? tc("productEditor.saving") : isNew ? t("addField") : tc("productEditor.save")}
            </AdminButton>
          </div>
        </div>
      }
    >
      {isNew ? (
        <AdminFormSection title={t("presetsTitle")} hint={t("presetsHint")}>
          <div className="flex flex-wrap gap-2">
            {presetKeys.map((preset) => (
              <button key={preset} type="button" className="admin-chip" onClick={() => applyPreset(preset)}>
                {t(`presets.${preset}.name`)}
              </button>
            ))}
          </div>
        </AdminFormSection>
      ) : null}

      <AdminFormSection title={t("typeTitle")}>
        <div role="radiogroup" aria-label={t("typeTitle")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {fieldTypes.map((type) => {
            const Icon = fieldTypeIcons[type];
            const selected = form.type === type;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setForm((current) => ({ ...current, type }))}
                className={clsx(
                  "flex flex-col items-start gap-1.5 rounded-[0.625rem] border px-3 py-2.5 text-start text-sm transition",
                  selected
                    ? "border-gold/45 bg-gold/10 text-foreground"
                    : "border-white/10 text-muted hover:border-white/20 hover:text-foreground"
                )}
              >
                <Icon className={clsx("h-4 w-4", selected && "text-gold-soft")} />
                <span className="font-medium">{t(`types.${type}`)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted">{t(`typeHints.${form.type}`)}</p>
      </AdminFormSection>

      <AdminFormSection title={t("questionTitle")} hint={t("questionHint")}>
        <AdminTranslationFields
          errors={errors}
          onChange={updateText}
          fields={[
            { key: "label", label: t("labelLabel"), required: true, value: form.label },
            { key: "helpText", label: t("helpLabel"), value: form.helpText },
            ...(hasPlaceholder ? [{ key: "placeholder", label: t("placeholderLabel"), value: form.placeholder }] : []),
          ]}
        />
      </AdminFormSection>

      {hasChoices ? (
        <AdminFormSection title={t("choicesTitle")} hint={t("choicesHint")}>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted sm:grid">
              <span>{localeLabels[locale === "ar" ? "ar" : "de"]}</span>
              <span>{localeLabels[locale === "ar" ? "de" : "ar"]}</span>
            </div>
            {form.choices.map((choice, index) => {
              const order = locale === "ar" ? (["ar", "de"] as const) : (["de", "ar"] as const);
              return (
                <div key={choice.id} className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-2">
                  {order.map((language) => (
                    <input
                      key={language}
                      className="admin-input"
                      dir={language === "ar" ? "rtl" : "ltr"}
                      lang={language}
                      aria-label={`${t("choiceLabel", { number: index + 1 })} – ${localeLabels[language]}`}
                      value={choice.labels[language]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          choices: current.choices.map((row) =>
                            row.id === choice.id
                              ? { ...row, labels: { ...row.labels, [language]: event.target.value } }
                              : row
                          ),
                        }))
                      }
                    />
                  ))}
                  <button
                    type="button"
                    className="admin-icon-button admin-icon-button-quiet"
                    aria-label={t("removeChoice", { number: index + 1 })}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        choices: current.choices.filter((row) => row.id !== choice.id),
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <AdminButton
              size="sm"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  choices: [...current.choices, { id: newRowId(), labels: { ar: "", de: "" }, value: "" }],
                }))
              }
            >
              <Plus />
              {t("addChoice")}
            </AdminButton>
            {errors.values ? (
              <p role="alert" className="text-sm text-rose-300">{errors.values}</p>
            ) : null}
          </div>
        </AdminFormSection>
      ) : null}

      <AdminFormSection title={t("settingsTitle")}>
        <div className="space-y-3">
          {groups.length > 1 ? (
            <label className="block space-y-1.5">
              <span className="admin-label">{t("groupLabel")}</span>
              <select
                className="admin-select"
                value={form.groupId}
                onChange={(event) => setForm((current) => ({ ...current, groupId: event.target.value }))}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.displayName}</option>
                ))}
              </select>
            </label>
          ) : null}
          <AdminSwitch
            checked={form.isRequired}
            onChange={(checked) => setForm((current) => ({ ...current, isRequired: checked }))}
            label={t("requiredLabel")}
            description={t("requiredHint")}
          />
          <AdminSwitch
            checked={form.isActive}
            onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            label={t("activeLabel")}
            description={t("activeHint")}
          />
        </div>
      </AdminFormSection>
    </AdminDrawer>
  );
}

function GroupEditor({
  initialState,
  locale,
  onClose,
  onSaved,
}: {
  initialState: GroupFormState;
  locale: AppLocale;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const t = useTranslations("Admin.optionsPage");
  const tc = useTranslations("Admin");
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isNew = !form.id;

  const submit = () => {
    setFormMessage(null);
    startSaving(async () => {
      const payload = { isActive: form.isActive, key: form.key, name: form.name, sortOrder: form.sortOrder };
      const result = await saveOptionGroupAction(locale, form.id ? { ...payload, id: form.id } : payload);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormMessage(result.message);
        return;
      }
      onSaved(result.message);
    });
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      title={isNew ? t("groupTitleNew") : t("groupTitleEdit")}
      description={t("groupDescription")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {formMessage ? <p role="alert" className="text-sm text-rose-300">{formMessage}</p> : <span />}
          <div className="ms-auto flex gap-2">
            <AdminButton variant="ghost" onClick={onClose}>{tc("buttons.cancel")}</AdminButton>
            <AdminButton variant="primary" onClick={submit} disabled={isSaving}>
              {isSaving ? tc("productEditor.saving") : isNew ? t("addGroup") : tc("productEditor.save")}
            </AdminButton>
          </div>
        </div>
      }
    >
      <AdminFormSection title={t("groupNameTitle")} hint={t("groupNameHint")}>
        <AdminTranslationFields
          errors={errors}
          fields={[{ key: "name", label: t("groupNameLabel"), required: true, value: form.name }]}
          onChange={(_fieldKey, fieldLocale, value) =>
            setForm((current) => ({ ...current, name: { ...current.name, [fieldLocale]: value } }))
          }
        />
      </AdminFormSection>
      <AdminFormSection title={t("settingsTitle")}>
        <AdminSwitch
          checked={form.isActive}
          onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
          label={t("activeLabel")}
          description={t("groupActiveHint")}
        />
      </AdminFormSection>
    </AdminDrawer>
  );
}

export function AdminOptionsClient({ groups, locale }: AdminOptionsClientProps) {
  const t = useTranslations("Admin.optionsPage");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [fieldEditor, setFieldEditor] = useState<{ key: string; state: FieldFormState } | null>(null);
  const [groupEditor, setGroupEditor] = useState<{ key: string; state: GroupFormState } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const sortedGroups = [...groups].sort((left, right) => left.sortOrder - right.sortOrder);

  const runAction = (task: () => Promise<{ message: string; ok: boolean }>) => {
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  };

  const onSaved = (message: string) => {
    setFieldEditor(null);
    setGroupEditor(null);
    setFeedback({ message, tone: "success" });
    router.refresh();
  };

  const openGroup = (group: AdminOptionGroupRecord | null) => {
    setFeedback(null);
    setGroupEditor({
      key: group?.id ?? nextEditorKey(),
      state: group
        ? { id: group.id, isActive: group.isActive, key: group.key, name: { ...group.name }, sortOrder: group.sortOrder }
        : { isActive: true, key: "", name: emptyText(), sortOrder: groups.length + 1 },
    });
  };

  const openField = (group: AdminOptionGroupRecord, option: AdminOptionRecord | null) => {
    setFeedback(null);
    setFieldEditor({
      key: option?.id ?? nextEditorKey(),
      state: createFieldForm(option, group.id, group.options.length + 1),
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <AdminButton variant="primary" onClick={() => openGroup(null)}>
            <Plus />
            {t("addGroup")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">{feedback.message}</div>
      ) : null}

      {sortedGroups.length === 0 ? (
        <AdminEmptyState
          title={t("emptyTitle")}
          description={t("emptyText")}
          action={
            <AdminButton variant="primary" onClick={() => openGroup(null)}>
              <Plus />
              {t("addGroup")}
            </AdminButton>
          }
        />
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => {
            const isOpen = expanded[group.id] ?? true;
            const options = [...group.options].sort((left, right) => left.sortOrder - right.sortOrder);
            const productCount = Math.max(0, ...options.map((option) => option.productCount));

            return (
              <section key={group.id} className={clsx("admin-panel", !group.isActive && "opacity-75")}>
                <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded((current) => ({ ...current, [group.id]: !isOpen }))}
                  >
                    <ChevronDown className={clsx("h-4 w-4 shrink-0 text-muted transition", !isOpen && "-rotate-90 rtl:rotate-90")} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{group.displayName}</span>
                      <span className="block text-sm text-muted">
                        {t("groupSummary", { fields: options.length, products: productCount })}
                        {!group.isActive ? ` · ${tc("productsPage.hiddenBadge")}` : ""}
                      </span>
                    </span>
                  </button>
                  <AdminButton size="sm" onClick={() => openField(group, null)}>
                    <Plus />
                    <span className="hidden sm:inline">{t("addField")}</span>
                  </AdminButton>
                  <AdminActionMenu
                    label={tc("productsPage.moreActions", { name: group.displayName })}
                    items={[
                      { icon: Pencil, label: t("renameGroup"), onSelect: () => openGroup(group) },
                      {
                        danger: true,
                        icon: Trash2,
                        label: t("deleteGroup"),
                        onSelect: () => {
                          if (window.confirm(t("deleteGroupConfirm", { name: group.displayName }))) {
                            runAction(() => deleteOptionGroupAction(locale, group.id));
                          }
                        },
                      },
                    ]}
                  />
                </header>

                {isOpen ? (
                  options.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-muted">
                      {t("groupEmpty")}{" "}
                      <button type="button" className="font-medium text-gold-soft hover:underline" onClick={() => openField(group, null)}>
                        {t("addField")}
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/[0.05]">
                      {options.map((option) => {
                        const type = toFieldType(option.type);
                        const Icon = fieldTypeIcons[type];
                        return (
                          <li key={option.id} className={clsx("flex items-center gap-3 px-4 py-3", !option.isActive && "opacity-60")}>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-gold-soft">
                              <Icon className="h-4 w-4" />
                            </span>
                            <button type="button" className="min-w-0 flex-1 text-start" onClick={() => openField(group, option)}>
                              <span className="block truncate font-medium text-foreground">{option.displayLabel}</span>
                              <span className="block truncate text-sm text-muted">
                                {t(`types.${type}`)}
                                {option.values.length > 0 ? ` · ${option.values.map((value) => value.label).join(", ")}` : ""}
                              </span>
                            </button>
                            <span className="hidden flex-wrap gap-1.5 sm:flex">
                              {option.isRequired ? <AdminBadge variant="gold">{t("requiredBadge")}</AdminBadge> : null}
                              {!option.isActive ? <AdminBadge>{tc("productsPage.hiddenBadge")}</AdminBadge> : null}
                            </span>
                            <AdminActionMenu
                              label={tc("productsPage.moreActions", { name: option.displayLabel })}
                              items={[
                                { icon: Pencil, label: tc("buttons.edit"), onSelect: () => openField(group, option) },
                                {
                                  icon: option.isActive ? EyeOff : Eye,
                                  label: option.isActive ? t("hideField") : t("showField"),
                                  onSelect: () => runAction(() => toggleOptionActiveAction(locale, option.id, !option.isActive)),
                                },
                                {
                                  danger: true,
                                  icon: Trash2,
                                  label: tc("buttons.delete"),
                                  onSelect: () => {
                                    if (window.confirm(t("deleteFieldConfirm", { name: option.displayLabel }))) {
                                      runAction(() => deleteOptionAction(locale, option.id));
                                    }
                                  },
                                },
                              ]}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {fieldEditor ? (
        <FieldEditor
          key={fieldEditor.key}
          groups={groups}
          locale={locale}
          initialState={fieldEditor.state}
          onClose={() => setFieldEditor(null)}
          onSaved={onSaved}
        />
      ) : null}
      {groupEditor ? (
        <GroupEditor
          key={groupEditor.key}
          locale={locale}
          initialState={groupEditor.state}
          onClose={() => setGroupEditor(null)}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}
