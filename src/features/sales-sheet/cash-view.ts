import { groupThousands, toIsoDay } from "@/lib/format";

import type { CashReceipt, CourierCash } from "./cash";
import { moneyText } from "./display";

/**
 * «Pul olish» ekranining ko'rinish qoidalari (hujjat 85 §2) — sof funksiyalar.
 * Hisob emas: raqamlar serverdan, bu yerda faqat qaysi biri qayerda va qanday
 * ko'rinishi hal qilinadi.
 */

export type StripItem = {
  /** Oldingi bo'lak bilan amal: birinchisida yo'q. */
  op: "" | "−" | "+" | "=";
  label: string;
  value: string;
  /** «Olinishi kerak» — natija, ajralib turadi. */
  result: boolean;
};

/**
 * Tenglama qatori: Umumiy sotuv − Onlayn − Skidka − Kuryer xizmati + O'tgan
 * qarz = Olinishi kerak − Olindi. Sovg'a umumiy sotuvga kirmaydi (sovg'a qatori
 * 0 so'm — backend 85-javob), shuning uchun tenglamada yo'q; jadvalda ma'lumot
 * uchun turadi. Oraliqda o'tgan qarz — davr boshidagi.
 */
export function cashStrip(cash: CourierCash, single: boolean): StripItem[] {
  return [
    { op: "", label: "Umumiy sotuv", value: moneyText(cash.salesAmount), result: false },
    { op: "−", label: "Onlayn", value: moneyText(cash.onlineAmount), result: false },
    { op: "−", label: "Skidka", value: moneyText(cash.discountAmount), result: false },
    { op: "−", label: "Kuryer xizmati", value: moneyText(cash.feeAmount), result: false },
    { op: "+", label: single ? "O'tgan qarz" : "Davr boshidagi qarz", value: moneyText(cash.openingDebt), result: false },
    { op: "=", label: "Olinishi kerak", value: moneyText(cash.dueTotal), result: true },
    { op: "−", label: "Olindi", value: moneyText(cash.received), result: false },
  ];
}

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

/** Kuryer ostidagi izoh: «22 manzil · 1 atkaz»; atkaz bo'lmasa — «23 manzil». */
export function addressNote(addresses: number, refused: number): string {
  return refused > 0 ? `${groupThousands(addresses)} manzil · ${groupThousands(refused)} atkaz` : `${groupThousands(addresses)} manzil`;
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
