import type { SkladAddressRow, SkladFlow, SkladRegionRow, SkladSheet } from "./types";

/**
 * Sanadan sanagacha jadvali (hujjat 85 §1.5, egasi sheet'i 09–14.11): har kun
 * ikki qator — sotuv va sovg'a (`days[]`), o'ngda kun bo'yicha manzil va kuryer
 * xizmati (`address_rows[]`). «Itogo» — davr bo'yicha serverning `sold`/`gift` i.
 */

export type RangeDayLine = {
  date: string;
  /** `days[]` da bu kun yoki blok yo'q — `null` («—»), nol emas. */
  sold: SkladFlow | null;
  gift: SkladFlow | null;
  /** Shu kun uchun `address_rows[]` qatori; yo'q — «—». */
  address: SkladAddressRow | null;
};

export type RangeSheetModel = {
  days: RangeDayLine[];
  totals: {
    sold: SkladFlow | null;
    gift: SkladFlow | null;
    /**
     * Manzil va atkaz soni davr bo'yicha — kunlik sonlar yig'indisi (pul ham, mol
     * ham emas; server davr jamisini bermaydi). Qator yo'q yoki birorta kunda son
     * kelmagan — `null`. Kuryer xizmati jami pul — server bermaguncha ko'rsatilmaydi.
     */
    addresses: number | null;
    refusedAddresses: number | null;
  };
};

export function buildRangeSheet(sheet: SkladSheet): RangeSheetModel {
  const dayByDate = new Map(sheet.days.map((day) => [day.date, day]));
  const addressByDate = new Map(sheet.addressRows.map((row) => [row.date, row]));
  const dates = [...new Set([...dayByDate.keys(), ...addressByDate.keys()])].filter(Boolean).sort();
  return {
    days: dates.map((date) => ({
      date,
      sold: dayByDate.get(date)?.sold ?? null,
      gift: dayByDate.get(date)?.gift ?? null,
      address: addressByDate.get(date) ?? null,
    })),
    totals: {
      sold: sheet.sold,
      gift: sheet.gift,
      addresses: countTotal(sheet.addressRows.map((row) => row.addresses)),
      refusedAddresses: countTotal(sheet.addressRows.map((row) => row.refusedAddresses)),
    },
  };
}

/** Kunlik sonlar yig'indisi; bo'sh ro'yxat yoki yo'q son — `null` (to'liq bo'lmagan jami ko'rsatilmaydi). */
function countTotal(values: readonly (number | null)[]): number | null {
  if (values.length === 0 || values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export type RegionOption = { value: string; label: string };

/**
 * Hudud tanlovi: javobdagi hududlar (`rows[]`) va skladingiz viloyatlari —
 * hudud tanlanganda javob faqat shu hududni qaytaradi, ro'yxat qisqarmasin.
 * Tanlangan qiymat ro'yxatda bo'lmasa ham saqlanadi (havola bilan kelingan).
 */
export function regionOptions(
  rows: readonly SkladRegionRow[],
  known: readonly RegionOption[],
  selected: string | null,
): RegionOption[] {
  const byValue = new Map<string, RegionOption>();
  for (const option of known) byValue.set(option.value, option);
  for (const row of rows) if (row.region) byValue.set(row.region, { value: row.region, label: row.regionName });
  if (selected && !byValue.has(selected)) byValue.set(selected, { value: selected, label: selected });
  return [...byValue.values()];
}
