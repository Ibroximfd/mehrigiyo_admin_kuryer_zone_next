"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { ChiefOrders } from "@/features/chief/components/chief-orders";
import { ChiefSummary } from "@/features/chief/components/chief-summary";

/** Zakazlar (§5a, 2-bosqich): logist bergan zakazlarni zona bo'yicha kuryerlarga — avto yoki qo'lda. */
export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Zakazlar" description="Kelgan zakazlarni kuryerlarga zona bo'yicha taqsimlang" />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
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
