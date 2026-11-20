import { shiftIsoDay } from "@/lib/iso-day";

import { shortDate } from "./period";
import { cellOf, isEmptyFlow } from "./types";
import type { SkladFlow, SkladProduct, SkladSheet } from "./types";

/**
 * Kunlik jadval qatorlari (hujjat 85 §1, egasi sheet'i 17.11.2026) tartibi:
 * kun boshiga qoldiq → korxonadan keldi → hudud × kuryer (sotuv, sovg'a) →
 * JAMI sotuv, sovg'a → korxonaga qaytdi → chiqim (faqat bo'lsa) → tuzatish
 * (faqat bo'lsa) → ertangi kun boshiga qoldiq. Har son — serverdan, bu yerda
 * faqat tartib va yorliq. Ogohlantirish faqat tuzatishga (`other`) — chiqim
 * oddiy harakat (hujjat 92 §3).
 */

/** Qator rangi — ma'nosi yorliqda ham yozilgan (rang yagona signal emas). */
export type SheetTone = "stock" | "brand" | "ok" | "okStrong" | "gift" | "giftStrong" | "danger" | "warn" | "info";

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

/**
 * Logist tasdiqlamagan sotuv (97 §3). Egasi (2026-11-20, hujjat 101 §6): bosh
 * kuryerda u darhol hisoblanadi. Server shunday bersa (`pendingIncluded`) —
 * u sotuv va «kun oxiri» ichida, bu yerda faqat «shundan» ma'lumot qatori.
 * Eski serverda — alohida qatorlar, oxirida «hozirgi qoldiq» (`current.total`):
 * tepadagi «Hozirgi qoldiq» Jamisi bilan bir xil son, ikkala jadval bog'lanadi.
 */
function pendingLines(sheet: SkladSheet, isToday: boolean): DaySheetLine[] {
  const hasPending = !isEmptyFlow(sheet.soldPending) || !isEmptyFlow(sheet.giftPending);
  if (!hasPending) return [];
  if (sheet.pendingIncluded) {
    return [
      ...(isEmptyFlow(sheet.soldPending) ? [] : [total("sold-pending", "Shundan logist tasdiqlamagan · sotuv", "info", sheet.soldPending)]),
      ...(isEmptyFlow(sheet.giftPending) ? [] : [total("gift-pending", "Shundan logist tasdiqlamagan · sovg'a", "info", sheet.giftPending)]),
    ];
  }
  const now = isToday && sheet.current ? [total("now", "Hozirgi qoldiq (tasdiqlanmagani ayirilgan)", "stock", { items: sheet.current.total, amount: null }, "show")] : [];
  return [
    ...(isEmptyFlow(sheet.soldPending) ? [] : [total("sold-pending", "Logist tasdiqlamagan · sotuv", "info", sheet.soldPending)]),
    ...(isEmptyFlow(sheet.giftPending) ? [] : [total("gift-pending", "Logist tasdiqlamagan · sovg'a", "info", sheet.giftPending)]),
    ...now,
  ];
}

/** `day` — so'ralgan kun (URLdan): ertangi kun yorlig'i javobdagi sanaga bog'lanmaydi. `isToday` — hozirgi qoldiq bilan bog'lash uchun. */
export function buildDaySheet(sheet: SkladSheet, day: string, isToday = false): DaySheetModel {
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
      ...(isEmptyFlow(sheet.writeOff) ? [] : [total("write-off", "− Chiqim (spisaniye)", "danger", sheet.writeOff)]),
      ...(hasAdjustment ? [total("other", "Tuzatish", "warn", sheet.other, "blank", true)] : []),
      total("closing", `${shortDate(nextDay)} kun boshiga qoldiq`, "stock", sheet.closing, "show"),
      ...pendingLines(sheet, isToday),
    ],
    hasAdjustment,
  };
}

export type StockDrift = { product: SkladProduct; closing: number; now: number };

/**
 * Bugungi «kun oxiri» = hozirgi Jami bo'lishi shart — ikkalasi ham serverdan.
 * Farq — ma'lumot xatosi: ochiq ko'rsatiladi (backend hujjat 101 §3). Eski
 * serverda tasdiqlanmagan sotuv bo'lsa solishtirilmaydi — u alohida qatorda.
 */
export function stockDrift(sheet: SkladSheet, count: (cell: { qty: number; pieces: number; piecesTotal?: number } | undefined, product: SkladProduct) => number): StockDrift[] {
  const current = sheet.current;
  const closing = sheet.closing;
  if (!current || !closing) return [];
  // Tasdiqlanmagan sotuv «kun oxiri» ga kirmagan (eski server) — solishtirilmaydi, u alohida qatorlarda.
  const pending = !isEmptyFlow(sheet.soldPending) || !isEmptyFlow(sheet.giftPending) || Object.keys(current.pending).length > 0;
  if (pending && !sheet.pendingIncluded) return [];
  return sheet.products
    .map((product) => ({ product, closing: count(cellOf(closing.items, product.id), product), now: count(cellOf(current.total, product.id), product) }))
    .filter((row) => row.closing !== row.now);
}
