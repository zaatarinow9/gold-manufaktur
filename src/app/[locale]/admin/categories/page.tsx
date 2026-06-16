"use client";

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminReadonlyField } from "@/components/admin/AdminReadonlyField";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { managedCategories } from "@/data/adminMock";
import { getCurrentAdminUser, hasAdminRoleAccess } from "@/lib/admin/currentUser";
import type { AdminCategory } from "@/types/admin";

export default function AdminCategoriesPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const canAccess = hasAdminRoleAccess(currentUser, ["super_admin", "admin"]);
  const [categories, setCategories] = useState(managedCategories);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canAccess) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const filtered = categories.filter((category) => {
    if (!search) {
      return true;
    }

    return (
      category.name.toLowerCase().includes(search.toLowerCase()) ||
      category.slug.toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleSelected = (categoryId: string) => {
    setSelected((current) =>
      current.includes(categoryId)
        ? current.filter((value) => value !== categoryId)
        : [...current, categoryId]
    );
  };

  const updateSelection = (isActive: boolean) => {
    setCategories((current) =>
      current.map((category) =>
        selected.includes(category.id) ? { ...category, isActive } : category
      )
    );
    setFeedback(t("common.mockSubmit"));
  };

  const columns: AdminTableColumn<AdminCategory>[] = [
    {
      id: "select",
      header: t("common.selected"),
      cell: (category) => (
        <input
          type="checkbox"
          checked={selected.includes(category.id)}
          onChange={() => toggleSelected(category.id)}
          className="h-4 w-4 accent-[#c49a52]"
        />
      ),
    },
    {
      id: "category",
      header: t("categories.table.category"),
      cell: (category) => (
        <div className="flex items-center gap-3">
          <div className="relative h-[56px] w-[56px] overflow-hidden rounded-[0.9rem] border border-white/10">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">{category.name}</p>
            <p className="text-xs text-muted">{category.shortDescription}</p>
          </div>
        </div>
      ),
    },
    { id: "slug", header: t("categories.table.slug"), cell: (category) => category.slug },
    {
      id: "products",
      header: t("categories.table.products"),
      cell: (category) => category.productCount,
    },
    {
      id: "status",
      header: t("categories.table.status"),
      cell: (category) => (
        <AdminBadge variant={category.isActive ? "success" : "danger"}>
          {category.isActive ? t("common.active") : t("common.inactive")}
        </AdminBadge>
      ),
    },
    {
      id: "options",
      header: t("categories.table.options"),
      cell: (category) => `${category.assignedOptions.length}`,
    },
    {
      id: "actions",
      header: t("categories.table.actions"),
      align: "end",
      cell: (category) => (
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
            {t("buttons.options")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant={category.isActive ? "ghost" : "danger"}
            onClick={() =>
              setCategories((current) =>
                current.map((item) =>
                  item.id === category.id ? { ...item, isActive: !item.isActive } : item
                )
              )
            }
          >
            {category.isActive ? t("buttons.deactivate") : t("buttons.activate")}
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("categories.eyebrow")}
        title={t("categories.title")}
        description={t("categories.description")}
        actions={
          <AdminButton
            variant="primary"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.newCategory")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <AdminCard
        title={t("categories.bulkTitle")}
        description={t("categories.bulkDescription")}
      >
        <AdminToolbar
          actions={
            <>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => updateSelection(true)}
                disabled={selected.length === 0}
              >
                {t("buttons.bulkEnable")}
              </AdminButton>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => updateSelection(false)}
                disabled={selected.length === 0}
              >
                {t("buttons.bulkDisable")}
              </AdminButton>
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() => setFeedback(t("common.mockSubmit"))}
                disabled={selected.length === 0}
              >
                {t("buttons.assignOptions")}
              </AdminButton>
            </>
          }
        >
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("categories.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminReadonlyField
            label={t("common.selected")}
            value={t("categories.selectedCount", { count: selected.length })}
          />
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(category) => category.id}
          cardTitle={(category) => category.name}
          emptyState={t("categories.empty")}
        />
      </AdminCard>
    </div>
  );
}
