import type { ReactNode } from "react";

export type StatRow = {
  key: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

/** Two-column label/value grid used for stock overview + fundamentals metrics. */
export function StatTable({ rows }: { rows: StatRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <dl className="grid grid-cols-1 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              i % 2 === 1 ? "sm:border-l-0" : ""
            }`}
          >
            <dt className="text-sm text-text-secondary">{row.label}</dt>
            <dd className="flex flex-col items-end gap-0.5 text-right">
              <span className="tabular-nums font-medium text-text-primary">{row.value}</span>
              {row.detail}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
