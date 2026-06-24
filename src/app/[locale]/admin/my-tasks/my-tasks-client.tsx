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

function getCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      description:
        "\u0627\u0637\u0644\u0639 \u0639\u0644\u0649 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0633\u0646\u062f\u0629 \u0625\u0644\u064a\u0643 \u0648\u0627\u0641\u062a\u062d \u0643\u0644 \u0637\u0644\u0628 \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u062a\u0642\u062f\u0645.",
      empty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0647\u0627\u0645 \u0645\u0633\u0646\u062f\u0629 \u0625\u0644\u064a\u0643 \u062d\u0627\u0644\u064a\u0627\u064b.",
      openTask: "\u0641\u062a\u062d \u0627\u0644\u0645\u0647\u0645\u0629",
      searchPlaceholder: "\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0623\u0648 \u0627\u0644\u0645\u0646\u062a\u062c",
      title: "\u0645\u0647\u0627\u0645\u064a",
    };
  }

  if (locale === "de") {
    return {
      description:
        "Sehen Sie nur Ihre zugewiesenen Auftraege und oeffnen Sie jede Aufgabe direkt fuer die Bearbeitung.",
      empty: "Ihnen wurden aktuell keine Aufgaben zugewiesen.",
      openTask: "Aufgabe oeffnen",
      searchPlaceholder: "Nach Auftrag oder Produkt suchen",
      title: "Meine Aufgaben",
    };
  }

  return {
    description: "Review only the orders assigned to you and open each task directly.",
    empty: "No tasks are assigned to you right now.",
    openTask: "Open task",
    searchPlaceholder: "Search by order or product",
    title: "My Tasks",
  };
}

export function AdminMyTasksClient({
  locale,
  orders,
}: AdminMyTasksClientProps) {
  const copy = getCopy(locale);
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
                    {locale === "de"
                      ? "Zuweisungshinweis"
                      : locale === "ar"
                        ? "\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u0625\u0633\u0646\u0627\u062f"
                        : "Assignment note"}
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {order.assignmentNote ||
                      (locale === "de"
                        ? "Kein Hinweis hinterlegt."
                        : locale === "ar"
                          ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0644\u0627\u062d\u0638\u0629."
                          : "No note added.")}
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
