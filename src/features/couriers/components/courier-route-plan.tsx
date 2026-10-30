import { Route } from "lucide-react";

import { routePlanReasonLabel, routePlanSummary } from "@/features/couriers/route-plan";
import type { RoutePlan } from "@/features/couriers/route-plan";
import { formatShortDateTime } from "@/lib/format";

/**
 * Kuryer kartasidagi marshrut rejasi qatori (2026-10-16 B3):
 * "~12 km · 9 manzil · ~45 daq · yo'l bo'yicha · 10:32" + sabab
 * (avto/qo'lda/qayta). Reja yo'q — qator ham yo'q.
 */
export function CourierRoutePlan({ plan }: { plan: RoutePlan | null }) {
  if (!plan) return null;
  const summary = routePlanSummary(plan);
  if (!summary) return null;
  const reason = routePlanReasonLabel(plan);

  return (
    <p
      className="text-ink-muted mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta"
      title={
        plan.createdAt
          ? `Ilova tasdiqlagan marshrut · ${formatShortDateTime(plan.createdAt)}`
          : "Ilova tasdiqlagan marshrut"
      }
    >
      <Route className="text-brand size-3.5 shrink-0" aria-hidden />
      <span className="tabular">{summary}</span>
      {reason ? (
        <span className="bg-subtle text-ink-muted rounded-md px-1.5 py-px text-fine font-medium">
          {reason}
        </span>
      ) : null}
    </p>
  );
}
