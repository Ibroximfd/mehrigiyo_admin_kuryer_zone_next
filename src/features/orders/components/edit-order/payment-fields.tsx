"use client";

import { Controller, useFormContext } from "react-hook-form";

import { EditHeading } from "@/features/orders/components/edit-order/edit-field";
import { PAYMENT_METHOD_OPTIONS, isOnlineMethod } from "@/features/orders/edit-order";
import type { EditField as EditFieldKey, EditOrderValues } from "@/features/orders/edit-order";
import { cn } from "@/lib/utils";

/** To'lov usuli — uchta radio kartochka; onlayn tanlansa ogohlantirish. */
export function PaymentFields({
  changed,
  locked = false,
}: {
  changed: ReadonlySet<EditFieldKey>;
  /** Onlayn to'lov boshlangan — usulni almashtirib bo'lmaydi (§8.2). */
  locked?: boolean;
}) {
  const { control } = useFormContext<EditOrderValues>();

  return (
    <>
      <EditHeading>To&apos;lov usuli</EditHeading>
      <Controller
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <>
            <div
              role="radiogroup"
              aria-label="To'lov usuli"
              aria-disabled={locked || undefined}
              className={cn("flex gap-2", locked && "pointer-events-none opacity-60")}
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const active = field.value === option.value;
                return (
                  <label
                    key={option.value}
                    data-focus-ring="host"
                    className={cn(
                      "flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center text-dense font-semibold",
                      "transition-[border-color,background-color] duration-(--dur-micro)",
                      "has-[:focus-visible]:ring-brand/40 has-[:focus-visible]:ring-2",
                      active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink hover:border-line-strong",
                      active && changed.has("paymentMethod") && "border-amber bg-amber-soft text-gold",
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={option.value}
                      checked={active}
                      disabled={locked}
                      onChange={() => field.onChange(option.value)}
                      onBlur={field.onBlur}
                      className="accent-brand"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {locked ? (
              <p className="text-gold text-meta font-medium">
                Mijoz onlayn to&apos;lovni boshlagan — to&apos;lov usulini o&apos;zgartirib bo&apos;lmaydi
                (pul ikki marta yechilmasin).
              </p>
            ) : (
              <p className={cn("text-meta", isOnlineMethod(field.value) && changed.has("paymentMethod") ? "text-warn font-medium" : "text-ink-faint")}>
                Onlayn tanlansa mijozga to&apos;lov havolasi push bilan boradi; to&apos;lanmaguncha buyurtma
                jo&apos;natilmaydi.
              </p>
            )}
          </>
        )}
      />
    </>
  );
}
