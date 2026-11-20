"use client";

import type { ChiefMe } from "@/features/chief/types";
import { useSkladLive } from "@/features/sklad/use-sklad-live";

import { SalesSheetView } from "./sales-sheet-view";

/**
 * «Sotuv jadvali» bo'limi (hujjat 83, 85 §2; egasi, 2026-11-20): bitta jadval —
 * sotuv, pul olish va kuryerga berish shu yerda («Pul olish» va «Berish rejasi»
 * tablari olib tashlandi). Sklad soketi tinglanadi: kuryer sotsa, mol berilsa
 * yoki logist tasdiqlasa jadval darhol yangilanadi.
 */
export function SalesSheetSection({ me }: { me: ChiefMe }) {
  useSkladLive(me.seat.id);
  return <SalesSheetView me={me} />;
}
