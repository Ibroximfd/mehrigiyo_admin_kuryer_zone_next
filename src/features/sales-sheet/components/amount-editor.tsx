"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { Check, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { formatMoneyInput } from "@/lib/format";
import { cn } from "@/lib/utils";

import { feeAmountOf } from "../fee";

/**
 * Jadval katagidagi summa — bosh kuryer o'zi yozadigan pul (kuryer xizmati,
 * skidka): bir kuryer + bir kun = bitta yozuv. Saqlash ochiq amal: Enter yoki
 * «Saqlash» tugmasi (maydon o'zgarganda chiqadi); Esc — bekor. Bo'sh yoki `0` —
 * yozuv o'chadi (83 §3, 85 §2 da qoida bir xil). Saqlangach jadval qayta
 * so'raladi, shu kelguncha maydon «saqlanmoqda». Tahrir qilinmayotganda maydon
 * doim serverdagi summani ko'rsatadi.
 */
export function AmountEditor<TInput>({
  label,
  saved,
  mutation,
  toInput,
  successText,
  errorText,
  hint,
  hintIsUserText = false,
}: {
  /** Ekran o'quvchi yorlig'i (kuryer nomi bilan). */
  label: string;
  /** Serverdagi summa; `null` — yozilmagan. */
  saved: number | null;
  mutation: UseMutationResult<void, Error, TInput>;
  /** Maydondagi summa → so'rov; `null` — bo'sh yoki `0`. */
  toInput: (amount: number | null) => TInput;
  successText: (amount: number | null) => string;
  errorText: (error: unknown) => string;
  /** Xato yo'q paytda maydon ostidagi izoh. */
  hint: string;
  /** Izoh bosh kuryer yozgan matn — tarjima qilinmaydi, uzuni qisqartiriladi. */
  hintIsUserText?: boolean;
}) {
  const id = useId();
  /** `null` — tahrir yo'q: serverdagi qiymat ko'rinadi. */
  const [edited, setEdited] = useState<string | null>(null);

  const draft = edited ?? (saved === null ? "" : formatMoneyInput(saved));
  const amount = feeAmountOf(draft);
  const dirty = edited !== null && amount !== saved;
  const error = mutation.isError ? errorText(mutation.error) : null;

  const cancel = () => {
    setEdited(null);
    mutation.reset();
  };

  const submit = () => {
    if (!dirty || mutation.isPending) return;
    mutation.mutate(toInput(amount), {
      onSuccess: () => {
        setEdited(null);
        toast.success(successText(amount));
      },
    });
  };

  return (
    <form
      className="flex flex-col gap-1"
      aria-busy={mutation.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={draft}
        disabled={mutation.isPending}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-note`}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          setEdited(formatMoneyInput(event.target.value));
          if (mutation.isError) mutation.reset();
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
      ) : hintIsUserText ? (
        <p id={`${id}-note`} className="text-ink-faint truncate text-right text-fine" title={hint} data-no-translit>
          {hint}
        </p>
      ) : (
        <p id={`${id}-note`} className="text-ink-faint text-right text-fine">
          {hint}
        </p>
      )}
      {dirty || mutation.isPending ? (
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Saqlash
        </Button>
      ) : null}
    </form>
  );
}
