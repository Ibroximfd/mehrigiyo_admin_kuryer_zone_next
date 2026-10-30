"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import {
  Banknote,
  CheckCheck,
  ChevronDown,
  LoaderCircle,
  PackageCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Field, inputClass } from "@/components/kit/field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchCourierCodRange,
  settleCourierCodRange,
} from "@/features/couriers/api";
import {
  countedDifference,
  currentWeek,
  parseCountedAmount,
  previousWeek,
  rangeError,
} from "@/features/couriers/cod-week";
import type { DateRange } from "@/features/couriers/cod-week";
import { HandoverSplit } from "@/features/couriers/components/handover-split";
import type {
  CodRangeDay,
  CodSettleResult,
  Courier,
  Handover,
} from "@/features/couriers/types";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { formatClock, formatSom, formatUzDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Kuryerning naqd puli — haftalik yig'im (`KURYER_SAYTLAR_LOGIST_OPERATOR.md`
 * §2.4). Pul haftada bir yig'iladi, hisob kunlik: har kunning buyurtmalari,
 * kuryer e'loni va nizosi alohida. Logist pulni sanab, oraliqni bitta
 * so'rovda yopadi; kam bo'lsa farq oxirgi kunga "nizo" bo'lib yoziladi.
 *
 * Summalar **serverdan** (A5 qoidasi) — panel ularni qayta hisoblamaydi.
 */
export function CourierCodSheet({
  courier,
  onClose,
}: {
  courier: Courier | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DateRange>(() => currentWeek());
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<CodSettleResult | null>(null);

  const invalidRange = rangeError(range);
  const courierId = courier?.id ?? 0;

  const cod = useQuery({
    queryKey: queryKeys.courierCodRange(courierId, range.from, range.to),
    queryFn: ({ signal }) =>
      fetchCourierCodRange(courierId, range.from, range.to, signal),
    enabled: courier !== null && invalidRange === null,
    retry: false,
  });

  const countedAmount = parseCountedAmount(counted);
  const countedInvalid = countedAmount !== null && Number.isNaN(countedAmount);
  const outstanding = cod.data?.outstandingTotal ?? 0;
  const difference = countedInvalid
    ? null
    : countedDifference(outstanding, countedAmount);

  const settle = useMutation({
    mutationFn: () =>
      settleCourierCodRange(courierId, {
        dateFrom: range.from,
        dateTo: range.to,
        confirmedAmount: countedInvalid ? null : countedAmount,
        note,
      }),
    onSuccess: (settled) => {
      setConfirmOpen(false);
      setResult(settled);
      setCounted("");
      setNote("");
      toast.success(
        `${courier?.fullName} — ${settled.settledDays} kun yopildi, ${formatSom(settled.confirmedTotal)}`,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.courierCodRange(courierId, range.from, range.to),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.couriers });
      void queryClient.invalidateQueries({ queryKey: queryKeys.codHandovers });
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error(orderErrorMessage(error, "Naqdni yopishda xatolik"));
    },
  });

  const data = cod.data ?? null;
  const changeRange = (next: DateRange) => {
    setRange(next);
    setResult(null);
  };

  return (
    <Sheet
      open={courier !== null}
      onOpenChange={(next) => {
        if (next) return;
        // Keyingi kuryer joriy haftadan, toza formadan boshlansin.
        setRange(currentWeek());
        setCounted("");
        setNote("");
        setResult(null);
        onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-[480px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
      >
        <div className="border-line border-b px-5 py-4 pr-12">
          <SheetTitle className="text-ink flex items-center gap-2 text-base font-semibold">
            <Banknote className="text-gold size-4.5" />
            Naqd yig&apos;im
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-meta">
            <span data-no-translit>{courier?.fullName}</span> — pul haftada bir
            yig&apos;iladi, hisob kunlik
          </SheetDescription>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={range.from}
              max={range.to}
              aria-label="Boshlanish sanasi"
              onChange={(event) =>
                changeRange({ ...range, from: event.target.value })
              }
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
              onChange={(event) =>
                changeRange({ ...range, to: event.target.value })
              }
              className={cn(inputClass, "h-9 w-auto flex-1 text-dense")}
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => changeRange(currentWeek())}
            >
              Shu hafta
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => changeRange(previousWeek())}
            >
              O&apos;tgan hafta
            </Button>
          </div>
          {invalidRange ? (
            <p
              role="alert"
              className="text-danger text-meta mt-1.5 font-medium"
            >
              {invalidRange}
            </p>
          ) : null}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {cod.isPending && invalidRange === null ? (
            <div className="space-y-2">
              <Skeleton className="h-24 rounded-xl" />
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : null}

          {cod.isError ? (
            <ErrorView
              message={orderErrorMessage(
                cod.error,
                "Naqd hisobini yuklashda xatolik",
              )}
              onRetry={() => void cod.refetch()}
              className="border-line rounded-xl border"
            />
          ) : null}

          {result ? <SettleResult result={result} /> : null}

          {data ? (
            <>
              <section
                style={{ "--spine": "var(--gold-mark)" } as React.CSSProperties}
                className="border-line bg-surface spine tile-tint rounded-xl border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-ink-muted text-meta font-medium">
                    Topshirilmagan
                  </p>
                  {data.outstandingDays === 0 && data.days.length > 0 ? (
                    <span className="bg-ok-soft text-ok flex items-center gap-1 rounded-full px-2 py-0.5 text-fine font-semibold">
                      <ShieldCheck className="size-3.5" />
                      Hammasi yopilgan
                    </span>
                  ) : null}
                </div>
                <p className="text-gold tabular mt-1 text-2xl font-semibold tracking-tight">
                  {formatSom(data.outstandingTotal)}
                </p>
                <p className="text-ink-faint text-meta mt-0.5">
                  {`${data.outstandingDays} kun · oraliq jami ${formatSom(data.total)}`}
                </p>
              </section>

              {data.days.length === 0 ? (
                <EmptyView
                  Icon={PackageCheck}
                  title="Bu oraliqda naqd yetkazma yo'q"
                  description="Kuryer naqdga yopgan buyurtmalar kunma-kun shu yerda ko'rinadi."
                  className="mt-3"
                />
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.days.map((day) => (
                    <DayRow key={day.date} day={day} />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>

        {data &&
        (data.outstandingDays > 0 || data.days.some((day) => !day.settled)) ? (
          <form
            className="border-line flex flex-col gap-3 border-t px-5 py-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!countedInvalid && !settle.isPending) setConfirmOpen(true);
            }}
          >
            <Field
              label="Sanalgan pul"
              error={countedInvalid ? "Faqat raqam kiriting" : undefined}
              hint={
                difference !== null && difference !== 0
                  ? difference > 0
                    ? `${formatSom(difference)} kam — oxirgi kunga nizo bo'lib yoziladi`
                    : `${formatSom(-difference)} ortiqcha — oxirgi kunga yoziladi`
                  : "Bo'sh qoldirsangiz har kun o'z summasi bilan qabul qilinadi."
              }
            >
              <input
                inputMode="numeric"
                value={counted}
                onChange={(event) => setCounted(event.target.value)}
                placeholder={String(data.outstandingTotal)}
                aria-invalid={countedInvalid || undefined}
                className={cn(inputClass, "tabular")}
              />
            </Field>
            <Field label="Izoh">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="masalan, 40 000 kam — keyingi haftada"
                className={inputClass}
              />
            </Field>
            <Button type="submit" disabled={countedInvalid || settle.isPending}>
              {settle.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              {`Oraliqni yopish · ${formatSom(countedAmount ?? data.outstandingTotal)}`}
            </Button>
          </form>
        ) : null}
      </SheetContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Naqd qabul qilinsinmi?"
        description={`${courier?.fullName} · ${range.from} — ${range.to} · ${formatSom(countedAmount ?? outstanding)}`}
        consequence={
          difference !== null && difference > 0
            ? `${formatSom(difference)} kam: oxirgi kun "nizo" bo'lib yopiladi. Yopilgan kunni qayta ochib bo'lmaydi.`
            : "Yopilgan kunlarni qayta ochib bo'lmaydi; buyurtmalar \"kassada\" bo'ladi."
        }
        confirmLabel="Ha, qabul qildim"
        isPending={settle.isPending}
        onConfirm={() => settle.mutate()}
      />
    </Sheet>
  );
}

function DayRow({ day }: { day: CodRangeDay }) {
  const [open, setOpen] = useState(false);
  const declared = day.handover?.amount ?? null;
  const differs = day.amount !== day.computedTotal;

  return (
    <li className="border-line overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="hover:bg-subtle flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-ink text-dense font-semibold">
            {formatUzDate(parseISO(day.date))}
          </p>
          <p className="text-ink-faint text-fine mt-0.5">
            {day.orders.length} ta buyurtma
            {differs ? ` · tizim: ${formatSom(day.computedTotal)}` : ""}
          </p>
          <DayStatus day={day} />
          <HandoverSplit handover={day.handover} className="mt-1" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={cn(
              "tabular text-dense font-semibold",
              differs ? "text-warn" : "text-gold",
            )}
          >
            {formatSom(day.amount)}
          </span>
          {declared !== null && declared !== day.amount ? (
            <span className="text-ink-faint tabular text-fine">
              e&apos;lon: {formatSom(declared)}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "text-ink-faint size-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open ? (
        <ul className="divide-line border-line divide-y border-t">
          {day.orders.map((order) => (
            <li key={order.id}>
              <Link
                href={ROUTES.orderDetail(order.id)}
                className="hover:bg-subtle flex items-center gap-3 px-3.5 py-2 transition-colors"
              >
                <span
                  className="text-ink tabular min-w-0 flex-1 truncate text-meta font-medium"
                  data-no-translit
                >
                  {order.orderNumber || "—"}
                </span>
                <span className="text-ink-faint tabular text-fine">
                  {order.deliveredAt ? formatClock(order.deliveredAt) : "—"}
                </span>
                <span className="text-gold tabular text-meta font-semibold">
                  {formatSom(order.amount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DayStatus({ day }: { day: CodRangeDay }) {
  const handover = day.handover;
  if (handover?.status === "disputed") {
    return (
      <p className="text-danger mt-1 flex items-start gap-1 text-fine font-semibold">
        <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden />
        <span>
          {`Nizo · qabul qilingan ${formatSom(handover.confirmedAmount ?? 0)}`}
          {handover.logistNote ? (
            <span className="text-ink-muted font-normal" data-no-translit>
              {" — "}
              {handover.logistNote}
            </span>
          ) : null}
        </span>
      </p>
    );
  }
  if (day.settled || handover?.status === "confirmed") {
    return (
      <p className="text-ok mt-1 flex items-center gap-1 text-fine font-semibold">
        <ShieldCheck className="size-3" aria-hidden />
        Qabul qilingan
      </p>
    );
  }
  if (handover?.status === "pending") {
    return (
      <p className="text-ink-muted mt-1 text-fine">
        Kuryer topshirishga tayyor
        {handover.note ? (
          <span data-no-translit>{` — ${handover.note}`}</span>
        ) : null}
      </p>
    );
  }
  return null;
}

function SettleResult({ result }: { result: CodSettleResult }) {
  const disputed = result.days.filter(
    (day) => day.handover?.status === "disputed",
  );
  return (
    <section
      role="status"
      className={cn(
        "mb-3 rounded-xl border px-4 py-3",
        disputed.length > 0
          ? "border-danger/30 bg-danger-soft"
          : "border-ok/30 bg-ok-soft",
      )}
    >
      <p
        className={cn(
          "text-dense font-semibold",
          disputed.length > 0 ? "text-danger" : "text-ok",
        )}
      >
        {`${result.settledDays} kun yopildi · ${formatSom(result.confirmedTotal)}`}
      </p>
      {disputed.map((day) => (
        <DisputedLine key={day.date} date={day.date} handover={day.handover} />
      ))}
      {result.days
        .filter((day) => day.handover?.cashPoint || day.handover?.byFilial.length)
        .map((day) => (
          <div key={`split-${day.date}`} className="mt-1.5">
            <p className="text-ink-faint text-fine">{formatUzDate(parseISO(day.date))}</p>
            <HandoverSplit handover={day.handover} />
          </div>
        ))}
    </section>
  );
}

function DisputedLine({
  date,
  handover,
}: {
  date: string;
  handover: Handover | null;
}) {
  if (!handover) return null;
  const shortage = (handover.amount ?? 0) - (handover.confirmedAmount ?? 0);
  return (
    <p className="text-danger text-meta mt-1">
      {formatUzDate(parseISO(date))}: nizo
      {shortage > 0 ? ` — ${formatSom(shortage)} kam` : ""}
    </p>
  );
}
