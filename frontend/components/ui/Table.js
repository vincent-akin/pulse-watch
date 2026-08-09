"use client";
import clsx from "clsx";

// columns: [{ key, header, render?(row), className? }]
export default function Table({ columns, rows, keyField = "_id", onRowClick, emptyMessage = "No results." }) {
  if (!rows || rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
            {columns.map((col) => (
              <th key={col.key} className={clsx("px-4 py-3 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx("border-b border-border/60 last:border-0", onRowClick && "cursor-pointer hover:bg-surface-elevated")}
            >
              {columns.map((col) => (
                <td key={col.key} className={clsx("px-4 py-3 align-middle", col.className)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
