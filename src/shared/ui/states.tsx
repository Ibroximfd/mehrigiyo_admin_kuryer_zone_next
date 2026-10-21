"use client";

import { CloudOff, Inbox, MapPinned, RotateCw, SearchX, TriangleAlert } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { describeError } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { cn } from "@/shared/lib/utils";

import { Button } from "./button";

/**
 * Holatlar galereyasi — har ekranda bir xil ohang:
 * skeleton · empty · no-results · error+retry · offline · ready.
 */

type StateFrameProps = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
  role?: "status" | "alert";
};

function StateFrame({ icon: Icon, title, description, action, tone = "neutral", className, role = "status" }: StateFrameProps) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl",
          tone === "danger" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-soft-ink",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-base font-semibold text-ink">{title}</p>
        {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: { title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <StateFrame icon={Inbox} {...props} />;
}

export function PickRegionState({ className }: { className?: string }) {
  const t = useT();
  return (
    <StateFrame icon={MapPinned} title={t.states.pickRegionTitle} description={t.states.pickRegionText} className={className} />
  );
}

export function NoResults({ query, onClear, className }: { query?: string; onClear?: () => void; className?: string }) {
  const t = useT();
  return (
    <StateFrame
      icon={SearchX}
      title={t.states.noResultsTitle}
      description={query ? t.states.noResultsText(query) : t.states.noResultsFilters}
      action={
        onClear ? (
          <Button variant="outline" onClick={onClear}>
            {t.common.clearFilters}
          </Button>
        ) : null
      }
      className={className}
    />
  );
}

export function ErrorState({
  error,
  onRetry,
  title,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <StateFrame
      icon={TriangleAlert}
      tone="danger"
      role="alert"
      title={title ?? t.states.errorTitle}
      description={describeError(error, t)}
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RotateCw aria-hidden />
            {t.common.retry}
          </Button>
        ) : null
      }
      className={className}
    />
  );
}

/** Neytral (qizil emas) banner — keshdagi ma'lumot ishlashda davom etadi. */
export function OfflineBanner() {
  const t = useT();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-muted">
      <CloudOff className="size-4 shrink-0" aria-hidden />
      {t.states.offline}
    </div>
  );
}

/** Kichik inline xato (ro'yxat qatori, forma osti) — retry bilan. */
export function InlineError({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useT();
  return (
    <div role="alert" className={cn("flex flex-wrap items-center gap-2 text-sm text-danger", className)}>
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span>{describeError(error, t)}</span>
      {onRetry ? (
        <Button variant="link" size="sm" onClick={onRetry} className="h-auto">
          {t.common.retry}
        </Button>
      ) : null}
    </div>
  );
}
