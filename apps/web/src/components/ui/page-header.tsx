import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  backHref,
  backLabel,
  title,
  meta,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        {/* The shared labels carry a text "← " for mobile, which has no icon here. */}
        {backLabel.replace(/^←\s*/, "")}
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          {meta}
        </div>
        {actions}
      </div>
    </div>
  );
}
