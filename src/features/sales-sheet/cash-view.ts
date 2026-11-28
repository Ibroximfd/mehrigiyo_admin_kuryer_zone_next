import { groupThousands, toIsoDay } from "@/lib/format";

import type { CashReceipt, CourierCash } from "./cash";
import type { SheetFigures } from "./types";

/**
 * Sotuv jadvalidagi pul kataklarining ko'rinish qoidalari (hujjat 85 §2; egasi,
 * 2026-11-20 — «Pul olish» tabi jadvalga qo'shildi) — sof funksiyalar. Hisob
 * emas: raqamlar serverdan, bu yerda faqat qaysi biri qayerda va qanday
 * ko'rinishi hal qilinadi.
 */

/**
 * Qatordagi amal: `take` — «Oldim» tugmasi (qarz bor, bitta kun, dopusk bor);
 * `taken` — «✓ olindi» (qarz qolmagan); `none` — hech narsa (oraliq, raqam
 * kelmagan yoki dopusk yo'q va qarz bor).
 */
export type CashAction = "take" | "taken" | "none";

export function cashAction(cash: CourierCash | null, options: { single: boolean; canAccept: boolean }): CashAction {
  if (!cash || !options.single || cash.closingDebt === null) return "none";
  if (cash.closingDebt <= 0) return "taken";
  return options.canAccept ? "take" : "none";
}

/**
 * «Oldim» oynasidagi jonli izoh: yozilayotgan summa qolgan qarzdan kam yoki ko'p.
 * Faqat ogohlantirish — saqlanmaydi; saqlangach yangi qarzni server beradi.
 */
export type ReceiptHint = { kind: "short" | "over"; amount: number } | null;

export function receiptHint(remaining: number, amount: number): ReceiptHint {
  if (!Number.isFinite(amount) || amount <= 0 || amount === remaining) return null;
  return amount < remaining ? { kind: "short", amount: remaining - amount } : { kind: "over", amount: amount - remaining };
}

/**
 * «Bekor qilish» ko'rinadimi: server `can_delete` bersa — o'sha; bermasa
 * shartnoma qoidasi — yozuv bugun yozilgan bo'lsa (o'zi yozganini server tekshiradi).
 */
export function canCancelReceipt(receipt: CashReceipt, today: string): boolean {
  if (receipt.canDelete !== null) return receipt.canDelete;
  return receipt.at !== null && toIsoDay(receipt.at) === today;
}

/** «Oldim» maydoniga qo'yiladigan summa — qolgan qarz; qarz yo'q yoki ortiqcha olingan — bo'sh (`0`). */
export function remainingDebt(cash: CourierCash): number {
  return cash.closingDebt !== null && cash.closingDebt > 0 ? cash.closingDebt : 0;
}

/** Skidka maydoni ostidagi izoh: tizim chegirmasi bo'lsa — u ham ko'rinsin (jami skidkaga server qo'shadi). */
export function discountHint(cash: CourierCash): string {
  return cash.discountSystem !== null && cash.discountSystem > 0
    ? `+ tizimda ${groupThousands(cash.discountSystem)} (ball)`
    : "so'm, o'zingiz yozasiz";
}

/** Click/onlayn maydoni ostidagi izoh: ilovada oldindan to'langani bo'lsa — u ham ko'rinsin (jamiga server qo'shadi). */
export function onlineHint(cash: CourierCash): string {
  return cash.onlineSystem !== null && cash.onlineSystem > 0
    ? `+ ilovada ${groupThousands(cash.onlineSystem)}`
    : "so'm, o'zingiz yozasiz";
}

/** Jadval va asosiy raqamlardagi pul — `cash` blokidan; u kelmasa (eski server) — umumiy kalitlardan, yo'q bo'lsa `null` («—»). */
export type SheetMoney = {
  /** Umumiy sotuv — sovg'asiz (`gift_in_sales: false`). */
  sales: number;
  online: number;
  discount: number;
  fee: number | null;
  /** Xizmatning qarzdan ayirilgan qismi (28.11 gacha kunlar); 0/`null` — ayirilmaydi. */
  feeDeducted: number | null;
  /** Kuryer topshirishi kerak (o'tgan qarz bilan). */
  due: number | null;
  received: number | null;
  /** Qolgan qarz — ertaga o'tadi. */
  debt: number | null;
  openingDebt: number | null;
};

export function sheetMoney(figures: SheetFigures): SheetMoney {
  const cash = figures.cash;
  return {
    sales: cash?.salesAmount ?? figures.salesAmount,
    online: cash?.onlineAmount ?? figures.onlineAmount,
    discount: cash?.discountAmount ?? figures.discountAmount,
    fee: cash?.feeAmount ?? figures.fee?.amount ?? null,
    feeDeducted: cash?.feeDeducted ?? null,
    due: cash?.dueTotal ?? null,
    received: cash?.received ?? null,
    debt: cash?.closingDebt ?? null,
    openingDebt: cash?.openingDebt ?? null,
  };
}

/**
 * Bu kunga pul yozuvi (Click, skidka, «Oldim») ochiqmi: pul zanjiri boshidan
 * (javob 104 §5) oldingi kunga server yozdirmaydi. Boshi noma'lum — ochiq.
 */
export function cashWritable(date: string, since: string | null): boolean {
  return since === null || date >= since;
}
