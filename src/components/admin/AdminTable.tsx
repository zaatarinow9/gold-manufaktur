import clsx from "clsx";

type Align = "end" | "start";

export type AdminTableColumn<Row> = {
  align?: Align;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  header: React.ReactNode;
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
      {/* Phones: one card per row. The first column is the card heading, the
          trailing actions column sits at the bottom, everything else is a
          label/value line. */}
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => {
          const [lead, ...rest] = columns;
          const actions = rest.filter((column) => column.id === "action" || column.id === "actions");
          const fields = rest.filter((column) => !actions.includes(column));

          return (
            <div key={getRowKey(row)} className="admin-panel-raised p-4">
              <div className="text-sm text-foreground">{lead ? lead.cell(row) : cardTitle?.(row)}</div>
              {fields.length > 0 ? (
                <dl className="mt-3 grid gap-2.5 border-t border-white/8 pt-3">
                  {fields.map((column) => (
                    <div key={column.id} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3">
                      <dt className="text-xs font-medium text-muted">{column.header}</dt>
                      <dd className="min-w-0 text-sm text-foreground">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {actions.map((column) => (
                <div key={column.id} className="mt-3 border-t border-white/8 pt-3">
                  {column.cell(row)}
                </div>
              ))}
            </div>
          );
        })}
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
