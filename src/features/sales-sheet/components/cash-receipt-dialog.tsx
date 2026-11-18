"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { HandCoins, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatClock, formatMoneyInput, formatSom, groupThousands, parseMoneyInput, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CourierCashInput } from "../api";
import { cashErrorText } from "../cash";
import type { CashReceipt, CourierCash } from "../cash";
import { canCancelReceipt, receiptHint, remainingDebt } from "../cash-view";
import { fullDate, moneyText } from "../display";
import type { CourierRef } from "../types";
import { useAddCashReceipt, useCancelCashReceipt } from "../use-sales-sheet";

/**
 * «Oldim» oynasi (hujjat 85 §2; logist Kassa'sidagi «Oldim» bilan bir xil
 * tartib): summa qolgan qarz bilan to'ldirilgan, izoh ixtiyoriy, kam yoki ko'p
 * yozilsa jonli ogohlantirish. Saqlangach jadval qayta so'raladi — yangi qarzni
 * server beradi. Shu kungi yozuvlar ro'yxati ham shu yerda: noto'g'ri yozilgani
 * «Bekor qilish» bilan o'chiriladi (server ruxsat bergan bo'lsa).
 *
 * `cash` — jadvaldagi joriy raqamlar: yozuv bekor qilinsa oyna ochiq qoladi va
 * yangi raqamlar bilan qayta chiziladi.
 */
export function CashReceiptDialog({
  courier,
  date,
  cash,
  canAccept,
  onClose,
}: {
  courier: CourierRef;
  date: string;
  cash: CourierCash;
  canAccept: boolean;
  onClose: () => void;
}) {
  const receive = useAddCashReceipt();
  const remaining = remainingDebt(cash);
  return (
    <Dialog open onOpenChange={(next) => !next && !receive.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>
          <span data-no-translit>{courier.fullName}</span>
          {" — pul olish"}
        </DialogTitle>
        <DialogDescription>
          {`${fullDate(date)} · olinishi kerak ${moneyText(cash.dueTotal)}`}
          {cash.received ? ` · olindi ${moneyText(cash.received)} · qoldi ${moneyText(cash.closingDebt)}` : null}
        </DialogDescription>

        <ReceiptList receipts={cash.receipts} canAccept={canAccept} />

        {canAccept ? (
          // Qarz o'zgarsa (yozuv bekor qilindi) — summa yangi qoldiq bilan qayta to'ldiriladi.
          <ReceiptForm key={remaining} courier={courier} date={date} remaining={remaining} mutation={receive} onDone={onClose} />
        ) : (
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Yopish
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceiptForm({
  courier,
  date,
  remaining,
  mutation,
  onDone,
}: {
  courier: CourierRef;
  date: string;
  remaining: number;
  mutation: UseMutationResult<void, Error, CourierCashInput>;
  onDone: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(remaining > 0 ? formatMoneyInput(remaining) : "");
  const [note, setNote] = useState("");
  const amount = parseMoneyInput(draft);
  const valid = Number.isFinite(amount) && amount > 0;
  const hint = valid ? receiptHint(remaining, amount) : null;
  const serverError = mutation.isError
    ? cashErrorText(mutation.error, { fallback: "Pulni yozib bo'lmadi", forbidden: "Bu kuryer sizga biriktirilmagan" })
    : undefined;

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || mutation.isPending) return;
        mutation.mutate(
          { courierId: courier.id, date, amount, note },
          {
            onSuccess: () => {
              toast.success(`${formatSom(amount)} olindi`);
              onDone();
            },
          },
        );
      }}
    >
      <Field
        label="Olingan summa, so'm"
        htmlFor={`${id}-amount`}
        error={serverError ?? (draft && !valid ? "Summa noldan katta bo'lsin" : undefined)}
      >
        <input
          id={`${id}-amount`}
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          aria-invalid={Boolean(serverError) || (Boolean(draft) && !valid)}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            setDraft(formatMoneyInput(event.target.value));
            if (mutation.isError) mutation.reset();
          }}
          className={cn(inputClass, "tabular text-lg2 font-semibold")}
        />
      </Field>
      <Field label="Izoh" htmlFor={`${id}-note`}>
        <input
          id={`${id}-note`}
          value={note}
          maxLength={255}
          placeholder="Ixtiyoriy"
          onChange={(event) => setNote(event.target.value)}
          className={inputClass}
        />
      </Field>
      {hint ? (
        <p role="status" className="bg-warn-soft text-warn rounded-lg px-3 py-2 text-meta font-medium">
          {hint.kind === "short"
            ? `Kam olindi: ${groupThousands(hint.amount)} — qarz bo'lib ertangi kunga qo'shiladi`
            : `Olinishi kerakdan ${groupThousands(hint.amount)} ko'p — ortig'i ertangi qarzdan ayriladi`}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} disabled={mutation.isPending}>
          Yopish
        </Button>
        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <HandCoins />}
          Oldim
        </Button>
      </div>
    </form>
  );
}

/** Shu kungi «Oldim» yozuvlari; bekor qilish — ikki qadam (tasodifiy bosish pulni o'chirmasin). */
function ReceiptList({ receipts, canAccept }: { receipts: readonly CashReceipt[]; canAccept: boolean }) {
  const cancel = useCancelCashReceipt();
  const [confirming, setConfirming] = useState<number | null>(null);
  if (receipts.length === 0) return null;
  const today = todayIso();
  return (
    <section aria-label="Olingan pullar" className="mt-4">
      <h3 className="text-ink-muted text-meta font-semibold">Olingan pullar</h3>
      <ul className="border-line divide-line mt-1.5 divide-y rounded-xl border">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <span className="text-ink tabular text-dense font-semibold">{moneyText(receipt.amount)}</span>
            <span className="text-ink-faint tabular text-meta">{receipt.at ? formatClock(receipt.at) : "—"}</span>
            {receipt.byName ? (
              <span className="text-ink-muted text-meta" data-no-translit>
                {receipt.byName}
              </span>
            ) : null}
            {receipt.note ? (
              <span className="text-ink-faint min-w-0 truncate text-meta" title={receipt.note} data-no-translit>
                {receipt.note}
              </span>
            ) : null}
            {canAccept && canCancelReceipt(receipt, today) ? (
              confirming === receipt.id ? (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="text-danger text-meta font-medium">Bekor qilinsinmi?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(receipt.id, {
                        onSuccess: () => {
                          setConfirming(null);
                          toast.success(`${moneyText(receipt.amount)} so'm yozuvi bekor qilindi`);
                        },
                      })
                    }
                  >
                    {cancel.isPending ? <LoaderCircle className="animate-spin" /> : null}
                    Ha, bekor qilish
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => setConfirming(null)}>
                    Yo&apos;q
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => {
                    cancel.reset();
                    setConfirming(receipt.id);
                  }}
                >
                  Bekor qilish
                </Button>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {cancel.isError ? (
        <p role="alert" className="text-danger mt-1.5 text-meta font-medium">
          {cashErrorText(cancel.error, {
            fallback: "Yozuvni bekor qilib bo'lmadi",
            forbidden: "Faqat bugun va o'zingiz yozgan yozuv bekor qilinadi",
          })}
        </p>
      ) : null}
    </section>
  );
}
