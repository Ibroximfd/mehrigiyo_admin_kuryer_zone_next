"use client";

import { parseISO } from "date-fns";
import { ChevronRight, TriangleAlert, WalletCards } from "lucide-react";

import { Section } from "@/components/kit/key-figures";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api-client";
import { formatSom, formatUzDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { COD_WINDOW_DAYS, sortDebts } from "../courier-debts";
import type { CourierDebt } from "../courier-debts";
import { MAX_HANDOVER_DELAY_DAYS } from "../types";

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

/**
 * «Kuryerlardagi pul» — qabul qilinmagan HAMMA pul, filtrsiz: kechikkani,
 * e'lon qilinmagani, kamomadi. Qator bosilsa kuryerning kunma-kun naqd hisobi
 * ochiladi va o'sha yerda qabul qilinadi. Telefonda: ism va summa bir qatorda,
 * tafsilot pastda, butun qator bosiladi.
 */
export function CourierDebts({
  debts,
  complete,
  isPending,
  error,
  onRetry,
  onOpen,
}: {
  debts: CourierDebt[] | undefined;
  /** Server muddat cheklovisiz bergan (59-javob) — `false` bo'lsa oxirgi 31 kun. */
  complete: boolean;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onOpen: (courier: { id: number; fullName: string }) => void;
}) {
  const description = complete
    ? `Qabul qilinmagan hamma pul — e'lon qilinmagani va kechikkani ham. ${MAX_HANDOVER_DELAY_DAYS} kundan oshgani — muddati o'tgan.`
    : `Qabul qilinmagan pul — oxirgi ${COD_WINDOW_DAYS} kun. ${MAX_HANDOVER_DELAY_DAYS} kundan oshgani — muddati o'tgan.`;
  return (
    <Section title="Kuryerlardagi pul" description={description}>
      {isPending ? (
        <div className="flex flex-col gap-2" aria-label="Yuklanmoqda">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorView
          message={errorMessage(error, "Kuryerlardagi pulni yuklashda xatolik")}
          onRetry={onRetry}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        <DebtList debts={sortDebts(debts ?? [])} onOpen={onOpen} />
      )}
    </Section>
  );
}

function DebtList({ debts, onOpen }: { debts: CourierDebt[]; onOpen: (courier: { id: number; fullName: string }) => void }) {
  if (debts.length === 0) {
    return (
      <EmptyView
        Icon={WalletCards}
        title="Kuryerlarda qabul qilinmagan pul yo'q"
        description="Kuryer naqdga yetkazgan zakaz puli shu yerda ko'rinadi — qabul qilguningizcha turadi."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return (
    <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
      {debts.map((debt) => (
        <li key={debt.courier.id}>
          <DebtRow debt={debt} onOpen={() => onOpen(debt.courier)} />
        </li>
      ))}
    </ul>
  );
}

function DebtRow({ debt, onOpen }: { debt: CourierDebt; onOpen: () => void }) {
  const overdue = debt.overdueAmount > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${debt.courier.fullName}: kunma-kun ko'rish`}
      className="hover:bg-subtle focus-visible:ring-brand/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-ink truncate text-body font-semibold" data-no-translit>{debt.courier.fullName}</span>
          <span className={cn("tabular shrink-0 text-title", overdue ? "text-danger" : "text-ink")}>{formatSom(debt.total)}</span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta">
          {overdue ? (
            <StatusPill label={`muddati o'tgan ${formatSom(debt.overdueAmount)}`} color="var(--danger)" size="sm" />
          ) : debt.daysLate > 0 ? (
            <StatusPill label={`${debt.daysLate} kun kechikdi`} color="var(--warn)" size="sm" />
          ) : null}
          {debt.openDays > 0 ? (
            <span className="text-ink-faint">
              {/* Har bo'lak alohida — tarjimon «{x} dan beri» ni butun qatorga qo'llamasin. */}
              <span>{`${debt.openDays} kun`}</span>
              {debt.oldestDay ? (
                <>
                  {" · "}
                  <span>{`${day(debt.oldestDay)} dan beri`}</span>
                </>
              ) : null}
            </span>
          ) : null}
          {debt.total > 0 ? (
            <span className="text-ink-faint">
              {debt.declaredAmount > 0 ? `e'lon qilgan ${formatSom(debt.declaredAmount)}` : "hali e'lon qilmagan"}
            </span>
          ) : null}
        </span>
        {debt.shortageDebt > 0 ? (
          <>
            <span className="text-warn mt-1 block text-meta">{`Kamomad (kuryer zimmasida): ${formatSom(debt.shortageDebt)}`}</span>
            {/*
              Vaqtincha (B13, 65-hisobot): kuryer ilovasi qarzni ko'rmaydi va tizimda
              yopish tugmasi yo'q — bosh kuryer pulni kuryerdan o'zi so'rab oladi.
            */}
            <span className="text-ink-faint mt-0.5 block text-meta">
              Kuryer ilovasida ko&apos;rinmaydi — pulni kuryerdan o&apos;zingiz so&apos;rab oling
            </span>
          </>
        ) : null}
        {debt.mismatch ? (
          <span className="text-warn mt-1 flex items-start gap-1 text-meta">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {`Server jami ${formatSom(debt.mismatch.server)}, kunlar yig'indisi ${formatSom(debt.mismatch.days)} — tekshirish kerak`}
          </span>
        ) : null}
      </span>
      <ChevronRight className="text-ink-faint size-5 shrink-0" aria-hidden />
    </button>
  );
}
