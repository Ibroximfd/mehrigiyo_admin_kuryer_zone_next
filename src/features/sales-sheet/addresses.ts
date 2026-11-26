import { groupThousands } from "@/lib/format";

import type { SheetFigures } from "./types";

/**
 * «Borganda atkaz» qo'shimcha manzil bilan (2026-11-26, egasi): yetkazilgan
 * zakazning asosiy manzili — 1 ta «yetkazilgan», unga qo'shilgan qo'shimcha
 * manzil — «borganda atkaz» (alohida ustun emas). Server
 * `refused_addresses_total` bersa — shu (backend hujjati 134); bermaguncha
 * ikki server sonining yig'indisi.
 */
export function refusedWithExtra(
  figures: Pick<SheetFigures, "refusedAddresses" | "refusedAddressesTotal" | "extraAddresses">,
): number {
  return figures.refusedAddressesTotal ?? figures.refusedAddresses + (figures.extraAddresses ?? 0);
}

/** Katak izohi: shundan qo'shimcha manzil; yo'q bo'lsa — `undefined` (izoh chiqmaydi). */
export function extraShareHint(figures: Pick<SheetFigures, "extraAddresses">): string | undefined {
  return figures.extraAddresses ? `shundan qo'shimcha manzil: ${groupThousands(figures.extraAddresses)}` : undefined;
}
