"use client";

import type { ComponentProps } from "react";

import { COUNTRY_CODE, formatLocalPhone, toLocalDigits } from "@/shared/lib/phone";
import { cn } from "@/shared/lib/utils";

import { inputClassName } from "./input";

type PhoneInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  /** Mahalliy 9 raqam (`901234567`). */
  value: string;
  onValueChange: (local: string) => void;
};

/**
 * `+998` qotirilgan prefiks + `90 123 45 67` niqobi. To'liq raqam
 * (`+998901234567`) yopishtirilsa ham to'g'ri ajratiladi.
 */
export function PhoneInput({ value, onValueChange, className, ...props }: PhoneInputProps) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-ink-muted tabular sm:text-sm" aria-hidden>
        +{COUNTRY_CODE}
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        className={cn(inputClassName, "pl-14 tabular")}
        value={formatLocalPhone(value)}
        onChange={(event) => onValueChange(toLocalDigits(event.target.value))}
        {...props}
      />
    </div>
  );
}
