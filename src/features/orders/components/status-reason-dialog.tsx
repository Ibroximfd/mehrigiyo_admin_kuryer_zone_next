"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { canCreditAddresses, defaultAddressCredit } from "@/features/orders/address-credit";
import type { FinalStatus } from "@/features/orders/address-credit";
import { updateOrder } from "@/features/orders/api";
import { AddressCreditField } from "@/features/orders/components/address-credit-field";
import type { LogistOrderPatch } from "@/features/orders/api";
import { toastStatusChanged } from "@/features/orders/components/status-toast";
import { isMoneyGuardError, orderErrorMessage } from "@/features/orders/error-hints";
import { confirmSwitchesToCash } from "@/features/orders/payment-guard";
import { NOTE_MAX, validateReasonForm } from "@/features/orders/reason-form";
import type { ReasonFormErrors, ReasonFormInput } from "@/features/orders/reason-form";
import { REASON_REQUIRING_NOTE } from "@/features/orders/reasons";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { errorCode } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Server xato kodi → formadagi maydon (2026-10-01 §5.1, §8.1). */
const REASON_ERROR_FIELDS: Record<string, keyof ReasonFormErrors> = {
  confirm_reason_required: "reason",
  cancel_reason_required: "reason",
  revert_reason_required: "reason",
  reason_required: "reason",
  confirm_note_required: "note",
  cancel_note_required: "note",
};

export type ReasonOption = { value: string; label: string };

export type StatusReasonDialogProps = {
  order: LogistOrder | null;
  /** Qaysi statusga — sarlavhadagi "A → B" tegi uchun. */
  to: string;
  /** "#DA-183977 ni atkaz qilish". */
  title: (order: LogistOrder) => string;
  Icon: LucideIcon;
  /** Tugma ohangi: atkaz — qizil, qaytarish — amber, tiklash — indigo. */
  tone: "danger" | "amber" | "brand";
  reasons: readonly ReasonOption[];
  /** Variant yozuvini buyurtmaga moslash ("Javob bermadi (3 urinish)"). */
  reasonLabel?: (reason: ReasonOption, order: LogistOrder) => string;
  /** Izoh har doim majburiymi (qaytarish) — aks holda faqat «Boshqa» da. */
  requireNote?: boolean;
  notePlaceholder: string;
  submitLabel: string;
  /** Sabablar ustidagi ogohlantirish (masalan yetkazilganni qaytarish). */
  warning?: (order: LogistOrder) => React.ReactNode;
  /** Izoh ostidagi ma'lumot (urinishlar, kim xabardor qilinadi). */
  info?: (order: LogistOrder) => React.ReactNode;
  buildPatch: (value: ReasonFormInput) => LogistOrderPatch;
  /**
   * Yakunlovchi o'tish (`→ cancelled`) — kuryerga manzil maydoni chiziladi
   * va qiymati `courierAddresses` bo'lib patchga qo'shiladi.
   */
  addressCreditFor?: FinalStatus;
  /** Muvaffaqiyat toastining ikkinchi qatori ("Logist Aziz tasdiqladi · …"). */
  successDetail?: (updated: LogistOrder, patch: LogistOrderPatch) => string;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
};

/**
 * Sabab so'raydigan status oynasi — dizayn (`Logist_Edit_Order`, chap
 * tomon): sarlavhada o'tish tegi, ikki ustunli sabab kartochkalari, izoh,
 * urinishlar/ogohlantirish va pastki panel. Bekor / qaytarish / tiklash —
 * hammasi shu bitta komponent (`02` §2.3, §2.5).
 */
export function StatusReasonDialog(props: StatusReasonDialogProps) {
  const { order, onClose } = props;
  return (
    <Dialog open={order !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[42rem] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
      >
        {order ? <ReasonDialogBody key={order.id} {...props} order={order} /> : null}
      </DialogContent>
    </Dialog>
  );
}

const SUBMIT_TONE: Record<StatusReasonDialogProps["tone"], string> = {
  danger: "bg-[var(--order-cancelled-mark)] text-white hover:brightness-110",
  amber: "bg-amber text-amber-ink hover:bg-amber-hover",
  brand: "",
};

function TransitionTag({ from, to }: { from: string; to: string }) {
  const fromInfo = orderStatusInfo(from);
  return (
    <span
      style={{ "--accent": fromInfo.color } as React.CSSProperties}
      className="bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-1))] text-[var(--accent)] tabular ml-auto shrink-0 rounded-md px-2 py-0.5 text-fine font-semibold"
    >
      {fromInfo.label} → {orderStatusInfo(to).label}
    </span>
  );
}

function ReasonDialogBody({
  order,
  to,
  title,
  Icon,
  tone,
  reasons,
  reasonLabel,
  requireNote = false,
  notePlaceholder,
  submitLabel,
  warning,
  info,
  buildPatch,
  addressCreditFor,
  successDetail,
  onClose,
  onChanged,
}: StatusReasonDialogProps & { order: LogistOrder }) {
  const creditable = addressCreditFor !== undefined && canCreditAddresses(order);
  const creditDefault = addressCreditFor ? defaultAddressCredit(addressCreditFor, order) : 0;
  const [credit, setCredit] = useState(creditDefault);
  const queryClient = useQueryClient();
  const groupId = useId();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ReasonFormErrors>({});

  const submit = useMutation({
    mutationFn: (patch: LogistOrderPatch) => updateOrder(order.id, patch),
    onSuccess: (updated, patch) => {
      toastStatusChanged({
        order: updated,
        description: successDetail?.(updated, patch),
        before: order,
        fromStatus: order.status,
        onUndo: (patch) =>
          updateOrder(order.id, patch)
            .then((reverted) => {
              // Server naqdga o'tkazgan to'lov undo da tiklanmaydi (2026-10-01 §5.2).
              if (confirmSwitchesToCash(order)) {
                toast.info(
                  `${reverted.orderNumber}: tasdiq qaytarildi, lekin to'lov naqdligicha qoldi — kerak bo'lsa tahrirdan usulni o'zgartiring.`,
                  { duration: 10_000 },
                );
              }
              onChanged?.(reverted);
              void queryClient.invalidateQueries({ queryKey: ["orders"] });
            })
            .catch((error: unknown) => toast.error(orderErrorMessage(error, "Qaytarib bo'lmadi"))),
      });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      onChanged?.(updated);
      onClose();
    },
    onError: (error) => {
      const message = orderErrorMessage(error, "Statusni o'zgartirishda xatolik");
      // Server sabab/izohni rad etdi — xato tegishli maydon ostida ham turadi.
      const field = REASON_ERROR_FIELDS[errorCode(error) ?? ""];
      if (field) setErrors({ [field]: message });
      // Pul qorovuli — qayta urinish ham rad etiladi: "xato" emas, uzun
      // ogohlantirish (`FLUTTER_ORDER_PIPELINE_V2` §7.5).
      if (isMoneyGuardError(error)) toast.warning(message, { duration: 12_000 });
      else toast.error(message);
    },
  });

  const handleSubmit = () => {
    const result = validateReasonForm({ reason, note }, { requireNote });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const patch = buildPatch(result.value);
    submit.mutate(creditable ? { ...patch, courierAddresses: credit } : patch);
  };

  const noteRequired = requireNote || reason === REASON_REQUIRING_NOTE;

  return (
    <>
      <div className="border-line flex items-center gap-2.5 border-b px-5 py-4">
        <Icon className={cn("size-4.5 shrink-0", tone === "danger" ? "text-danger" : tone === "amber" ? "text-gold" : "text-brand")} />
        <DialogTitle className="text-ink truncate text-lg2 font-bold">{title(order)}</DialogTitle>
        <TransitionTag from={order.status} to={to} />
      </div>
      <DialogDescription className="sr-only">Sababni tanlang va izoh yozing — tarixda saqlanadi.</DialogDescription>

      <div className="flex flex-col gap-2.5 px-5 py-4">
        {warning ? warning(order) : null}

        <div
          role="radiogroup"
          aria-label="Sabab"
          aria-invalid={Boolean(errors.reason)}
          className="grid gap-2 sm:grid-cols-2"
        >
          {reasons.map((item) => {
            const active = reason === item.value;
            return (
              <label
                key={item.value}
                data-focus-ring="host"
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-dense",
                  "transition-[border-color,background-color] duration-(--dur-micro)",
                  "has-[:focus-visible]:ring-brand/40 has-[:focus-visible]:ring-2",
                  active ? "border-brand bg-brand-soft text-ink" : "border-line text-ink hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name={groupId}
                  value={item.value}
                  checked={active}
                  onChange={() => {
                    setReason(item.value);
                    setErrors((current) => ({ ...current, reason: undefined }));
                  }}
                  className="accent-brand"
                />
                {reasonLabel ? reasonLabel(item, order) : item.label}
              </label>
            );
          })}
        </div>
        {errors.reason ? (
          <p role="alert" className="text-danger text-meta font-medium">{errors.reason}</p>
        ) : null}

        <textarea
          rows={2}
          value={note}
          maxLength={NOTE_MAX}
          onChange={(event) => {
            setNote(event.target.value);
            setErrors((current) => ({ ...current, note: undefined }));
          }}
          aria-label={noteRequired ? "Izoh (majburiy)" : "Izoh"}
          aria-invalid={Boolean(errors.note)}
          placeholder={noteRequired && !requireNote ? "Izoh (majburiy)" : notePlaceholder}
          className={cn(inputClass, "h-auto min-h-14 resize-none py-2.5 text-dense")}
        />
        {errors.note ? (
          <p role="alert" className="text-danger text-meta font-medium">{errors.note}</p>
        ) : null}

        {info ? info(order) : null}

        {creditable && order.courier ? (
          <AddressCreditField
            value={credit}
            defaultValue={creditDefault}
            courierName={order.courier.fullName}
            inStop={order.stopId !== null}
            disabled={submit.isPending}
            onChange={setCredit}
          />
        ) : null}
      </div>

      <div className="border-line bg-canvas flex justify-end gap-2 border-t px-5 py-3">
        <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
          Bekor
        </Button>
        <Button disabled={submit.isPending} onClick={handleSubmit} className={SUBMIT_TONE[tone]}>
          {submit.isPending ? <LoaderCircle className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </>
  );
}
