"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Landmark, Scale } from "lucide-react";
import { useState } from "react";

import { inputClass } from "@/components/kit/field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInterfilialReport } from "@/features/couriers/api";
import { currentWeek, previousWeek } from "@/features/couriers/cod-week";
import type { DateRange } from "@/features/couriers/cod-week";
import {
  filialName,
  interfilialRangeError,
  interfilialRowKey,
} from "@/features/couriers/interfilial";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Filiallararo hisobot: boshqa filial kuryeri pulni bizning kassaga (yoki
 * aksincha) topshirganda filiallar orasidagi qarz. Oraliq ≤ 92 kun.
 */
export function InterfilialReportSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [range, setRange] = useState<DateRange>(() => currentWeek());
  const invalid = interfilialRangeError(range.from, range.to);

  const report = useQuery({
    queryKey: queryKeys.interfilialReport(range.from, range.to),
    queryFn: ({ signal }) => fetchInterfilialReport(range.from, range.to, signal),
    enabled: open && invalid === null,
    retry: 1,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[520px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
      >
        <div className="border-line border-b px-5 py-4 pr-12">
          <SheetTitle className="text-ink flex items-center gap-2 text-base font-semibold">
            <Scale className="text-gold size-4.5" aria-hidden />
            Filiallararo hisobot
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-meta">
            Kuryer bir filialdan, kassa boshqa filialda bo&apos;lganda — kim
            kimga qancha topshirishi kerak
          </SheetDescription>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={range.from}
              max={range.to}
              aria-label="Boshlanish sanasi"
              onChange={(event) => setRange({ ...range, from: event.target.value })}
              className={cn(inputClass, "h-9 w-auto flex-1 text-dense")}
            />
            <span className="text-ink-faint" aria-hidden>
              —
            </span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              aria-label="Tugash sanasi"
              onChange={(event) => setRange({ ...range, to: event.target.value })}
              className={cn(inputClass, "h-9 w-auto flex-1 text-dense")}
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            <Button size="xs" variant="secondary" onClick={() => setRange(currentWeek())}>
              Shu hafta
            </Button>
            <Button size="xs" variant="secondary" onClick={() => setRange(previousWeek())}>
              O&apos;tgan hafta
            </Button>
          </div>
          {invalid ? (
            <p role="alert" className="text-danger text-meta mt-1.5 font-medium">
              {invalid}
            </p>
          ) : null}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {invalid ? null : report.isPending ? (
            <div className="space-y-2" aria-busy>
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : report.isError ? (
            <ErrorView
              message={orderErrorMessage(report.error, "Filiallararo hisobotni yuklashda xatolik")}
              onRetry={() => void report.refetch()}
            />
          ) : report.data.rows.length === 0 ? (
            <EmptyView
              Icon={Landmark}
              title="Filiallararo pul yo'q"
              description="Bu oraliqda hamma kuryer pulni o'z filiali kassasiga topshirgan."
            />
          ) : (
            <>
              <ul className="space-y-2">
                {report.data.rows.map((row, index) => (
                  <li
                    key={interfilialRowKey(row, index)}
                    className="border-line flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
                  >
                    <span className="text-ink flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-dense font-semibold">
                      <span data-no-translit>{filialName(row.fromFilial)}</span>
                      <ArrowRight className="text-ink-faint size-3.5 shrink-0" aria-hidden />
                      <span data-no-translit>{filialName(row.toFilial)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-gold tabular text-dense font-semibold">
                        {formatSom(row.amount)}
                      </span>
                      <span className="text-ink-faint text-fine">
                        {`${row.handoverIds.length} ta topshirish`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-line mt-3 flex items-center justify-between border-t pt-3 text-dense">
                <span className="text-ink-muted font-medium">Jami</span>
                <span className="text-gold tabular font-bold">{formatSom(report.data.total)}</span>
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
