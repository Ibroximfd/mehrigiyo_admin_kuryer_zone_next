"use client";

import { useQuery } from "@tanstack/react-query";
import { parseISO, subDays } from "date-fns";
import { HandCoins, Wallet } from "lucide-react";
import { useState } from "react";

import { DateRangeField } from "@/components/kit/date-range";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api-client";
import { formatSom, formatUzDate, toIsoDay, todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { fetchCourierCod } from "../api";
import type { CodDay } from "../types";
import { AcceptDialog } from "./accept-dialog";

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

/**
 * Kuryerning naqd hisobi (`chief/couriers/{id}/cod/`, V11): kunma-kun, e'lon
 * qilinmagan kunlar ham. Bir kunni yoki hamma ochiq kunlarni birga qabul
 * qilish mumkin (`settle {date_from, date_to}`, P4).
 */
export function CourierCodSheet({ courier, onClose }: { courier: { id: number; fullName: string }; onClose: () => void }) {
  const [range, setRange] = useState({ from: toIsoDay(subDays(new Date(), 13)), to: todayIso() });
  const [accepting, setAccepting] = useState<{ date: string; dateTo: string; amount: number } | null>(null);
  const cod = useQuery({
    queryKey: queryKeys.chiefCourierCod(courier.id, range),
    queryFn: ({ signal }) => fetchCourierCod(courier.id, range, signal),
  });
  const open = (cod.data?.days ?? []).filter((item) => !item.settled && item.amount > 0);

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg gap-0 overflow-y-auto p-0">
        <div className="border-line border-b px-5 pt-5 pb-4">
          <SheetTitle className="text-ink text-title" data-no-translit>{courier.fullName}</SheetTitle>
          <SheetDescription className="text-ink-muted mt-1 text-meta">Naqd hisobi — kunma-kun, e&apos;lon qilinmagan kunlar ham</SheetDescription>
          <DateRangeField
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from: from || range.from, to: to || range.to })}
            className="mt-3"
          />
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          {cod.isPending ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : cod.isError ? (
            <ErrorView message={errorMessage(cod.error, "Naqd hisobini yuklashda xatolik")} onRetry={() => void cod.refetch()} />
          ) : cod.data.days.length === 0 ? (
            <EmptyView Icon={Wallet} title="Bu davrda naqd yo'q" description="Kuryer naqdga yetkazgan zakazlar kunma-kun shu yerda ko'rinadi." />
          ) : (
            <>
              {open.length > 1 ? (
                <Button
                  onClick={() =>
                    setAccepting({
                      date: open[open.length - 1]!.date,
                      dateTo: open[0]!.date,
                      amount: open.reduce((sum, item) => sum + item.amount, 0),
                    })
                  }
                >
                  <HandCoins />
                  {`Hammasini qabul qilish · ${formatSom(open.reduce((sum, item) => sum + item.amount, 0))}`}
                </Button>
              ) : null}
              <ul className="border-line divide-line divide-y overflow-hidden rounded-xl border">
                {cod.data.days.map((item) => (
                  <CodDayRow key={item.date} item={item} onAccept={() => setAccepting({ date: item.date, dateTo: item.date, amount: item.amount })} />
                ))}
              </ul>
            </>
          )}
        </div>

        {accepting ? <AcceptDialog courier={courier} {...accepting} onClose={() => setAccepting(null)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function CodDayRow({ item, onAccept }: { item: CodDay; onAccept: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="text-ink block text-dense font-medium">{day(item.date)}</span>
        <span className="text-ink-faint text-meta">{`${item.orders.length} ta zakaz`}</span>
      </span>
      <span className="text-ink tabular text-dense font-semibold">{formatSom(item.amount)}</span>
      {item.settled ? (
        <StatusPill label="qabul qilindi" color="var(--ok)" size="sm" />
      ) : (
        <>
          {item.declared ? <StatusPill label="e'lon qilingan" color="var(--brand)" size="sm" /> : null}
          <Button size="sm" variant="outline" onClick={onAccept} disabled={item.amount <= 0}>
            <HandCoins />
            Qabul qilish
          </Button>
        </>
      )}
    </li>
  );
}
