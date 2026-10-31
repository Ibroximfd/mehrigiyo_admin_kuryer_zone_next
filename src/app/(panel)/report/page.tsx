"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { ReportView } from "@/features/report/components/report-view";

/** Moliya va hisobot (§4.5, §7): kuryerlar, filiallar bilan hisob, mahsulotlar — davr bo'yicha. */
export default function ReportPage() {
  return (
    <>
      <PageHeader title="Moliya" description="Yetkazilgan mahsulot, manzillar va pul — kuryerlar va filiallar bo'yicha" />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate permission="view.analytics">{(me) => <ReportView me={me} />}</ChiefGate>
      </div>
    </>
  );
}
