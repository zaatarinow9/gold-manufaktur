"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { globalOptions, optionGroups } from "@/data/adminMock";
import {
  countOverridesForOption,
  getOptionGroupTranslationKey,
  getOptionLabelTranslationKey,
  getProductAssignments,
} from "@/lib/admin/options";
import { getCurrentAdminUser, hasAdminRoleAccess } from "@/lib/admin/currentUser";
import type { ProductOption } from "@/types/admin";

export default function AdminOptionsPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const canAccess = hasAdminRoleAccess(currentUser, ["super_admin", "admin"]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requiredFilter, setRequiredFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const getOptionLabel = (option: ProductOption) => {
    const translationKey = getOptionLabelTranslationKey(option.key);

    return translationKey ? t(translationKey) : option.label;
  };

  const getGroupLabel = (groupKey: ProductOption["groupKey"]) => {
    const translationKey = getOptionGroupTranslationKey(groupKey);
    const group = optionGroups.find((entry) => entry.key === groupKey);

    return translationKey ? t(translationKey) : group?.label ?? groupKey;
  };

  if (!canAccess) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const filteredOptions = globalOptions.filter((option) => {
    const matchesSearch =
      search.length === 0 ||
      option.label.toLowerCase().includes(search.toLowerCase()) ||
      option.key.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = groupFilter === "all" || option.groupKey === groupFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? option.isActive : !option.isActive);
    const matchesRequired =
      requiredFilter === "all" ||
      (requiredFilter === "required" ? option.isRequired : !option.isRequired);

    return matchesSearch && matchesGroup && matchesStatus && matchesRequired;
  });

  const columns: AdminTableColumn<ProductOption>[] = [
    {
      id: "option",
      header: t("options.table.option"),
      cell: (option) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{getOptionLabel(option)}</p>
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
      cell: (option) => getGroupLabel(option.groupKey),
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
      cell: (option) => {
        const assignment = getProductAssignments(option.id);
        const overrideCount = countOverridesForOption(option.id);

        return (
          <div className="space-y-1">
            <p className="text-foreground">
              {`${assignment?.productIds.length ?? 0} ${t("options.productsScope")}`}
            </p>
            <p className="text-xs text-muted">
              {`${assignment?.categorySlugs.length ?? 0} ${t("options.categoriesScope")}`}
            </p>
            {overrideCount > 0 ? (
              <p className="text-xs text-muted">
                {`${overrideCount} ${t("options.workshopOverrides")}`}
              </p>
            ) : null}
          </div>
        );
      },
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
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.edit")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.assignOptions")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant={option.isActive ? "ghost" : "danger"}
            onClick={() => setFeedback(t("common.mockSubmit"))}
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
              onClick={() => setFeedback(t("common.mockSubmit"))}
            >
              {t("buttons.createOptionGroup")}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => setFeedback(t("common.mockSubmit"))}
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

      <AdminCard title={t("options.groupsTitle")} description={t("options.groupsDescription")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {optionGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
            >
              <p className="font-semibold text-foreground">{getGroupLabel(group.key)}</p>
              <p className="mt-1 text-xs text-muted">
                {
                  globalOptions.filter((option) => option.groupKey === group.key).length
                }{" "}
                {t("options.groupCount")}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminTabs
          tabs={[
            { id: "all", label: t("common.all"), count: globalOptions.length },
            ...optionGroups.map((group) => ({
              id: group.key,
              label: getGroupLabel(group.key),
              count: globalOptions.filter((option) => option.groupKey === group.key).length,
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
          cardTitle={(option) => getOptionLabel(option)}
          emptyState={t("options.empty")}
        />
      </AdminCard>
    </div>
  );
}
