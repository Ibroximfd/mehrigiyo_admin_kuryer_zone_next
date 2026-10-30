"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { Banknote, HandCoins, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { StatTile } from "@/components/kit/stat-tile";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefCash, submitChiefHandover } from "@/features/chief/api";
import { outstandingPeriod } from "@/features/chief/types";
import type { CashDayStatus, ChiefCash as ChiefCashData, ChiefHandover } from "@/features/chief/types";
import { errorMessage } from "@/lib/api-client";
import { formatDateTime, formatSom, formatUzDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { ChiefPeriodField, useChiefPeriod } from "./chief-period";

const DAY_STATUS: Record<CashDayStatus, { label: string; color: string }> = {
  none: { label: "topshirilmagan", color: "var(--warn)" },
  pending: { label: "e'lon qilindi", color: "var(--brand)" },
  confirmed: { label: "qabul qilindi", color: "var(--ok)" },
  disputed: { label: "kamomad", color: "var(--danger)" },
};

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

/**
 * Kassa (§C 2.4): kuryerlardan yig'ilgan pul kunma-kun; topshirilmagan
 * kunlar yig'ilib turadi va bitta «Hammasini topshirish» bilan bosh
 * logistga e'lon qilinadi. Kamomad bosh logist qabul qilganda yoziladi.
 */
export function ChiefCash() {
  const period = useChiefPeriod(31);
  const [declaring, setDeclaring] = useState(false);
  const cash = useQuery({
    queryKey: queryKeys.chiefCash({ from: period.from, to: period.to }),
    queryFn: ({ signal }) => fetchChiefCash({ from: period.from, to: period.to }, signal),
  });
  const data = cash.data;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <ChiefPeriodField period={period} />
        {data && data.outstanding > 0 ? (
          <Button className="ml-auto" onClick={() => setDeclaring(true)}>
            <HandCoins />
            {`Hammasini topshirish · ${formatSom(data.outstanding)}`}
          </Button>
        ) : null}
      </div>

      {cash.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : cash.isError ? (
        <ErrorView message={errorMessage(cash.error, "Kassani yuklashda xatolik")} onRetry={() => void cash.refetch()} className="border-line bg-surface rounded-xl border" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile Icon={Banknote} label="Kuryerlardan yig'ildi" text={formatSom(data.collectedFromCouriers)} sub="tanlangan davrda" />
            <StatTile
              Icon={HandCoins}
              label="Topshirilmagan"
              text={formatSom(data.outstanding)}
              sub={data.outstandingDays.length ? `${data.outstandingDays.length} kun` : "hammasi topshirilgan"}
              color="var(--warn)"
              emphasis={data.outstanding > 0}
            />
          </div>
          <div className="grid items-start gap-3.5 lg:grid-cols-2">
            <DaysTable data={data} />
            <HandoverHistory handovers={data.handovers} />
          </div>
          <DeclareDialog open={declaring} data={data} onClose={() => setDeclaring(false)} />
        </>
      ) : null}
    </div>
  );
}

function DaysTable({ data }: { data: ChiefCashData }) {
  if (data.days.length === 0) {
    return <EmptyView Icon={Banknote} title="Bu davrda pul yo'q" description="Kuryerlar topshirgan naqd shu yerda kunma-kun ko'rinadi." className="border-line bg-surface rounded-xl border" />;
  }
  return (
    <section className="border-line bg-surface overflow-hidden rounded-2xl border">
      <h2 className="text-ink-muted text-micro border-line border-b px-4 py-2.5 font-bold tracking-widest uppercase">Kunlar</h2>
      <table className="w-full text-dense">
        <tbody>
          {data.days.map((row) => {
            const status = DAY_STATUS[row.status];
            return (
              <tr key={row.date} className="border-line border-b last:border-0">
                <td className="text-ink px-4 py-2">{day(row.date)}</td>
                <td className="tabular px-3 py-2 text-right font-semibold">{formatSom(row.collected)}</td>
                <td className="px-4 py-2 text-right">
                  <StatusPill label={status.label} color={status.color} size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function HandoverHistory({ handovers }: { handovers: ChiefHandover[] }) {
  if (handovers.length === 0) return null;
  return (
    <section className="border-line bg-surface overflow-hidden rounded-2xl border">
      <h2 className="text-ink-muted text-micro border-line border-b px-4 py-2.5 font-bold tracking-widest uppercase">Topshiriqlar</h2>
      <ul className="divide-line divide-y">
        {handovers.map((item) => {
          const status = DAY_STATUS[item.status];
          const from = item.periodFrom ?? item.date;
          const to = item.periodTo ?? item.date;
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="text-ink block text-dense">{from === to ? day(from) : `${day(from)} – ${day(to)}`}</span>
                <span className="text-ink-faint text-fine">
                  {item.createdAt ? formatDateTime(item.createdAt) : ""}
                  {item.shortage ? ` · kamomad ${formatSom(item.shortage)}` : ""}
                </span>
              </span>
              <span className="tabular text-dense font-semibold">{formatSom(item.amount)}</span>
              <StatusPill label={status.label} color={status.color} size="sm" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DeclareDialog({ open, data, onClose }: { open: boolean; data: ChiefCashData; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        {open ? <DeclareForm data={data} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DeclareForm({ data, onClose }: { data: ChiefCashData; onClose: () => void }) {
  const queryClient = useQueryClient();
  const range = outstandingPeriod(data);
  const [draft, setDraft] = useState(String(Math.round(data.outstanding)));
  const [note, setNote] = useState("");
  // Bir e'lon — bitta kalit: tarmoq qayta yuborsa server o'sha qatorni qaytaradi.
  const [clientActionId] = useState(() => crypto.randomUUID());
  const amount = Number.parseInt(draft.replace(/\D/g, ""), 10);
  const valid = Number.isFinite(amount) && amount > 0;

  const submit = useMutation({
    mutationFn: () =>
      submitChiefHandover({ amount, periodFrom: range?.from, periodTo: range?.to, note: note.trim(), clientActionId }),
    onSuccess: () => {
      toast.success(`${formatSom(amount)} topshirildi — bosh logist qabul qiladi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Pulni topshirishda xatolik")),
  });

  return (
    <>
      <DialogTitle>Bosh logistga topshirish</DialogTitle>
      <DialogDescription>
        {range ? (range.from === range.to ? day(range.from) : `${day(range.from)} – ${day(range.to)}`) : ""}
        {` · kutilgan ${formatSom(data.outstanding)}`}
      </DialogDescription>
      <div className="mt-3 space-y-2.5">
        <input
          autoFocus
          inputMode="numeric"
          aria-label="Topshiriladigan summa"
          value={draft}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setDraft(event.target.value)}
          className={cn(inputClass, "tabular")}
        />
        <input aria-label="Izoh" value={note} maxLength={255} placeholder="Izoh (ixtiyoriy)" onChange={(event) => setNote(event.target.value)} className={inputClass} />
        {valid && amount !== Math.round(data.outstanding) ? (
          <p className="text-warn text-meta">{`Kutilgandan farq ${formatSom(Math.abs(data.outstanding - amount))} — bosh logist ko'radi.`}</p>
        ) : null}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Bekor
        </Button>
        <Button disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? <LoaderCircle className="animate-spin" /> : <HandCoins />}
          Topshirish
        </Button>
      </div>
    </>
  );
}
