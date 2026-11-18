"use client";

import { useQuery } from "@tanstack/react-query";
import { Info, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/kit/page-header";
import { fetchChiefCash } from "@/features/cash/api";
import { CASH_PERIOD_VALUES } from "@/features/cash/cash-sheet-view";
import { CashSheetSection } from "@/features/cash/components/cash-sheet-section";
import { FilialHandovers, HandoverDialog } from "@/features/cash/components/filial-handovers";
import type { HandoverTarget } from "@/features/cash/components/filial-handovers";
import { useCashSheet } from "@/features/cash/use-cash-sheet";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { chiefCan } from "@/features/chief/types";
import { useSheetPeriod } from "@/features/sales-sheet/use-sheet-period";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";

/**
 * Kassa (hujjat 85 §3): nima sotildi va har filialga qancha topshirish kerak.
 * Kuryerdan pul endi «Sotuv jadvali › Pul olish»da olinadi — «Kuryerdan qabul
 * qilish» bo'limi olib tashlandi (egasi qarori, 2026-11-18: bir pul ikki
 * marta qabul qilinmasin).
 */
export default function CashPage() {
  return (
    <>
      <PageHeader
        title="Kassa"
        description="Filialga qancha pul berishingiz kerak: nima sotildi, naqd, onlayn, sovg'a va skidka — topshiriladigan va topshirilgan summa"
      />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <CashSections canAccept={chiefCan(me, "cash.accept")} />}</ChiefGate>
      </div>
    </>
  );
}

/**
 * Jadval (`chief/report/cash-sheet/`) va topshiriqlar tarixi (`chief/cash/`).
 * Jadval hali yo'q yoki ochilmasa — eski filial qatorlari ko'rinadi: pulni
 * bugun ham topshirish mumkin. «Topshirdim» ikkala joyda ham mavjud oynani ochadi.
 */
function CashSections({ canAccept }: { canAccept: boolean }) {
  const controls = useSheetPeriod(CASH_PERIOD_VALUES);
  const sheet = useCashSheet(controls.range);
  const cash = useQuery({ queryKey: queryKeys.chiefCash, queryFn: ({ signal }) => fetchChiefCash({}, signal) });
  const [target, setTarget] = useState<HandoverTarget | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {canAccept ? null : (
        <p role="status" className="bg-subtle text-ink-muted flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Pulni topshirish dopuski yo&apos;q — kassani faqat ko&apos;rasiz. Dopuskni bosh logist beradi.
        </p>
      )}
      <p className="bg-subtle text-ink-muted flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Kuryerdan pul endi shu bo&apos;limda olinadi:{" "}
          <Link href={`${ROUTES.sheet}?tab=cash`} className="text-brand font-semibold hover:underline focus-visible:underline focus-visible:outline-none">
            Sotuv jadvali › Pul olish
          </Link>
        </span>
      </p>
      <CashSheetSection controls={controls} query={sheet} onHandover={canAccept && cash.data ? setTarget : null} />
      {/* Jadval javobi yo'q (server chiqarmagan, xato, ruxsat yo'q) — eski qatorlar bilan topshirish ishlayveradi. */}
      <FilialHandovers canAccept={canAccept} legacy={sheet.isError && sheet.data === undefined} />
      {target && cash.data ? <HandoverDialog cash={cash.data} initial={target} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}
