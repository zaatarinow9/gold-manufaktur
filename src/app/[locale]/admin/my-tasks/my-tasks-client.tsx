"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getAssignmentStatusMessageKey,
  getAssignmentStatusVariant,
} from "@/lib/admin/assignmentStatus";
import type { OrderListRecord } from "@/lib/db/orders";

type AdminMyTasksClientProps = {
  locale: AppLocale;
  orders: OrderListRecord[];
};

function useMyTasksCopy() {
  const t = useTranslations("Admin.myTasksPage");

  return {
    description: t("description"),
    empty: t("empty"),
    openTask: t("openTask"),
    searchPlaceholder: t("searchPlaceholder"),
    title: t("title"),
  };
}

export function AdminMyTasksClient({
  orders,
}: AdminMyTasksClientProps) {
  const copy = useMyTasksCopy();
  const tTask = useTranslations("Admin.taskCard");
  const t = useTranslations("Admin");
  const [search, setSearch] = useState("");
  const filteredOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return orders;
    }

    return orders.filter((order) =>
      [order.internalOrderNumber, order.previewProductName, order.trackingNumber]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [orders, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={copy.title}
        title={copy.title}
        description={copy.description}
      />

      <AdminCard>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={copy.title}
            placeholder={copy.searchPlaceholder}
            icon={<Search className="h-4 w-4" />}
          />
        </AdminToolbar>
      </AdminCard>

      {filteredOrders.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-muted">{copy.empty}</p>
        </AdminCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredOrders.map((order) => (
            <AdminCard
              key={order.id}
              title={order.internalOrderNumber}
              description={order.previewProductName || order.trackingNumber}
              action={
                <Link
                  href={`/admin/orders/${order.id}`}
                  className={getAdminButtonClassName({ variant: "secondary" })}
                >
                  {copy.openTask}
                </Link>
              }
            >
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <AdminBadge variant={getAssignmentStatusVariant(order.assignmentStatus)}>
                    {t(getAssignmentStatusMessageKey(order.assignmentStatus))}
                  </AdminBadge>
                  <AdminBadge variant="neutral">{order.dueDate || "-"}</AdminBadge>
                </div>
                <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
                  <p className="text-xs text-muted">
                    {tTask("assignmentNote")}
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {order.assignmentNote || tTask("noAssignmentNote")}
                  </p>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
