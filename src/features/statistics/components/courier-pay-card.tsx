"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, LoaderCircle, Minus, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { ChartCard } from "@/components/kit/chart";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { adjustCourierAddresses } from "@/features/statistics/api";
import type { CourierPayRow, CourierPaySummary } from "@/features/statistics/pay";
import type { LogistStatistics } from "@/features/statistics/types";
import { errorCode, errorMessage } from "@/lib/api-client";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Kuryer haqi (manzil bo'yicha, `LOGIST_03` §3) — jami manzil, stavka,
 * to'lanadigan haq va kuryerlar kesimi. Manzil soni yetkazishdan avtomatik
 * hisoblanadi; logist har kuryerga −1 / +1 qila oladi (faqat bitta kun
 * tanlanganda — tuzatish o'sha kunga yoziladi). Stavka `0` — bosh filial
 * hali belgilamagan, hisob ham chiqmaydi.
 */
export function CourierPayCard({ pay, day }: { pay: CourierPaySummary; day: string | null }) {
  const queryClient = useQueryClient();
  const adjust = useMutation({
    mutationFn: ({ courierId, delta }: { courierId: number; delta: 1 | -1 }) => adjustCourierAddresses(courierId, { date: day!, delta }),
    onSuccess: (_, { delta }) => {
      toast.success(delta > 0 ? "Manzil qo'shildi" : "Manzil ayirildi");
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
    onError: (error) =>
      toast.error(
        errorCode(error) === "endpoint_missing"
          ? "Manzil sonini tuzatish backend'da hali yo'q"
          : errorMessage(error, "Manzil sonini o'zgartirishda xatolik"),
      ),
  });
  const pendingId = adjust.isPending ? adjust.variables?.courierId : null;

  return (
    <ChartCard
      title="Kuryer haqi"
      description="1 manzilga bir borish = 1 to'lov · manzil soni × stavka"
      className="h-full"
    >
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-3 gap-2">
          <Figure label="Manzil soni" value={String(pay.stops)} />
          <Figure label="Stavka" value={pay.rate > 0 ? `${formatSom(pay.rate)} / manzil` : "—"} />
          <Figure label="Jami haq" value={pay.rate > 0 ? formatSom(pay.total) : "—"} />
        </dl>
        {pay.rate === 0 ? (
          <p className="text-ink-faint text-meta flex items-center gap-1.5">
            <Coins className="size-3.5" aria-hidden />
            Stavka belgilanmagan — «Manzillar» bo&apos;limida bosh filial belgilaydi
          </p>
        ) : null}
        <p className="text-ink-faint text-meta">
          {day
            ? "Manzil soni yetkazishdan o'zi hisoblanadi. Xato bo'lsa −1 / +1 bilan tuzating — tuzatish shu kunga yoziladi."
            : "Manzil sonini tuzatish uchun bitta kunni tanlang (Bugun, Kecha yoki aniq sana)."}
        </p>
        {pay.rows.length > 0 ? (
          <ul className="flex flex-col">
            {pay.rows.map((row) => (
              <PayRow
                key={row.id}
                row={row}
                rate={pay.rate}
                day={day}
                pending={pendingId === row.id}
                disabled={adjust.isPending}
                onAdjust={(delta) => adjust.mutate({ courierId: row.id, delta })}
              />
            ))}
          </ul>
        ) : (
          <p className="text-ink-faint text-meta py-4 text-center">Bu davrda manzil yo&apos;q</p>
        )}
      </div>
    </ChartCard>
  );
}

function PayRow({
  row,
  rate,
  day,
  pending,
  disabled,
  onAdjust,
}: {
  row: CourierPayRow;
  rate: number;
  day: string | null;
  pending: boolean;
  disabled: boolean;
  onAdjust: (delta: 1 | -1) => void;
}) {
  const canAdjust = day !== null;
  return (
    <li className="border-line/60 flex items-center gap-2 border-b py-1.5 text-dense last:border-b-0">
      <span data-no-translit className="text-ink min-w-0 flex-1 truncate font-medium">
        {row.fullName || "—"}
      </span>
      {row.manual !== 0 ? (
        <span className={cn("tabular shrink-0 text-fine font-semibold", row.manual > 0 ? "text-ok" : "text-warn")} title="Logist qo'lda tuzatgan">
          {`qo'lda ${row.manual > 0 ? "+" : ""}${row.manual}`}
        </span>
      ) : null}
      <span className="flex shrink-0 items-center gap-1">
        <AdjustButton label="Manzil ayirish" disabled={!canAdjust || disabled || row.stops <= 0} onClick={() => onAdjust(-1)}>
          <Minus className="size-3.5" />
        </AdjustButton>
        <span className="text-ink tabular w-14 text-center font-semibold">
          {pending ? <LoaderCircle className="mx-auto size-3.5 animate-spin" /> : `${row.stops} ta`}
        </span>
        <AdjustButton label="Manzil qo'shish" disabled={!canAdjust || disabled} onClick={() => onAdjust(1)}>
          <Plus className="size-3.5" />
        </AdjustButton>
      </span>
      <span className="text-ink tabular w-28 text-right font-semibold">{rate > 0 ? formatSom(row.pay) : "—"}</span>
    </li>
  );
}

function AdjustButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} className="size-7 rounded-md">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * "Xato bosildi" hisoboti (`LOGIST_04` A5): `delivered`/`cancelled` dan
 * necha marta orqaga qaytarilgan va kim tomonidan. Ko'payib ketsa —
 * jamoa bilan gaplashish signali.
 */
export function RevertsCard({ stats }: { stats: LogistStatistics }) {
  const total = stats.totals.reverts ?? 0;
  return (
    <ChartCard
      title="Orqaga qaytarishlar"
      description="«Yetkazildi» yoki «Bekor» xato bosilib qaytarilgani"
      className="h-full"
    >
      <div className="flex flex-col gap-3">
        <p className="text-ink tabular text-stat">
          {total}
          <span className="text-ink-muted text-meta font-normal"> marta</span>
        </p>
        {stats.revertsBy.length > 0 ? (
          <ul className="flex flex-col">
            {stats.revertsBy.map((row) => (
              <li
                key={row.actorName}
                className="border-line/60 flex items-center gap-2 border-b py-1.5 text-dense last:border-b-0"
              >
                <Undo2 className="text-gold size-3.5 shrink-0" aria-hidden />
                <span data-no-translit className="text-ink min-w-0 flex-1 truncate">
                  {row.actorName || "—"}
                </span>
                <span className="text-ink tabular font-semibold">{row.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-faint text-meta">Bu davrda qaytarish bo&apos;lmadi</p>
        )}
      </div>
    </ChartCard>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas flex flex-col gap-0.5 rounded-lg px-3 py-2">
      <dt className="text-ink-faint text-micro uppercase">{label}</dt>
      <dd className="text-ink tabular text-dense font-semibold">{value}</dd>
    </div>
  );
}
