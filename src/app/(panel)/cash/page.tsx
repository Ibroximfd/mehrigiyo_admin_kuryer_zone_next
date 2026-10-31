"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/kit/page-header";
import { CourierCollection } from "@/features/cash/components/courier-collection";
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
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const collectedToday = couriers.data ? couriers.data.reduce((sum, courier) => sum + courier.today.codTotal, 0) : null;
  return (
    <div className="flex flex-col gap-6">
      {canAccept ? null : (
        <p role="status" className="bg-subtle text-ink-muted flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-meta">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Pul qabul qilish va topshirish dopuski yo&apos;q — kassani faqat ko&apos;rasiz. Dopuskni bosh logist beradi.
        </p>
      )}
      <FilialHandovers collectedToday={collectedToday} canAccept={canAccept} />
      <CourierCollection canAccept={canAccept} />
    </div>
  );
}
