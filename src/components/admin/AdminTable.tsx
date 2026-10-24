import clsx from "clsx";

type Align = "end" | "start";

export type AdminTableColumn<Row> = {
  align?: Align;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  header: string;
  id: string;
};

type AdminTableProps<Row> = {
  cardTitle?: (row: Row) => React.ReactNode;
  columns: AdminTableColumn<Row>[];
  emptyState: React.ReactNode;
  getRowKey: (row: Row) => string;
  rows: Row[];
};

export function AdminTable<Row>({
  cardTitle,
  columns,
  emptyState,
  getRowKey,
  rows,
}: AdminTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className="admin-empty-state">
        {emptyState}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <div
            key={getRowKey(row)}
            className="admin-panel-raised p-4"
          >
            {cardTitle ? (
              <div className="border-b border-white/8 pb-3 text-sm font-semibold text-foreground">
                {cardTitle(row)}
              </div>
            ) : null}
            <div className={clsx("grid gap-3", cardTitle ? "pt-3" : "")}>
              {columns.map((column) => (
                <div key={column.id} className="grid gap-1">
                  <span className="text-xs font-semibold text-muted">
                    {column.header}
                  </span>
                  <div className="text-sm text-foreground">{column.cell(row)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={clsx(
                    "border-b border-white/[0.08] px-3 py-3 text-xs font-medium text-muted first:ps-0 last:pe-0",
                    column.align === "end" ? "text-end" : "text-start",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="transition hover:bg-white/[0.02]">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={clsx(
                      "border-b border-white/[0.05] px-3 py-3 align-middle text-muted first:ps-0 last:pe-0",
                      column.align === "end" ? "text-end" : "text-start",
                      column.className
                    )}
                  >
                    <div className="text-foreground">{column.cell(row)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
