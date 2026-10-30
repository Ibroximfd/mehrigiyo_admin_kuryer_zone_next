"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { CheckCheck, LoaderCircle, PenLine, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirmChiefHandover, fetchChiefHandovers } from "@/features/chief/api";
import type { ChiefHandover } from "@/features/chief/types";
import { errorMessage } from "@/lib/api-client";
import { formatSom, formatUzDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const FILTERS = { status: "pending" } as const;

/**
 * Bosh kuryerlardan pul (2-pog'ona, §C 1.4) — bosh logist yoki dopuskli
 * logist qabul qiladi. Dopusk yo'q (`403`), endpoint yo'q yoki e'lon yo'q —
 * bo'lim chizilmaydi.
 */
export function ChiefHandoversPanel() {
  const handovers = useQuery({
    queryKey: queryKeys.chiefHandovers(FILTERS),
    queryFn: ({ signal }) => fetchChiefHandovers(FILTERS, signal),
    retry: false,
  });
  const rows = handovers.data?.results ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="border-line bg-surface mt-4 rounded-2xl border p-4 sm:px-5">
      <h2 className="text-ink-muted text-micro flex items-center gap-2 font-bold tracking-widest uppercase">
        <UserRoundCog className="text-gold size-3.5" aria-hidden />
        {`Bosh kuryerlardan pul · ${rows.length}`}
      </h2>
      <ul className="divide-line mt-2 divide-y">
        {rows.map((row) => (
          <ChiefHandoverItem key={row.id} row={row} />
        ))}
      </ul>
    </section>
  );
}

function periodText(row: ChiefHandover): string {
  const from = row.periodFrom ?? row.date;
  const to = row.periodTo ?? row.date;
  if (!from) return "—";
  return from === to ? formatUzDate(parseISO(from)) : `${formatUzDate(parseISO(from))} – ${formatUzDate(parseISO(to))}`;
}

function ChiefHandoverItem({ row }: { row: ChiefHandover }) {
  const queryClient = useQueryClient();
  const [counting, setCounting] = useState(false);

  const confirm = useMutation({
    mutationFn: (input: { confirmedAmount?: number; note?: string }) => confirmChiefHandover(row.id, input),
    onSuccess: (updated) => {
      setCounting(false);
      toast.success(
        updated?.status === "disputed"
          ? `Qabul qilindi — kamomad ${formatSom(updated.shortage ?? 0)}`
          : `${formatSom(row.amount)} qabul qilindi`,
      );
      void queryClient.invalidateQueries({ queryKey: ["chiefs", "handovers"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Topshiriqni qabul qilishda xatolik")),
  });

  const differs = row.expectedAmount !== null && row.expectedAmount !== row.amount;

  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="min-w-0 flex-1 px-2">
        <span className="text-ink block truncate text-dense font-semibold" data-no-translit>
          {row.chief?.fullName ?? "Bosh kuryer"}
        </span>
        <span className="text-ink-faint block truncate text-fine">
          {periodText(row)}
          {row.note ? <span data-no-translit>{` · ${row.note}`}</span> : null}
          {differs ? ` · kutilgan ${formatSom(row.expectedAmount ?? 0)}` : ""}
        </span>
      </span>
      <span className="text-gold tabular shrink-0 text-dense font-semibold">{formatSom(row.amount)}</span>
      <Button size="sm" variant="outline" disabled={confirm.isPending} onClick={() => setCounting(true)}>
        <PenLine />
        Boshqa summa
      </Button>
      <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate({})}>
        {confirm.isPending ? <LoaderCircle className="animate-spin" /> : <CheckCheck />}
        Qabul qilish
      </Button>

      <CountedAmountDialog
        open={counting}
        row={row}
        isPending={confirm.isPending}
        onClose={() => setCounting(false)}
        onSubmit={(amount, note) => confirm.mutate({ confirmedAmount: amount, note })}
      />
    </li>
  );
}

/** Sanalgan summa boshqacha — kamomad shu pog'onada yoziladi (`disputed`). */
function CountedAmountDialog({
  open,
  row,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  row: ChiefHandover;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => void;
}) {
  const [draft, setDraft] = useState(String(row.amount));
  const [note, setNote] = useState("");
  const amount = Number.parseInt(draft.replace(/\D/g, ""), 10);
  const valid = Number.isFinite(amount) && amount >= 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>Sanalgan summa</DialogTitle>
        <DialogDescription>
          <span data-no-translit>{row.chief?.fullName ?? "Bosh kuryer"}</span>
          {` · e'lon qilingan ${formatSom(row.amount)}`}
        </DialogDescription>
        <div className="mt-3 space-y-2.5">
          <input
            autoFocus
            inputMode="numeric"
            aria-label="Sanalgan summa"
            value={draft}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setDraft(event.target.value)}
            className={cn(inputClass, "tabular")}
          />
          <input
            aria-label="Izoh"
            value={note}
            maxLength={255}
            placeholder="Izoh (ixtiyoriy)"
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
          {valid && amount !== row.amount ? (
            <p className="text-warn text-meta">
              {`Farq ${formatSom(Math.abs(row.amount - amount))} — kamomad bosh kuryerga yoziladi.`}
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button disabled={!valid || isPending} onClick={() => onSubmit(amount, note.trim())}>
            {isPending ? <LoaderCircle className="animate-spin" /> : null}
            Qabul qilish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
