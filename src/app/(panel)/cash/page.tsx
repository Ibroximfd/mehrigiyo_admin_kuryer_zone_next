"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefCash } from "@/features/chief/components/chief-cash";
import { ChiefCourierCash } from "@/features/chief/components/chief-courier-cash";
import { ChiefGate } from "@/features/chief/components/chief-gate";

/** Bosh kuryer › Kassa (§C 2.4): 1-pog'ona kuryerlardan qabul, 2-pog'ona bosh logistga topshirish. */
export default function ChiefCashPage() {
  return (
    <>
      <PageHeader title="Kassa" description="Kuryerlardan yig'ilgan pul va bosh logistga topshirish" />
      <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
        <ChiefGate>
          {() => (
            <>
              <ChiefCourierCash />
              <ChiefCash />
            </>
          )}
        </ChiefGate>
      </div>
    </>
  );
}
