"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { SkladView } from "@/features/sklad/components/sklad-view";

/** Sklad (§5): bitta sklad hamma viloyatlaringiz uchun va kuryerlar ombori — faqat ko'rish. */
export default function SkladPage() {
  return (
    <>
      <PageHeader title="Sklad" description="Skladingiz va kuryerlaringiz qo'lidagi mol" />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate permission="warehouse.view_courier_stores">{(me) => <SkladView me={me} />}</ChiefGate>
      </div>
    </>
  );
}
