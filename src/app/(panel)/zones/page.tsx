"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { ChiefZones } from "@/features/chief/components/chief-zones";

/** Bosh kuryer › Zonalar (§C 2.3) — o'z viloyati. */
export default function ChiefZonesPage() {
  return (
    <>
      <PageHeader title="Zonalar" description="Viloyatingiz tumanlarini zonalarga bo'ling" />
      <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
        <ChiefGate>{(me) => <ChiefZones me={me} />}</ChiefGate>
      </div>
    </>
  );
}
