"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { SalesSheetSection } from "@/features/sales-sheet/components/sales-sheet-section";

/**
 * Sotuv jadvali (hujjat 83, 85 §2; egasi, 2026-11-20): egasi Google Sheet'idagi
 * kunlik «SOTUV» jadvali — kuryer × mahsulot, pul, manzil. Kuryerga berish va
 * kuryerdan pul olish ham shu yerda.
 */
export default function SheetPage() {
  return (
    <>
      <PageHeader
        title="Sotuv jadvali"
        description="Har kuryer: berildi → sotildi → sovg'a → qoldi, berish kerak; pul — topshirishi kerak va topshirdi. Qoldiq ertangi kunga o'zi o'tadi."
      />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <SalesSheetSection me={me} />}</ChiefGate>
      </div>
    </>
  );
}
