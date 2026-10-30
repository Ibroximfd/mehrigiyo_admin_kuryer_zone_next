"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefCouriers } from "@/features/chief/components/chief-couriers";
import { ChiefGate } from "@/features/chief/components/chief-gate";

/** Bosh kuryer › Kuryerlar (§C 2.3). */
export default function ChiefCouriersPage() {
  return (
    <>
      <PageHeader title="Kuryerlar" description="Jamoangiz — qo'shish, zonalar, faollik" />
      <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
        <ChiefGate>{(me) => <ChiefCouriers me={me} />}</ChiefGate>
      </div>
    </>
  );
}
