"use client";

import { feeErrorText } from "../fee";
import type { CourierFee, CourierRef } from "../types";
import { useSaveCourierFee } from "../use-sales-sheet";
import { AmountEditor } from "./amount-editor";

/**
 * Kuryer xizmati (hujjat 83 §3) — bosh kuryer o'zi yozadi, bir kuryer + bir
 * kun = bitta yozuv. «Topshiradi» serverda qayta hisoblanadi (`AmountEditor`).
 */
export function CourierFeeEditor({ courier, date, fee }: { courier: CourierRef; date: string; fee: CourierFee | null }) {
  const save = useSaveCourierFee();
  return (
    <AmountEditor
      label={`${courier.fullName}: kuryer xizmati, so'm`}
      saved={fee?.amount ?? null}
      mutation={save}
      // Izoh bu yerda tahrirlanmaydi — bor izoh summa bilan birga qayta yuboriladi (yo'qolmasin).
      toInput={(amount) => ({ courierId: courier.id, date, amount, note: fee?.note ?? "" })}
      successText={(amount) =>
        amount === null ? `${courier.fullName}: kuryer xizmati o'chirildi` : `${courier.fullName}: kuryer xizmati saqlandi`
      }
      errorText={feeErrorText}
      hint={fee?.note || "so'm, o'zingiz yozasiz"}
      hintIsUserText={Boolean(fee?.note)}
    />
  );
}
