"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { Building2, HandCoins, LoaderCircle, ReceiptText, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { KeyFigures, Section } from "@/components/kit/key-figures";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceFilialRow } from "@/features/report/types";
import { errorMessage } from "@/lib/api-client";
import { formatMoneyInput, formatSom, formatUzDate, parseMoneyInput, todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { fetchChiefCash, submitChiefHandover } from "../api";
import { MAX_HANDOVER_DELAY_DAYS, handoverTiming } from "../types";
import type { ChiefCash, ChiefHandover, FilialChoice, HandoverStatus, HandoverTiming } from "../types";

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

const TIMING_COLOR: Record<HandoverTiming, string> = {
  settled: "var(--ok)",
  on_time: "var(--brand)",
  late_allowed: "var(--warn)",
  overdue: "var(--danger)",
};

function timingLabel(timing: HandoverTiming, daysLate: number, due: string): string {
  if (timing === "settled") return "hammasi topshirilgan";
  if (timing === "on_time") return `topshirish kuni ${due}`;
  if (timing === "late_allowed") return `${daysLate} kun kechikdi`;
  return `muddati o'tdi · ${daysLate} kun`;
}

const HANDOVER_STATUS: Record<HandoverStatus, { label: string; color: string }> = {
  pending: { label: "qabul kutilmoqda", color: "var(--brand)" },
  confirmed: { label: "qabul qilindi", color: "var(--ok)" },
  disputed: { label: "kamomad bilan qabul qilindi", color: "var(--danger)" },
};

/**
 * Kassa 2-pog'ona: har filialga alohida (`chief/cash/`, `chief/cash/handover/`).
 * Summa cheklanmaydi — to'liq summa topshiriladi; haqingiz undan ushlanmaydi.
 * Pul bir nechta filialniki bo'lsa server `filial_required` qaytaradi — tanlov
 * oynada ko'rsatiladi va o'sha e'lon qayta yuboriladi.
 */
export function FilialHandovers({ collectedToday, canAccept }: { collectedToday: number | null; canAccept: boolean }) {
  const [target, setTarget] = useState<FinanceFilialRow | null>(null);
  const cash = useQuery({ queryKey: queryKeys.chiefCash, queryFn: ({ signal }) => fetchChiefCash({}, signal) });

  if (cash.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-label="Yuklanmoqda">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }
  if (cash.isError) {
    return (
      <ErrorView
        message={errorMessage(cash.error, "Kassani yuklashda xatolik")}
        onRetry={() => void cash.refetch()}
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }

  const data = cash.data;
  const toHandOver = data.byFilial.reduce((sum, row) => sum + row.toHandOver, 0);
  const awaiting = data.handovers.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <KeyFigures
        items={[
          {
            label: "Kuryerlarda (bugun)",
            value: collectedToday === null ? "—" : formatSom(collectedToday),
            hint: "hali qabul qilinmagan",
          },
          { label: "Filiallarga topshirish kerak", value: formatSom(toHandOver), tone: toHandOver > 0 ? "warn" : "ok" },
          { label: "Filial qabul qilishi kutilmoqda", value: formatSom(awaiting) },
        ]}
      />

      <Section
        title="Filiallarga topshirish"
        description={`Har filialga alohida, to'liq summa. Odatda har kuni; kechiksa ${MAX_HANDOVER_DELAY_DAYS} kungacha mumkin.`}
      >
        <FilialRows data={data} onHandover={canAccept ? setTarget : null} />
      </Section>

      <Section title="Topshiriqlar tarixi">
        <History handovers={data.handovers} />
      </Section>

      {target ? <HandoverDialog cash={data} initial={target} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}

function FilialRows({ data, onHandover }: { data: ChiefCash; onHandover: ((row: FinanceFilialRow) => void) | null }) {
  const today = new Date();
  if (data.byFilial.length === 0) {
    return (
      <EmptyView
        Icon={Building2}
        title="Topshiriladigan pul yo'q"
        description="Kuryerlardan pul qabul qilganingizdan keyin u filiallar bo'yicha shu yerda ko'rinadi."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return (
    <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
      {data.byFilial.map((row) => {
        // Muddat har filial uchun — eng eski yopilmagan kun (`oldest_day`, V12).
        const { timing, daysLate } = handoverTiming(row.toHandOver > 0 && row.oldestDay ? [row.oldestDay] : [], today);
        return (
          <li key={row.filial?.id ?? "none"} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
            <span className="min-w-0 flex-1">
              {row.filial ? (
                <span className="text-ink text-body font-semibold" data-no-translit>{row.filial.name}</span>
              ) : (
                <span className="text-ink-muted text-body font-semibold">Taqsimlanmagan</span>
              )}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-meta">
                {row.toHandOver > 0 && row.oldestDay ? (
                  <>
                    <StatusPill label={timingLabel(timing, daysLate, day(row.oldestDay))} color={TIMING_COLOR[timing]} size="sm" />
                    <span className="text-ink-faint">{`${day(row.oldestDay)} dan beri topshirilmagan`}</span>
                  </>
                ) : (
                  <span className="text-ink-faint">
                    {`davrda qabul qilindi ${formatSom(row.cashAccepted)} · topshirildi ${formatSom(row.handedOver)}`}
                  </span>
                )}
              </span>
            </span>
            <span className={cn("tabular text-title shrink-0", row.toHandOver > 0 ? "text-ink" : "text-ink-faint")}>
              {formatSom(row.toHandOver)}
            </span>
            {onHandover ? (
              <Button
                className="w-full sm:w-auto"
                variant={row.toHandOver > 0 ? "default" : "outline"}
                disabled={row.toHandOver <= 0}
                onClick={() => onHandover(row)}
              >
                <HandCoins />
                Topshirish
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function History({ handovers }: { handovers: ChiefHandover[] }) {
  if (handovers.length === 0) {
    return (
      <EmptyView
        Icon={ReceiptText}
        title="Hali topshiriq yo'q"
        description="Filialga topshirgan pulingiz shu yerda sana bilan ko'rinadi."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return (
    <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
      {handovers.map((item) => {
        const status = HANDOVER_STATUS[item.status];
        return (
          <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <span className="text-ink w-24 shrink-0 text-dense">{day(item.date)}</span>
            <span className="min-w-0 flex-1 truncate text-dense">
              {item.filial ? (
                <span className="text-ink-muted" data-no-translit>{item.filial.name}</span>
              ) : (
                <span className="text-ink-faint">Filialsiz</span>
              )}
              {item.shortage ? <span className="text-danger">{` · kamomad ${formatSom(item.shortage)}`}</span> : null}
            </span>
            <span className="text-ink tabular text-dense font-semibold">{formatSom(item.amount)}</span>
            <StatusPill label={status.label} color={status.color} size="sm" />
          </li>
        );
      })}
    </ul>
  );
}

function HandoverDialog({ cash, initial, onClose }: { cash: ChiefCash; initial: FinanceFilialRow; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <HandoverForm cash={cash} initial={initial} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function HandoverForm({ cash, initial, onClose }: { cash: ChiefCash; initial: FinanceFilialRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [filialId, setFilialId] = useState<number | null>(initial.filial?.id ?? null);
  const [choices, setChoices] = useState<FilialChoice[] | null>(null);
  const [draft, setDraft] = useState(formatMoneyInput(initial.toHandOver));
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  // Bir e'lon — bitta kalit: `filial_required` dan keyin qayta yuborilganda ham shu.
  const [clientActionId] = useState(() => crypto.randomUUID());
  const amount = parseMoneyInput(draft);
  const valid = Number.isFinite(amount) && amount > 0;
  const chosen = choices?.find((row) => row.id === filialId) ?? null;
  const expected = chosen ? chosen.toHandOver : filialId === (initial.filial?.id ?? null) ? initial.toHandOver : null;
  const filialName = chosen?.name ?? initial.filial?.name ?? null;
  const blocked = choices !== null && filialId === null;

  const submit = useMutation({
    mutationFn: () =>
      submitChiefHandover({
        amount,
        filialId,
        date,
        periodFrom: (chosen ? null : initial.oldestDay) ?? cash.outstandingDays[0] ?? null,
        periodTo: cash.outstandingDays[cash.outstandingDays.length - 1] ?? null,
        note,
        clientActionId,
      }),
    onSuccess: (result) => {
      if (result.kind === "filial_required") {
        const first = result.filials[0] ?? null;
        setChoices(result.filials);
        setFilialId(first?.id ?? null);
        if (first) setDraft(formatMoneyInput(first.toHandOver));
        return;
      }
      toast.success(`${formatSom(amount)} topshirildi — filial qabul qiladi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Pulni topshirishda xatolik")),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && date && !submit.isPending && !blocked) submit.mutate();
      }}
    >
      <DialogTitle>{filialName ? `${filialName} filialiga topshirish` : "Filialga topshirish"}</DialogTitle>
      <DialogDescription>Summa to&apos;liq topshiriladi. Haqingiz undan ushlanmaydi — filial alohida to&apos;laydi.</DialogDescription>

      {choices ? (
        <fieldset className="mt-4">
          <legend className="text-warn mb-2 flex items-center gap-1.5 text-dense font-medium">
            <TriangleAlert className="size-4" aria-hidden />
            Pul bir nechta filialniki — qaysi filialga topshirayotganingizni tanlang
          </legend>
          <div className="flex flex-col gap-1.5">
            {choices.map((row) => (
              <label
                key={row.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5",
                  filialId === row.id ? "border-brand bg-brand-soft" : "border-line hover:bg-subtle",
                )}
              >
                <input
                  type="radio"
                  name="filial"
                  checked={filialId === row.id}
                  onChange={() => {
                    setFilialId(row.id);
                    setDraft(formatMoneyInput(row.toHandOver));
                  }}
                  className="accent-brand"
                />
                <span className="text-ink min-w-0 flex-1 truncate text-dense font-medium" data-no-translit>{row.name}</span>
                <span className="text-ink tabular text-dense">{formatSom(row.toHandOver)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Summa, so'm"
          htmlFor="handover-amount"
          className="sm:col-span-2"
          hint={expected !== null ? `Qoldiq: ${formatSom(expected)}` : undefined}
          error={draft && !valid ? "Summa noldan katta bo'lsin" : undefined}
        >
          <input
            inputMode="numeric"
            id="handover-amount"
            aria-invalid={Boolean(draft) && !valid}
            value={draft}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setDraft(formatMoneyInput(event.target.value))}
            className={cn(inputClass, "tabular")}
          />
        </Field>
        <Field label="Topshirish kuni" htmlFor="handover-date">
          <input
            type="date"
            required
            id="handover-date"
            value={date}
            max={todayIso()}
            onChange={(event) => setDate(event.target.value)}
            className={cn(inputClass, "tabular")}
          />
        </Field>
        <Field label="Izoh" htmlFor="handover-note">
          <input id="handover-note" value={note} maxLength={255} onChange={(event) => setNote(event.target.value)} className={inputClass} />
        </Field>
      </div>
      {valid && expected !== null && amount !== Math.round(expected) ? (
        <p className="text-warn mt-2 text-meta">{`Qoldiqdan farq ${formatSom(Math.abs(expected - amount))} — filial qabul qilganda ko'radi.`}</p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={!valid || !date || submit.isPending || blocked}>
          {submit.isPending ? <LoaderCircle className="animate-spin" /> : <HandCoins />}
          Topshirdim
        </Button>
      </div>
    </form>
  );
}
