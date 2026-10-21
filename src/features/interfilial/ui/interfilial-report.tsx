"use client";

import { ArrowRight, CalendarRange } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";

import { useIsWideScreen } from "@/shared/hooks/use-media-query";
import { useT } from "@/shared/i18n/locale";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { Skeleton } from "@/shared/ui/skeleton";

import { useInterfilialReport } from "../hooks/use-interfilial-report";
import {
  MAX_RANGE_DAYS,
  RANGE_PRESETS,
  defaultRange,
  presetRange,
  rangeLengthDays,
  sameRange,
  validateRange,
  type DateRange,
} from "../model/date-range";
import { sortRowsByAmount, type InterfilialRow } from "../model/report";

/** Oraliq URL'da (`?from=&to=`) — sukut: joriy oy boshidan bugungacha. */
function useReportRange() {
  const [today] = useState(() => new Date());
  const fallback = useMemo(() => defaultRange(today), [today]);
  const [params, setParams] = useQueryStates(
    { from: parseAsString.withDefault(fallback.from), to: parseAsString.withDefault(fallback.to) },
    { history: "replace" },
  );
  const range: DateRange = { from: params.from, to: params.to };
  return { today, range, setRange: (next: DateRange) => void setParams(next) };
}

export function InterfilialReportView() {
  const t = useT();
  const { today, range, setRange } = useReportRange();
  const validation = validateRange(range);
  const report = useInterfilialReport(range, validation === "ok");
  const days = rangeLengthDays(range);
  const rows = useMemo(() => sortRowsByAmount(report.data?.rows ?? []), [report.data]);

  const rangeError =
    validation === "ok"
      ? null
      : validation === "tooLong"
        ? t.interfilial.rangeErrors.tooLong(MAX_RANGE_DAYS)
        : t.interfilial.rangeErrors[validation];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.interfilial.title}>
          {RANGE_PRESETS.map((preset) => {
            const presetValue = presetRange(preset, today);
            const active = sameRange(presetValue, range);
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => setRange(presetValue)}
                className={cn(
                  "min-h-10 rounded-full border px-3.5 text-sm transition outline-none sm:min-h-9",
                  "focus-visible:ring-3 focus-visible:ring-ring/40",
                  active ? "border-brand bg-brand-soft text-brand-soft-ink" : "border-line-strong text-ink-muted hover:bg-surface-2",
                )}
              >
                {t.interfilial.presets[preset]}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-from">{t.interfilial.from}</Label>
            <Input
              id="report-from"
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(event) => setRange({ ...range, from: event.target.value })}
              aria-invalid={rangeError ? true : undefined}
              aria-describedby={rangeError ? "report-range-error" : undefined}
              className="sm:w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-to">{t.interfilial.to}</Label>
            <Input
              id="report-to"
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(event) => setRange({ ...range, to: event.target.value })}
              aria-invalid={rangeError ? true : undefined}
              aria-describedby={rangeError ? "report-range-error" : undefined}
              className="sm:w-44"
            />
          </div>
          {days !== null && days > 0 ? (
            <p className="col-span-2 flex items-center gap-1.5 text-sm text-ink-muted tabular sm:pb-2.5">
              <CalendarRange className="size-4" aria-hidden />
              {t.interfilial.rangeDays(days)}
            </p>
          ) : null}
        </div>
        {rangeError ? (
          <p id="report-range-error" role="alert" className="text-sm font-medium text-danger">
            {rangeError}
          </p>
        ) : null}
      </Card>

      {validation !== "ok" ? null : report.isPending ? (
        <ReportSkeleton />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={t.interfilial.emptyTitle} description={t.interfilial.emptyText} />
      ) : (
        <div className={cn("flex flex-col gap-4 transition-opacity", report.isPlaceholderData && "opacity-60")}>
          <ReportSummary total={report.data.total} handoverCount={report.data.handoverCount} from={report.data.dateFrom} to={report.data.dateTo} />
          <ReportRows rows={rows} total={report.data.total} />
        </div>
      )}
    </div>
  );
}

function ReportSummary({ total, handoverCount, from, to }: { total: number; handoverCount: number; from: string; to: string }) {
  const t = useT();
  return (
    <Card className="flex flex-col gap-1 p-5">
      <p className="text-sm text-ink-muted">
        {t.interfilial.total} · {formatDate(from)} — {formatDate(to)}
      </p>
      <p className="text-3xl font-semibold tracking-tight text-ink tabular">
        {formatAmount(total)} <span className="text-base font-normal text-ink-muted">{t.common.sum}</span>
      </p>
      <p className="text-sm text-ink-faint tabular">{t.interfilial.handoverCount(handoverCount)}</p>
    </Card>
  );
}

function ReportRows({ rows, total }: { rows: readonly InterfilialRow[]; total: number }) {
  const t = useT();
  const isWide = useIsWideScreen();

  if (!isWide) {
    return (
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <li key={`${row.from.id}-${row.to.id}`}>
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.from.name}</span>
                <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-label={t.interfilial.arrow} />
                <span className="min-w-0 flex-1 truncate text-right font-medium text-ink">{row.to.name}</span>
              </div>
              <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
                <span className="text-xs text-ink-faint tabular">{t.interfilial.handoverCount(row.handoverCount)}</span>
                <span className="text-lg font-semibold text-ink tabular">
                  {formatAmount(row.amount)} <span className="text-xs font-normal text-ink-muted">{t.common.sum}</span>
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-2 text-left text-xs font-medium text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3">{t.interfilial.fromFilial}</th>
            <th scope="col" className="w-10 px-2 py-3">
              <span className="sr-only">{t.interfilial.arrow}</span>
            </th>
            <th scope="col" className="px-4 py-3">{t.interfilial.toFilial}</th>
            <th scope="col" className="px-4 py-3 text-right">{t.interfilial.handovers}</th>
            <th scope="col" className="px-4 py-3 text-right">{t.interfilial.amount}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={`${row.from.id}-${row.to.id}`}>
              <td className="px-4 py-3 font-medium text-ink">{row.from.name}</td>
              <td className="px-2 py-3 text-ink-faint">
                <ArrowRight className="size-4" aria-hidden />
              </td>
              <td className="px-4 py-3 font-medium text-ink">{row.to.name}</td>
              <td className="px-4 py-3 text-right text-ink-muted tabular">{row.handoverCount}</td>
              <td className="px-4 py-3 text-right font-semibold text-ink tabular">{formatAmount(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-line-strong bg-surface-2">
          <tr>
            <th scope="row" colSpan={4} className="px-4 py-3 text-left font-semibold">
              {t.interfilial.total}
            </th>
            <td className="px-4 py-3 text-right font-semibold text-ink tabular">
              {formatAmount(total)} {t.common.sum}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-28 rounded-xl" />
      <Card className="divide-y divide-line">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </Card>
    </div>
  );
}
