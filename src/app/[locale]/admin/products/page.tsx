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
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { managedCategories, managedProducts } from "@/data/adminMock";
import {
  getCurrentAdminUser,
  hasAdminRoleAccess,
  scopeProductsForUser,
} from "@/lib/admin/currentUser";
import type { AdminProduct } from "@/types/admin";

export default function AdminProductsPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const canAccess = hasAdminRoleAccess(currentUser, ["super_admin", "admin"]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canAccess) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const scopedProducts = scopeProductsForUser(currentUser, managedProducts);
  const products = scopedProducts.filter((product) => {
    const matchesSearch =
      search.length === 0 ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.slug.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "active" && product.isActive) ||
      (tab === "inactive" && !product.isActive) ||
      (tab === "featured" && product.isFeatured);
    const matchesCategory =
      categoryFilter === "all" || product.categorySlug === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? product.isActive : !product.isActive);
    const matchesFeatured =
      featuredFilter === "all" ||
      (featuredFilter === "featured" ? product.isFeatured : !product.isFeatured);

    return (
      matchesSearch &&
      matchesTab &&
      matchesCategory &&
      matchesStatus &&
      matchesFeatured
    );
  });

  const columns: AdminTableColumn<AdminProduct>[] = [
    {
      id: "product",
      header: t("products.table.product"),
      cell: (product) => (
        <div className="flex items-center gap-3">
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[0.9rem] border border-white/10">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="72px"
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{product.name}</p>
            <p className="truncate text-xs text-muted">{product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: t("products.table.category"),
      cell: (product) => product.categoryName,
    },
    {
      id: "status",
      header: t("products.table.status"),
      cell: (product) => (
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant={product.isActive ? "success" : "danger"}>
            {product.isActive ? t("common.active") : t("common.inactive")}
          </AdminBadge>
          {product.isFeatured ? (
            <AdminBadge variant="gold">{t("products.featuredOnly")}</AdminBadge>
          ) : null}
        </div>
      ),
    },
    {
      id: "options",
      header: t("products.table.options"),
      cell: (product) => `${product.assignedOptions.length} ${t("products.optionsCount")}`,
    },
    {
      id: "visibility",
      header: t("common.visibility"),
      cell: (product) => (
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant={product.isActive ? "success" : "neutral"}>
            {product.isActive ? t("common.visible") : t("common.hidden")}
          </AdminBadge>
          {product.isFeatured ? (
            <AdminBadge variant="gold">{t("products.featuredOnly")}</AdminBadge>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      align: "end",
      header: t("products.table.actions"),
      cell: (product) => (
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
            {t("buttons.duplicate")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant={product.isActive ? "ghost" : "danger"}
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {product.isActive ? t("buttons.deactivate") : t("buttons.activate")}
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("products.eyebrow")}
        title={t("products.title")}
        description={t("products.description")}
        actions={
          <AdminButton
            variant="primary"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.addProduct")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminTabs
          tabs={[
            { id: "all", label: t("common.all"), count: scopedProducts.length },
            {
              id: "active",
              label: t("common.active"),
              count: scopedProducts.filter((product) => product.isActive).length,
            },
            {
              id: "inactive",
              label: t("common.inactive"),
              count: scopedProducts.filter((product) => !product.isActive).length,
            },
            {
              id: "featured",
              label: t("products.featuredOnly"),
              count: scopedProducts.filter((product) => product.isFeatured).length,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <p className="text-sm text-muted">
          {t("products.resultCount", { count: products.length })}
        </p>
      </div>

      <AdminCard title={t("products.filtersTitle")} description={t("products.filtersDescription")}>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("products.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            label={t("filters.category")}
          >
            <option value="all">{t("common.all")}</option>
            {managedCategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
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
          <AdminSelect
            value={featuredFilter}
            onChange={(event) => setFeaturedFilter(event.target.value)}
            label={t("filters.featured")}
          >
            <option value="all">{t("common.all")}</option>
            <option value="featured">{t("products.featuredOnly")}</option>
            <option value="regular">{t("products.regularOnly")}</option>
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={products}
          getRowKey={(product) => product.id}
          cardTitle={(product) => product.name}
          emptyState={t("products.empty")}
        />
      </AdminCard>
    </div>
  );
}
