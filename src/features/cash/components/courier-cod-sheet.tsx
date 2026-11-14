"use client";

import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { ChevronDown, HandCoins, Wallet } from "lucide-react";
import { useState } from "react";

import { DateRangeField } from "@/components/kit/date-range";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api-client";
import { formatSom, formatUzDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { fetchCourierCod, fetchCourierOpenCod } from "../api";
import { clampCodRange, COD_WINDOW_DAYS, codWindow, isDayOverdue } from "../courier-debts";
import type { CodDay, CourierCod } from "../types";
import { AcceptDialog } from "./accept-dialog";

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

type Mode = "open" | "history";
type Accepting = { date: string; dateTo: string; amount: number };

/**
 * Kuryerning naqd hisobi. Sukut — «Qabul qilinmagan»: HAMMA ochiq kunlar, muddat
 * cheklovisiz (`cod/?open=1`, 59-javob B2; eski serverda oxirgi 31 kun). «Tarix» —
 * sana oralig'i (31 kungacha), qabul qilingan kunlar ham. Kun bosilsa zakazlari
 * ochiladi. Telefonda «Hammasini qabul qilish» pastda doim ko'rinib turadi.
 */
export function CourierCodSheet({
  courier,
  canAccept,
  onClose,
}: {
  courier: { id: number; fullName: string };
  canAccept: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("open");
  const [range, setRange] = useState(() => codWindow(new Date()));
  const [clamped, setClamped] = useState(false);
  const [accepting, setAccepting] = useState<Accepting | null>(null);

  const openCod = useQuery({
    queryKey: queryKeys.chiefCourierOpenCod(courier.id),
    queryFn: ({ signal }) => fetchCourierOpenCod(courier.id, signal),
  });
  const history = useQuery({
    queryKey: queryKeys.chiefCourierCod(courier.id, range),
    queryFn: ({ signal }) => fetchCourierCod(courier.id, range, signal),
    enabled: mode === "history",
  });
  const query = mode === "open" ? openCod : history;
  const openDays = (openCod.data?.days ?? []).filter((item) => !item.settled && item.amount > 0);
  const openTotal = openDays.reduce((sum, item) => sum + item.amount, 0);
  const today = new Date();
  const overdueTotal = openDays.filter((item) => isDayOverdue(item.date, today)).reduce((sum, item) => sum + item.amount, 0);
  // Kunlar yangi birinchi keladi: eng eskisi — oxirida.
  const acceptAll =
    canAccept && openDays.length > 1
      ? { date: openDays[openDays.length - 1]!.date, dateTo: openDays[0]!.date, amount: openTotal }
      : null;

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg gap-0 p-0">
        <div className="border-line border-b px-4 pt-5 pb-3 sm:px-5">
          <SheetTitle className="text-ink pr-8 text-title" data-no-translit>{courier.fullName}</SheetTitle>
          <SheetDescription className="text-ink-muted mt-1 text-meta">Naqd hisobi — kunma-kun, e&apos;lon qilinmagan kunlar ham</SheetDescription>
          {openCod.data ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Figure label="Qabul qilinmagan" value={formatSom(openTotal)} hint={`${openDays.length} kun`} />
              <Figure
                label="Muddati o'tgan"
                value={formatSom(overdueTotal)}
                tone={overdueTotal > 0 ? "danger" : undefined}
                hint={openCod.data.shortageDebt > 0 ? `kamomad ${formatSom(openCod.data.shortageDebt)}` : undefined}
              />
            </div>
          ) : null}
          <div role="tablist" aria-label="Ko'rinish" className="bg-subtle mt-3 grid grid-cols-2 gap-0.5 rounded-lg p-0.5">
            <ModeTab active={mode === "open"} onClick={() => setMode("open")}>
              Qabul qilinmagan
            </ModeTab>
            <ModeTab active={mode === "history"} onClick={() => setMode("history")}>
              Tarix
            </ModeTab>
          </div>
          {mode === "history" ? (
            <>
              <DateRangeField
                from={range.from}
                to={range.to}
                onChange={(from, to) => {
                  const next = clampCodRange(from || range.from, to || range.to);
                  setClamped(next.clamped);
                  setRange({ from: next.from, to: next.to });
                }}
                className="mt-3"
              />
              {clamped ? (
                <p className="text-warn mt-1.5 text-meta">{`Bir martada ko'pi bilan ${COD_WINDOW_DAYS} kun — boshlanish surildi.`}</p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {query.isPending ? (
            <div className="flex flex-col gap-2" aria-label="Yuklanmoqda">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : query.isError ? (
            <ErrorView message={errorMessage(query.error, "Naqd hisobini yuklashda xatolik")} onRetry={() => void query.refetch()} />
          ) : (
            <DayList
              cod={query.data}
              mode={mode}
              onAccept={canAccept ? (item) => setAccepting({ date: item.date, dateTo: item.date, amount: item.amount }) : null}
            />
          )}
        </div>

        {mode === "open" && acceptAll ? (
          <div className="border-line bg-surface pb-safe border-t">
            <div className="px-4 py-3 sm:px-5">
              <Button className="w-full" onClick={() => setAccepting(acceptAll)}>
                <HandCoins />
                {`Hammasini qabul qilish · ${formatSom(acceptAll.amount)}`}
              </Button>
            </div>
          </div>
        ) : null}

        {accepting ? <AcceptDialog courier={courier} {...accepting} onClose={() => setAccepting(null)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DayList({ cod, mode, onAccept }: { cod: CourierCod; mode: Mode; onAccept: ((item: CodDay) => void) | null }) {
  const days = mode === "open" ? cod.days.filter((item) => !item.settled && item.amount > 0) : cod.days;
  if (days.length === 0) {
    return mode === "open" ? (
      <EmptyView Icon={Wallet} title="Qabul qilinmagan pul yo'q" description="Kuryerning hamma naqd puli qabul qilingan." />
    ) : (
      <EmptyView Icon={Wallet} title="Bu davrda naqd yo'q" description="Kuryer naqdga yetkazgan zakazlar kunma-kun shu yerda ko'rinadi." />
    );
  }
  return (
    <>
      {mode === "open" && !cod.open ? (
        <p className="text-ink-faint mb-2 text-meta">{`Oxirgi ${COD_WINDOW_DAYS} kun ko'rsatilmoqda — server eski qarzni hali bermayapti.`}</p>
      ) : null}
      <ul className="border-line divide-line divide-y overflow-hidden rounded-xl border">
        {days.map((item) => (
          <CodDayRow key={item.date} item={item} onAccept={onAccept ? () => onAccept(item) : null} />
        ))}
      </ul>
    </>
  );
}

function CodDayRow({ item, onAccept }: { item: CodDay; onAccept: (() => void) | null }) {
  const [expanded, setExpanded] = useState(false);
  const overdue = !item.settled && isDayOverdue(item.date, new Date());
  return (
    <li className="px-3.5 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="focus-visible:ring-brand/40 flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">
            <span className="text-ink block text-dense font-medium">{day(item.date)}</span>
            <span className="text-ink-faint text-meta">{`${item.orders.length} ta zakaz`}</span>
          </span>
          <span className={cn("tabular shrink-0 text-dense font-semibold", overdue ? "text-danger" : "text-ink")}>{formatSom(item.amount)}</span>
          <ChevronDown className={cn("text-ink-faint size-4 shrink-0 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.settled ? (
          <StatusPill label="qabul qilindi" color="var(--ok)" size="sm" />
        ) : (
          <>
            {overdue ? <StatusPill label="muddati o'tgan" color="var(--danger)" size="sm" /> : null}
            {item.declared ? <StatusPill label="e'lon qilingan" color="var(--brand)" size="sm" /> : null}
            {onAccept ? (
              <Button size="sm" variant="outline" className="ml-auto" onClick={onAccept} disabled={item.amount <= 0}>
                <HandCoins />
                Qabul qilish
              </Button>
            ) : (
              <StatusPill label="qabul qilinmagan" color="var(--warn)" size="sm" />
            )}
          </>
        )}
      </div>
      {expanded ? (
        <ul className="bg-subtle mt-2 divide-y divide-line rounded-lg">
          {item.orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3 px-3 py-2 text-meta">
              <span className="text-ink-muted tabular truncate" data-no-translit>{order.orderNumber}</span>
              <span className="text-ink tabular shrink-0">{formatSom(order.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <div className="bg-subtle rounded-xl px-3 py-2.5">
      <p className="text-ink-faint text-meta">{label}</p>
      <p className={cn("tabular mt-0.5 text-body font-semibold", tone === "danger" ? "text-danger" : "text-ink")}>{value}</p>
      {hint ? <p className="text-ink-faint text-meta">{hint}</p> : null}
    </div>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-md px-3 text-dense font-semibold transition-colors",
        active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
