"use client";

import { RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Yuklanish / xatolik / bo'sh holatlar uchun umumiy ko'rinishlar.
 *
 * Spinner o'rniga skeleton ishlatiladi: kontent qayerda paydo bo'lishini
 * oldindan ko'rsatgani uchun sahifa "sakramaydi" va tezroq his qilinadi.
 */

export function TableSkeleton({
  rows = 8,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-px", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="bg-surface flex items-center gap-4 px-4 py-3.5"
          style={{ opacity: 1 - index * 0.07 }}
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="hidden h-3.5 w-32 sm:block" />
          <Skeleton className="hidden h-3.5 w-24 md:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ErrorView({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <span className="bg-danger-soft rounded-2xl p-3.5">
        <TriangleAlert className="text-danger size-7" />
      </span>
      <p className="text-ink text-lg2 mt-4 font-semibold">
        Xatolik yuz berdi
      </p>
      <p className="text-ink-muted mt-1 max-w-sm text-body text-balance">
        {message}
      </p>
      {onRetry ? (
        <Button size="lg" onClick={onRetry} className="mt-5">
          <RefreshCw className="size-4" />
          Qayta urinish
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyView({
  Icon,
  title,
  description,
  action,
  className,
}: {
  Icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <span className="bg-subtle rounded-2xl p-3.5">
        <Icon className="text-ink-faint size-7" />
      </span>
      <p className="text-ink text-lg2 mt-4 font-semibold">{title}</p>
      {description ? (
        <p className="text-ink-muted mt-1 max-w-sm text-body text-balance">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
