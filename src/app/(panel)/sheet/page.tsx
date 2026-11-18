"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { SalesSheetSection } from "@/features/sales-sheet/components/sales-sheet-section";

/** Sotuv jadvali va berish rejasi (hujjat 83): egasi Google Sheet'idagi kunlik «SOTUV» jadvali — kuryer × mahsulot, pul, manzil. */
export default function SheetPage() {
  return (
    <>
      <PageHeader title="Sotuv jadvali" description="Har kuryer bo'yicha: berildi → sotildi → sovg'a → qoldi. Qoldiq ertangi kunga o'zi o'tadi." />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <SalesSheetSection me={me} />}</ChiefGate>
      </div>
    </>
  );
}
