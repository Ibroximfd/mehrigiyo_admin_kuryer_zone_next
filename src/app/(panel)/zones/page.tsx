"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { ChiefZones } from "@/features/chief/components/chief-zones";

/** Zonalar (§5b): o'z viloyatlari ichida tuman va shaharlarni zonalarga bo'lish. */
export default function ZonesPage() {
  return (
    <>
      <PageHeader title="Zonalar" description="Viloyatlaringizni zonalarga bo'ling — zakaz zona kuryeriga tushadi" />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <ChiefZones me={me} />}</ChiefGate>
      </div>
    </>
  );
}
