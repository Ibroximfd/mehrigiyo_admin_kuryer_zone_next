"use client";

import { MapPin, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ADDRESS_CREDIT_MAX, clampAddressCredit } from "@/features/orders/address-credit";
import { cn } from "@/lib/utils";

/**
 * «Kuryerga manzil» — yakunlash oynasidagi hisoblagich: `− N +` va
 * «Qo'shilmasin». Sukut qiymati alohida ko'rsatiladi, logist uni
 * o'zgartirsa «qo'lda» belgisi chiqadi (keyin statistikada ham ko'rinadi).
 */
export function AddressCreditField({
  value,
  defaultValue,
  courierName,
  inStop,
  disabled = false,
  onChange,
}: {
  value: number;
  defaultValue: number;
  courierName: string;
  /** Buyurtma birlashtirilgan manzilda — izoh shuni aytadi. */
  inStop: boolean;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const set = (next: number) => onChange(clampAddressCredit(next));
  const changed = value !== defaultValue;

  return (
    <div className="border-line bg-canvas flex flex-col gap-2 rounded-lg border px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <MapPin className="text-ink-muted size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-ink text-dense font-semibold">Kuryerga manzil</p>
          <p className="text-ink-faint text-meta truncate">
            <span data-no-translit>{courierName}</span>
            {` · sukut: ${defaultValue > 0 ? `+${defaultValue}` : "qo'shilmaydi"}`}
            {changed ? " · qo'lda" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Kuryerga manzil soni">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Manzilni kamaytirish"
            disabled={disabled || value <= 0}
            onClick={() => set(value - 1)}
          >
            <Minus className="size-3.5" />
          </Button>
          <output aria-live="polite" className="text-ink tabular w-10 text-center text-body font-bold">
            {value > 0 ? `+${value}` : "0"}
          </output>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Manzil qo'shish"
            disabled={disabled || value >= ADDRESS_CREDIT_MAX}
            onClick={() => set(value + 1)}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={value === 0}
          onClick={() => set(0)}
          className={cn(
            "rounded-md border px-2 py-0.5 text-meta font-medium transition-colors duration-(--dur-micro)",
            value === 0 ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-muted hover:border-line-strong",
          )}
        >
          Qo&apos;shilmasin
        </button>
        {changed ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => set(defaultValue)}
            className="text-link hover:text-brand text-meta font-medium"
          >
            Sukutga qaytarish
          </button>
        ) : null}
        {inStop ? (
          <span className="text-ink-faint text-meta">
            Zakaz birlashtirilgan manzilda — manzil bir marta hisoblanadi.
          </span>
        ) : null}
      </div>
    </div>
  );
}
