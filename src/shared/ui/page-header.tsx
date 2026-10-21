import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** Har sahifaning boshi: sarlavha, qisqa izoh va asosiy amal(lar). */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2 *:flex-1 sm:*:flex-none">{actions}</div> : null}
    </header>
  );
}
