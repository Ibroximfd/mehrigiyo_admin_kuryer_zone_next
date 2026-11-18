import { shiftIsoDay } from "@/lib/iso-day";

import { shortDate } from "./period";
import { isEmptyFlow } from "./types";
import type { SkladFlow, SkladSheet } from "./types";

/**
 * Kunlik jadval qatorlari (hujjat 85 §1, egasi sheet'i 17.11.2026) tartibi:
 * kun boshiga qoldiq → korxonadan keldi → hudud × kuryer (sotuv, sovg'a) →
 * JAMI sotuv, sovg'a → korxonaga qaytdi → tuzatish (faqat bo'lsa) → ertangi
 * kun boshiga qoldiq. Har son — serverdan, bu yerda faqat tartib va yorliq.
 */

/** Qator rangi — ma'nosi yorliqda ham yozilgan (rang yagona signal emas). */
export type SheetTone = "stock" | "brand" | "ok" | "okStrong" | "gift" | "giftStrong" | "danger" | "warn";

export type DaySheetLine =
  | {
      kind: "total";
      key: string;
      label: string;
      tone: SheetTone;
      /** `null` — javobda blok yo'q: kataklar «—». */
      flow: SkladFlow | null;
      /** `show` — nol katak «0» (qoldiq: «hech narsa qolmadi» ham ma'lumot); `blank` — bo'sh. */
      zero: "blank" | "show";
      /** Ishorali harakat («+3», «−2») — tuzatish qatori. */
      signed: boolean;
    }
  | {
      kind: "courier";
      key: string;
      regionName: string;
      /** `null` — kuryersiz yetkazilgan zakaz. */
      courierName: string | null;
      flowLabel: "sotuv" | "sovg'a";
      tone: SheetTone;
      flow: SkladFlow | null;
      /** Hudud × kuryer blokining birinchi qatori — hudud va kuryer kataklari shu yerda (ikki qatorga). */
      blockStart: boolean;
    };

export type DaySheetModel = {
  /** Hudud × kuryer qatorlaridan oldingi, ular va keyingi qatorlar — jadval tartibida. */
  head: DaySheetLine[];
  couriers: DaySheetLine[];
  tail: DaySheetLine[];
  /** `other` noldan farqli — «Tuzatish» qatori chiqdi, ogohlantirish kerak. */
  hasAdjustment: boolean;
};

function total(key: string, label: string, tone: SheetTone, flow: SkladFlow | null, zero: "blank" | "show" = "blank", signed = false): DaySheetLine {
  return { kind: "total", key, label, tone, flow, zero, signed };
}

/** `day` — so'ralgan kun (URLdan): ertangi kun yorlig'i javobdagi sanaga bog'lanmaydi. */
export function buildDaySheet(sheet: SkladSheet, day: string): DaySheetModel {
  const hasAdjustment = !isEmptyFlow(sheet.other);
  const nextDay = shiftIsoDay(day, 1);
  const couriers = sheet.rows.flatMap((row, index): DaySheetLine[] => {
    const key = `${row.region}-${row.courier?.id ?? "none"}-${index}`;
    const shared = { kind: "courier" as const, regionName: row.regionName, courierName: row.courier?.fullName ?? null };
    return [
      { ...shared, key: `${key}-sold`, flowLabel: "sotuv", tone: "ok", flow: row.sold, blockStart: true },
      { ...shared, key: `${key}-gift`, flowLabel: "sovg'a", tone: "gift", flow: row.gift, blockStart: false },
    ];
  });
  return {
    head: [
      total("opening", "Kun boshiga qoldiq", "stock", sheet.opening, "show"),
      total("from-company", "+ Korxonadan keldi", "brand", sheet.fromCompany),
    ],
    couriers,
    tail: [
      total("sold", "JAMI · sotuv", "okStrong", sheet.sold),
      total("gift", "JAMI · sovg'a", "giftStrong", sheet.gift),
      total("to-company", "− Korxonaga qaytdi", "danger", sheet.toCompany),
      ...(hasAdjustment ? [total("other", "Tuzatish", "warn", sheet.other, "blank", true)] : []),
      total("closing", `${shortDate(nextDay)} kun boshiga qoldiq`, "stock", sheet.closing, "show"),
    ],
    hasAdjustment,
  };
}
