/** Pulsing placeholder block — sized via className (e.g. "h-4 w-24"). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-hover ${className}`} />;
}

/** Placeholder for a StatTable (label/value grid) while its data loads. */
export function StatTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <dl className="grid grid-cols-1 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Placeholder for a short block of paragraph text (AI report cards, etc.). */
export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-full", "w-2/3"];
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
