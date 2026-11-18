"use client";

import { cashErrorText } from "../cash";
import type { CourierCash } from "../cash";
import { discountHint } from "../cash-view";
import { moneyText } from "../display";
import type { CourierRef } from "../types";
import { useSaveCourierDiscount } from "../use-sales-sheet";
import { AmountEditor } from "./amount-editor";

/**
 * Skidka (hujjat 85 §2) — bosh kuryer o'zi yozadi, bir kuryer + bir kun =
 * bitta yozuv; `0` — o'chirish. «Olinishi kerak» va qarz serverda qayta
 * hisoblanadi. Server qo'lda yozilganini ajratib bermasa — faqat jami
 * ko'rinadi (noto'g'ri son tahrirga qo'yilmaydi).
 */
export function CourierDiscountEditor({ courier, date, cash }: { courier: CourierRef; date: string; cash: CourierCash }) {
  const save = useSaveCourierDiscount();
  if (cash.discountManual === null) {
    return <span className="text-ink tabular block text-right font-semibold whitespace-nowrap">{moneyText(cash.discountAmount)}</span>;
  }
  return (
    <AmountEditor
      label={`${courier.fullName}: skidka, so'm`}
      saved={cash.discountManual > 0 ? cash.discountManual : null}
      mutation={save}
      toInput={(amount) => ({ courierId: courier.id, date, amount: amount ?? 0, note: "" })}
      successText={(amount) => (amount === null ? `${courier.fullName}: skidka o'chirildi` : `${courier.fullName}: skidka saqlandi`)}
      errorText={(error) => cashErrorText(error, { fallback: "Skidkani saqlab bo'lmadi", forbidden: "Bu kuryer sizga biriktirilmagan" })}
      hint={discountHint(cash)}
    />
  );
}
