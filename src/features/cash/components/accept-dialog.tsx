"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { HandCoins, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { errorCode, errorMessage } from "@/lib/api-client";
import { formatMoneyInput, formatSom, formatUzDate, parseMoneyInput } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { settleCourierCash } from "../api";

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

/** Qabul: bir kun yoki oraliq; sanalgan summa e'londan kam bo'lsa farq kuryerda qarz (P3, P4). */
export function AcceptDialog({
  courier,
  date,
  dateTo,
  amount,
  onClose,
}: {
  courier: { id: number; fullName: string };
  date: string;
  dateTo: string;
  amount: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(formatMoneyInput(amount));
  const [note, setNote] = useState("");
  // Oyna bitta qabul — qayta bosilsa ham shu kalit ketadi.
  const [clientActionId] = useState(() => crypto.randomUUID());
  const counted = parseMoneyInput(draft);
  const valid = Number.isFinite(counted) && counted >= 0;
  const accept = useMutation({
    mutationFn: () =>
      settleCourierCash(courier.id, {
        date,
        dateTo,
        confirmedAmount: counted === Math.round(amount) ? null : counted,
        note,
        clientActionId,
      }),
    onSuccess: () => {
      toast.success(`${courier.fullName} · ${formatSom(counted)} qabul qilindi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => {
      // Boshqa oyna/qurilmada qabul qilingan yoki oraliqda qabul qilingan kun bor (59-javob B4).
      if (errorCode(error) === "already_settled") {
        toast.error(
          date === dateTo
            ? "Bu kun allaqachon qabul qilingan — ro'yxat yangilandi"
            : "Oraliqda allaqachon qabul qilingan kun bor — ro'yxat yangilandi, kunma-kun qabul qiling",
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
        onClose();
        return;
      }
      toast.error(errorMessage(error, "Naqdni qabul qilishda xatolik"));
    },
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !accept.isPending) accept.mutate();
          }}
        >
          <DialogTitle>Pulni qabul qilish</DialogTitle>
          <DialogDescription>
            <span data-no-translit>{courier.fullName}</span>
            {` · ${date === dateTo ? day(date) : `${day(date)} – ${day(dateTo)}`} · kutilgan ${formatSom(amount)}`}
          </DialogDescription>
          <div className="mt-4 flex flex-col gap-3">
            <Field
              label="Sanalgan pul, so'm"
              htmlFor="accept-amount"
              hint="Kam bo'lsa farq kuryerda qarz bo'lib qoladi."
              error={valid ? undefined : "Sanalgan summani kiriting"}
            >
              <input
                autoFocus
                inputMode="numeric"
                id="accept-amount"
                aria-invalid={!valid}
                value={draft}
                onFocus={(event) => event.target.select()}
                onChange={(event) => setDraft(formatMoneyInput(event.target.value))}
                className={cn(inputClass, "tabular")}
              />
            </Field>
            <Field label="Izoh" htmlFor="accept-note">
              <input id="accept-note" value={note} maxLength={255} onChange={(event) => setNote(event.target.value)} className={inputClass} />
            </Field>
            {valid && counted !== Math.round(amount) ? (
              <p className="text-warn text-meta">{`Kutilgandan farq ${formatSom(Math.abs(amount - counted))}`}</p>
            ) : null}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={!valid || accept.isPending}>
              {accept.isPending ? <LoaderCircle className="animate-spin" /> : <HandCoins />}
              Qabul qildim
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
