"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { ChiefStats } from "@/features/chief/components/chief-stats";

/** Bosh kuryer › Analitika (§C 2.5). */
export default function ChiefStatsPage() {
  return (
    <>
      <PageHeader title="Statistika" description="Kuryerlar bo'yicha: yetkazildi, atkaz, manzil va haq" />
      <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
        <ChiefGate>{() => <ChiefStats />}</ChiefGate>
      </div>
    </>
  );
}
