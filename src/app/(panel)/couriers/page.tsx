"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefCouriers } from "@/features/chief/components/chief-couriers";
import { ChiefGate } from "@/features/chief/components/chief-gate";

/** Kuryerlar (§4.5, §5b): yaratish, zonaga biriktirish, o'tkazish, bloklash. */
export default function CouriersPage() {
  return (
    <>
      <PageHeader title="Kuryerlar" description="Kuryer qo'shing, zonaga biriktiring yoki bloklang" />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <ChiefCouriers me={me} />}</ChiefGate>
      </div>
    </>
  );
}
