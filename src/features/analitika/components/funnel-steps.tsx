"use client";

import { ArrowRight } from "lucide-react";

import { formatCompactMoney, groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import { funnelSteps, stepRate, type Funnel } from "../types";

/**
 * Voronka (dizayn 7, «3»): to'rt qadam kartochka — lid → buyurtma →
 * dostavka → yetkazildi (har qadamda soni, oldingi qadamga foizi, summasi),
 * ostida proporsional chiziqlar (otkaz ham), pastda uchta izoh: otkaz
 * sabablari, yo'lda, lid → buyurtma o'zgarishi.
 */
export function FunnelSteps({ funnel }: { funnel: Funnel }) {
  const steps = funnelSteps(funnel);
  const base = Math.max(1, funnel.leads);
  const leadToOrder = stepRate(funnel.orders, funnel.leads);
  const prev = funnel.prevLeadToOrder === null ? null : funnel.prevLeadToOrder * 100;
  const delta = prev === null ? null : leadToOrder - prev;
  const bars = [
    ...steps.map((step) => ({ key: step.key, label: step.label, value: step.value, color: step.color })),
    { key: "cancelled", label: "Otkaz", value: funnel.cancelled, color: "var(--danger)" },
  ];
  const reasons = funnel.cancelReasons
    .slice(0, 3)
    .map((reason) => `${reason.label.toLowerCase()} ${reason.count}`)
    .join(", ");

  return (
    <div>
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {steps.map((step, index) => {
          const previous = index > 0 ? steps[index - 1]!.value : null;
          const rate = previous === null ? 100 : stepRate(step.value, previous);
          const last = index === steps.length - 1;
          return (
            <li key={step.key} className="contents">
              {index > 0 ? (
                <span aria-hidden className="text-ink-faint hidden items-center lg:flex">
                  <ArrowRight className="size-5" />
                </span>
              ) : null}
              <div
                className={cn("bg-surface rounded-xl border px-3.5 py-3 text-center", index === 0 && "border-brand", last ? "border-ok bg-ok-soft" : "border-line")}
              >
                <p className="text-ink-muted text-meta">{step.label}</p>
                <p className={cn("tabular text-stat font-bold tracking-tight", last ? "text-ok" : "text-ink")}>{groupThousands(step.value)}</p>
                <p className="text-ink-muted text-meta">
                  {rate.toFixed(0)}%{step.sum !== null ? ` · ${formatCompactMoney(step.sum)} so'm` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <ol className="mt-3.5 flex flex-col gap-1.5">
        {bars.map((bar) => (
          <li key={bar.key} className="flex items-center gap-2.5">
            <span className="text-ink-muted w-36 shrink-0 text-meta">{bar.label}</span>
            <span className="bg-surface-3 relative h-6 min-w-0 flex-1 overflow-hidden rounded-md">
              {/* Kenglik — lidga nisbatan hisoblangan. */}
              <span className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${Math.max(bar.value > 0 ? 1 : 0, (bar.value / base) * 100)}%`, backgroundColor: bar.color }} />
            </span>
            <span className={cn("tabular w-16 shrink-0 text-right font-mono text-dense font-semibold", bar.key === "delivered" ? "text-ok" : bar.key === "cancelled" ? "text-danger" : "text-ink")}>
              {groupThousands(bar.value)}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3.5 grid gap-2.5 lg:grid-cols-3">
        <Callout tone="danger">
          <b className="text-danger">Otkaz: {funnel.cancelled}</b> · {formatCompactMoney(funnel.cancelledSum)} so&apos;m
          {reasons ? <span className="text-ink-muted"> — {reasons}</span> : null}
        </Callout>
        <Callout tone="warn">
          <b className="text-warn">Yo&apos;lda: {funnel.inTransit}</b>
          <span className="text-ink-muted">
            {" — hali yetkazilmagan"}
            {funnel.inTransitOver2d > 0 ? `, ${funnel.inTransitOver2d} tasi 2 kundan oshdi` : ""}
          </span>
        </Callout>
        <Callout tone="neutral">
          <b className="text-ink">Lid → buyurtma: {leadToOrder.toFixed(0)}%</b>
          <span className="text-ink-muted">
            {prev !== null && delta !== null ? ` — o'tgan davr ${prev.toFixed(0)}% (${delta >= 0 ? "+" : ""}${delta.toFixed(0)}).` : ""}
            {` ${groupThousands(funnel.leads)} lid, ${groupThousands(funnel.delivered)} yetkazildi.`}
          </span>
        </Callout>
      </div>
    </div>
  );
}

function Callout({ tone, children }: { tone: "danger" | "warn" | "neutral"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-xl border px-3.5 py-3 text-dense leading-relaxed",
        tone === "danger" && "border-danger/30 bg-danger-soft",
        tone === "warn" && "border-warn/30 bg-warn-soft",
        tone === "neutral" && "border-line bg-subtle",
      )}
    >
      {children}
    </p>
  );
}
