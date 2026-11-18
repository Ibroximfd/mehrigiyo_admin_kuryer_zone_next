"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { formatMoneyInput } from "@/lib/format";
import { cn } from "@/lib/utils";

import { feeAmountOf, feeErrorText } from "../fee";
import type { CourierFee, CourierRef } from "../types";
import { useSaveCourierFee } from "../use-sales-sheet";

/**
 * Kuryer xizmati (hujjat 83 §3) — bosh kuryer o'zi yozadi, bir kuryer + bir
 * kun = bitta yozuv. Saqlash ochiq amal: Enter yoki «Saqlash» tugmasi (maydon
 * o'zgarganda chiqadi); Esc — bekor. «Topshiradi» serverda qayta hisoblanadi —
 * saqlangach jadval qayta so'raladi, shu kelguncha maydon «saqlanmoqda».
 * Tahrir qilinmayotganda maydon doim serverdagi summani ko'rsatadi.
 */
export function CourierFeeEditor({ courier, date, fee }: { courier: CourierRef; date: string; fee: CourierFee | null }) {
  const id = useId();
  /** `null` — tahrir yo'q: serverdagi qiymat ko'rinadi. */
  const [edited, setEdited] = useState<string | null>(null);
  const save = useSaveCourierFee();

  const saved = fee?.amount ?? null;
  const draft = edited ?? (saved === null ? "" : formatMoneyInput(saved));
  const amount = feeAmountOf(draft);
  const dirty = edited !== null && amount !== saved;
  const error = save.isError ? feeErrorText(save.error) : null;

  const cancel = () => {
    setEdited(null);
    save.reset();
  };

  const submit = () => {
    if (!dirty || save.isPending) return;
    save.mutate(
      // Izoh bu yerda tahrirlanmaydi — bor izoh summa bilan birga qayta yuboriladi (yo'qolmasin).
      { courierId: courier.id, date, amount, note: fee?.note ?? "" },
      {
        onSuccess: () => {
          setEdited(null);
          toast.success(amount === null ? `${courier.fullName}: kuryer xizmati o'chirildi` : `${courier.fullName}: kuryer xizmati saqlandi`);
        },
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-1"
      aria-busy={save.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="sr-only">{`${courier.fullName}: kuryer xizmati, so'm`}</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={draft}
        disabled={save.isPending}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-note`}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          setEdited(formatMoneyInput(event.target.value));
          if (save.isError) save.reset();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancel();
        }}
        className={cn(inputClass, "tabular h-9 px-2 text-right font-semibold")}
      />
      {error ? (
        <p id={`${id}-note`} role="alert" className="text-danger text-right text-fine font-medium">
          {error}
        </p>
      ) : fee?.note ? (
        // Bosh kuryer yozgan izoh — tarjima qilinmaydi.
        <p id={`${id}-note`} className="text-ink-faint truncate text-right text-fine" title={fee.note} data-no-translit>
          {fee.note}
        </p>
      ) : (
        <p id={`${id}-note`} className="text-ink-faint text-right text-fine">
          so&apos;m, o&apos;zingiz yozasiz
        </p>
      )}
      {dirty || save.isPending ? (
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Saqlash
        </Button>
      ) : null}
    </form>
  );
}
