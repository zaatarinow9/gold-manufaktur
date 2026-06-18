"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { adminOrders, managedProducts } from "@/data/adminMock";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentAdminUser, hasAdminRoleAccess } from "@/lib/admin/currentUser";

type ArchiveRow = {
  context: string;
  id: string;
  status: string;
  subtitle: string;
  title: string;
  type: "order" | "product";
};

function getArchiveRestoreMessage(locale: AppLocale) {
  if (locale === "de") {
    return "Die Wiederherstellung aus dem Archiv ist in dieser Ansicht noch nicht verbunden.";
  }

  if (locale === "ar") {
    return "استعادة العناصر من الأرشيف من هذه الصفحة ما زالت قيد التجهيز.";
  }

  return "Restoring archived items from this screen is not connected yet.";
}

export default function AdminArchivePage() {
  const t = useTranslations("Admin");
  const locale = useLocale() as AppLocale;
  const currentUser = getCurrentAdminUser();
  const archivedOrders = adminOrders.filter((order) => order.isArchived);
  const archivedProducts = managedProducts.filter((product) => !product.isActive);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!hasAdminRoleAccess(currentUser, ["super_admin", "admin"])) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const rows: ArchiveRow[] = [
    ...archivedOrders.map((order) => ({
      id: order.id,
      type: "order" as const,
      title: order.internalOrderNumber,
      subtitle: order.items[0]?.productName ?? "-",
      status: order.status,
      context: order.workshopName,
    })),
    ...archivedProducts.map((product) => ({
      id: product.id,
      type: "product" as const,
      title: product.name,
      subtitle: product.sku,
      status: "inactive",
      context: product.categoryName,
    })),
  ].filter((row) => {
    const query = search.toLowerCase();
    const matchesSearch =
      search.length === 0 ||
      row.title.toLowerCase().includes(query) ||
      row.subtitle.toLowerCase().includes(query) ||
      row.context.toLowerCase().includes(query);
    const matchesType = typeFilter === "all" || row.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const columns: AdminTableColumn<ArchiveRow>[] = [
    {
      id: "item",
      header: t("archive.table.item"),
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted">{row.subtitle}</p>
        </div>
      ),
    },
    {
      id: "type",
      header: t("archive.table.type"),
      cell: (row) => (
        <AdminBadge variant="neutral">
          {row.type === "order" ? t("archive.typeOrder") : t("archive.typeProduct")}
        </AdminBadge>
      ),
    },
    {
      id: "status",
      header: t("archive.table.status"),
      cell: (row) => (
        <AdminBadge variant={row.type === "order" ? "warning" : "danger"}>
          {row.type === "order" ? t(`status.${row.status}`) : t("common.inactive")}
        </AdminBadge>
      ),
    },
    {
      id: "context",
      header: t("archive.table.context"),
      cell: (row) => row.context,
    },
    {
      id: "actions",
      header: t("archive.table.actions"),
      align: "end",
      cell: () => (
        <AdminButton
          size="sm"
          variant="secondary"
          onClick={() => setFeedback(getArchiveRestoreMessage(locale))}
        >
          {t("buttons.restore")}
        </AdminButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("archive.eyebrow")}
        title={t("archive.title")}
        description={t("archive.description")}
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <AdminCard title={t("archive.filtersTitle")} description={t("archive.filtersDescription")}>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("archive.searchPlaceholder")}
          />
          <AdminSelect
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            label={t("archive.table.type")}
          >
            <option value="all">{t("common.all")}</option>
            <option value="order">{t("archive.typeOrder")}</option>
            <option value="product">{t("archive.typeProduct")}</option>
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          cardTitle={(row) => row.title}
          emptyState={t("archive.empty")}
        />
      </AdminCard>
    </div>
  );
}
