"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export type SegmentOption<V extends string> = {
  value: V;
  label: ReactNode;
};

type SegmentedControlProps<V extends string> = {
  value: V | undefined;
  options: readonly SegmentOption<V>[];
  onValueChange: (value: V) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Bir nechta qiymatdan bittasi — radio guruh semantikasi (strelkalar bilan
 * almashadi), ko'rinishi segmentli tugma.
 */
export function SegmentedControl<V extends string>({
  value,
  options,
  onValueChange,
  label,
  disabled,
  className,
}: SegmentedControlProps<V>) {
  return (
    <RadioGroupPrimitive.Root
      value={value ?? ""}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) onValueChange(option.value);
      }}
      aria-label={label}
      disabled={disabled}
      orientation="horizontal"
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-2 p-1", className)}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-muted",
            "transition outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40",
            "data-checked:bg-surface data-checked:text-ink data-checked:shadow-card",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
