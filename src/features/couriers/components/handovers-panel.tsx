"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { Banknote, CheckCheck, ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Button } from "@/components/ui/button";
import { fetchHandovers, settleCourierCodDay } from "@/features/couriers/api";
import { HandoverSplit } from "@/features/couriers/components/handover-split";
import type { Courier, HandoverRow } from "@/features/couriers/types";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { isEndpointMissing } from "@/lib/api-availability";
import { formatSom, formatUzDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

/**
 * Kuryerlarning "shuncha topshiraman" e'lonlari (`cod/handovers/`). Har
 * qatorda **"Qabul qilish"** — o'sha kun e'lon qilingan summa bilan yopiladi.
 * Kam berilgan bo'lsa yoki haftani birga yopish kerak bo'lsa — qator
 * bosiladi va kuryerning yig'im paneli ochiladi. E'lon yo'q bo'lsa bo'lim
 * chiqmaydi: e'lon ixtiyoriy.
 *
 * 2026-10-15 dan ro'yxatda boshqa filial kuryerlari ham bo'ladi (pul bizning
 * kassaga topshiriladi) — har qatorda kuryer filiali va kassa nuqtasi.
 */
export function HandoversPanel({
  couriers,
  onOpen,
}: {
  couriers: Courier[];
  onOpen: (courier: Courier) => void;
}) {
  const handovers = useQuery({
    queryKey: queryKeys.codHandovers,
    queryFn: ({ signal }) => fetchHandovers("pending", signal),
    retry: (count, error) => !isEndpointMissing(error) && count < 2,
  });

  const rows = handovers.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="border-line bg-surface mt-4 rounded-2xl border p-4 sm:px-5">
      <h2 className="text-ink-muted text-micro flex items-center gap-2 font-bold tracking-widest uppercase">
        <Banknote className="text-gold size-3.5" aria-hidden />
        {`Pul topshirishga tayyor · ${rows.length}`}
      </h2>
      <ul className="divide-line mt-2 divide-y">
        {rows.map((row) => (
          <HandoverItem
            key={`${row.courier?.id ?? 0}-${row.date}`}
            row={row}
            courier={couriers.find((item) => item.id === row.courier?.id)}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}

function HandoverItem({
  row,
  courier,
  onOpen,
}: {
  row: HandoverRow;
  courier: Courier | undefined;
  onOpen: (courier: Courier) => void;
}) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const courierId = row.courier?.id ?? null;
  const name = row.courier?.fullName ?? "Kuryer";
  const amount = row.amount ?? 0;

  const accept = useMutation({
    mutationFn: () =>
      settleCourierCodDay(courierId as number, {
        date: row.date,
        confirmedAmount: row.amount,
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      toast.success(`${name} — ${formatSom(amount)} qabul qilindi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.codHandovers });
      void queryClient.invalidateQueries({ queryKey: queryKeys.couriers });
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error(orderErrorMessage(error, "Naqdni qabul qilishda xatolik"));
    },
  });

  const details = (
    <>
      <span className="min-w-0 flex-1">
        <span
          className="text-ink block truncate text-dense font-semibold"
          data-no-translit
        >
          {name}
        </span>
        <span className="text-ink-faint block truncate text-fine">
          {row.date ? formatUzDate(parseISO(row.date)) : "—"}
          {/* Kuryer boshqa filialdan bo'lishi mumkin — kassa bizniki. */}
          {row.courier?.filial ? (
            <span data-no-translit>{` · ${row.courier.filial.name}`}</span>
          ) : null}
          {row.note ? <span data-no-translit>{` · ${row.note}`}</span> : null}
        </span>
        <HandoverSplit handover={row} className="mt-0.5" />
      </span>
      <span className="text-gold tabular shrink-0 text-dense font-semibold">
        {formatSom(amount)}
      </span>
      {courier ? (
        <ChevronRight className="text-ink-faint size-4 shrink-0" aria-hidden />
      ) : null}
    </>
  );

  return (
    <li className="flex items-center gap-2 py-1.5">
      {courier ? (
        <button
          type="button"
          onClick={() => onOpen(courier)}
          title="Yig'im paneli: kunlar, kam berilgan summa, haftani yopish"
          className="hover:bg-subtle flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors"
        >
          {details}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1.5">
          {details}
        </div>
      )}

      {courierId !== null && row.date ? (
        <Button
          size="sm"
          disabled={accept.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {accept.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <CheckCheck />
          )}
          Qabul qilish
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Naqd qabul qilinsinmi?"
        description={`${name} · ${row.date} · ${formatSom(amount)}`}
        consequence="Kun yopiladi, buyurtmalar «kassada» bo'ladi. Kam berilgan bo'lsa — qatorni bosib, sanalgan summani kiriting."
        confirmLabel="Ha, qabul qildim"
        isPending={accept.isPending}
        onConfirm={() => accept.mutate()}
      />
    </li>
  );
}
