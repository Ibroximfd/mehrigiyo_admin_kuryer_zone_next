"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/kit/page-header";
import { fetchChiefCash, fetchCourierDebts } from "@/features/cash/api";
import { CourierCodSheet } from "@/features/cash/components/courier-cod-sheet";
import { CourierCollection } from "@/features/cash/components/courier-collection";
import { CourierDebts } from "@/features/cash/components/courier-debts";
import { debtTotals } from "@/features/cash/courier-debts";
import { FilialHandovers } from "@/features/cash/components/filial-handovers";
import { fetchChiefCouriers } from "@/features/chief/api";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { chiefCan } from "@/features/chief/types";
import { queryKeys } from "@/lib/query-keys";

/** Kassa (§6): kuryerdan qabul → har filialga alohida, to'liq topshirish. */
export default function CashPage() {
  return (
    <>
      <PageHeader title="Kassa" description="Kuryerlardan pulni qabul qiling va har filialga to'liq topshiring" />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <CashSections canAccept={chiefCan(me, "cash.accept")} />}</ChiefGate>
      </div>
    </>
  );
}

function CashSections({ canAccept }: { canAccept: boolean }) {
  const [open, setOpen] = useState<{ id: number; fullName: string } | null>(null);
  const cash = useQuery({ queryKey: queryKeys.chiefCash, queryFn: ({ signal }) => fetchChiefCash({}, signal) });
  // Yangi server `chief/cash/` da kuryerlar pulini o'zi beradi (59-javob B1). Eski serverda —
  // har kuryerning naqd hisobidan (zaxira, faqat blok yo'q bo'lsa so'raladi).
  const server = cash.data?.courierMoney ?? null;
  const needsFallback = cash.isSuccess && server === null;
  const couriers = useQuery({
    queryKey: queryKeys.chiefCouriers,
    queryFn: ({ signal }) => fetchChiefCouriers(signal),
    enabled: needsFallback,
  });
  const list = couriers.data ?? [];
  const fallback = useQuery({
    queryKey: queryKeys.chiefCourierDebts(list.map((courier) => courier.id)),
    queryFn: ({ signal }) => fetchCourierDebts(list, signal),
    enabled: needsFallback && couriers.isSuccess,
  });
  const debts = server?.debts ?? fallback.data;
  const totals = server?.totals ?? (fallback.data ? debtTotals(fallback.data) : null);
  // Zaxirada ham `?open=1` ni bilsa — cheklovsiz; bilmasa oxirgi 31 kun.
  const complete = server !== null || (fallback.data?.every((debt) => debt.complete) ?? false);

  return (
    <div className="flex flex-col gap-6">
      {canAccept ? null : (
        <p role="status" className="bg-subtle text-ink-muted flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Pul qabul qilish va topshirish dopuski yo&apos;q — kassani faqat ko&apos;rasiz. Dopuskni bosh logist beradi.
        </p>
      )}
      <FilialHandovers
        courierMoney={totals}
        canAccept={canAccept}
        courierSection={
          <CourierDebts
            debts={debts}
            complete={complete}
            isPending={cash.isPending || (needsFallback && (couriers.isPending || fallback.isPending))}
            error={needsFallback ? (couriers.error ?? fallback.error) : null}
            onRetry={() => void (couriers.isError ? couriers.refetch() : fallback.refetch())}
            onOpen={setOpen}
          />
        }
      />
      <CourierCollection canAccept={canAccept} />
      {open ? <CourierCodSheet courier={open} canAccept={canAccept} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
