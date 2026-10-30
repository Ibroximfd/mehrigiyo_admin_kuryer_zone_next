"use client";

import { subDays } from "date-fns";
import { parseAsString, useQueryStates } from "nuqs";

import { DateRangeField } from "@/components/kit/date-range";
import { toIsoDay, todayIso } from "@/lib/format";

/**
 * Bo'lim sanasi (URLda `?from=&to=`): kassa sukuti — oxirgi 31 kun,
 * analitika — bugun (backend sukutlari bilan bir xil).
 */
export function useChiefPeriod(defaultDays: number) {
  const [range, setRange] = useQueryStates({ from: parseAsString, to: parseAsString });
  const to = range.to || todayIso();
  const from = range.from || toIsoDay(subDays(new Date(), defaultDays));
  return {
    from,
    to,
    custom: Boolean(range.from || range.to),
    set: (next: { from: string; to: string }) => void setRange({ from: next.from || null, to: next.to || null }),
    reset: () => void setRange({ from: null, to: null }),
  };
}

export function ChiefPeriodField({ period }: { period: ReturnType<typeof useChiefPeriod> }) {
  return (
    <DateRangeField
      from={period.from}
      to={period.to}
      onChange={(from, to) => period.set({ from, to })}
      onClear={period.custom ? period.reset : undefined}
    />
  );
}
