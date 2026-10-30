"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { ChiefOrders } from "@/features/chief/components/chief-orders";
import { ChiefSummary } from "@/features/chief/components/chief-summary";

/** Bosh kuryer › Zakazlar (§C 2.2): kelganlar, taqsimlash, faoliyatdagilar. */
export default function ChiefOrdersPage() {
  return (
    <>
      <PageHeader title="Zakazlar" description="Logist bergan zakazlarni o'z kuryerlaringizga taqsimlang" />
      <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
        <ChiefGate>
          {(me) => (
            <>
              <ChiefSummary me={me} />
              <ChiefOrders me={me} />
            </>
          )}
        </ChiefGate>
      </div>
    </>
  );
}
