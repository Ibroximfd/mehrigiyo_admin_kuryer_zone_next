"use client";

import { cashErrorText } from "../cash";
import type { CourierCash } from "../cash";
import { onlineHint } from "../cash-view";
import { moneyText } from "../display";
import type { CourierRef } from "../types";
import { useSaveCourierOnline } from "../use-sales-sheet";
import { AmountEditor } from "./amount-editor";

/**
 * Click/onlayn (egasi, 2026-11-20) — bosh kuryer o'zi yozadi, bir kuryer + bir
 * kun = bitta yozuv; `0` — o'chirish. «Topshirishi kerak» serverda qayta
 * hisoblanadi. Server qo'lda yozilganini (`online_manual`) hali bermasa —
 * tizim summasi o'qish uchun (noto'g'ri son tahrirga qo'yilmaydi, hujjat 101 §1).
 */
export function CourierOnlineEditor({ courier, date, cash }: { courier: CourierRef; date: string; cash: CourierCash }) {
  const save = useSaveCourierOnline();
  if (cash.onlineManual === null) {
    return (
      <div className="text-right">
        <span className="text-ink tabular block font-semibold whitespace-nowrap">{moneyText(cash.onlineAmount)}</span>
        <span className="text-ink-faint block text-fine">Click · Payme</span>
      </div>
    );
  }
  return (
    <AmountEditor
      label={`${courier.fullName}: Click, so'm`}
      saved={cash.onlineManual > 0 ? cash.onlineManual : null}
      mutation={save}
      toInput={(amount) => ({ courierId: courier.id, date, amount: amount ?? 0, note: "" })}
      successText={(amount) => (amount === null ? `${courier.fullName}: Click o'chirildi` : `${courier.fullName}: Click saqlandi`)}
      errorText={(error) => cashErrorText(error, { fallback: "Click summasini saqlab bo'lmadi", forbidden: "Bu kuryer sizga biriktirilmagan" })}
      hint={onlineHint(cash)}
    />
  );
}
