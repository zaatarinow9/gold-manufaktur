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
            className="rounded-[1rem] border border-white/8 bg-white/4 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)]"
          >
            {cardTitle ? (
              <div className="border-b border-white/8 pb-3 text-sm font-semibold text-foreground">
                {cardTitle(row)}
              </div>
            ) : null}
            <div className={clsx("grid gap-3", cardTitle ? "pt-3" : "")}>
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="grid gap-1 rounded-[0.9rem] bg-black/22 px-3 py-3"
                >
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
                    "border-b border-white/8 px-4 py-3.5 text-xs font-semibold text-muted",
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
              <tr key={getRowKey(row)} className="align-top">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={clsx(
                      "border-b border-white/6 px-4 py-3.5 text-muted",
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
