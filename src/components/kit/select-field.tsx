"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** `Select` bo'sh qiymatni qabul qilmaydi — «hammasi» uchun belgi. */
const ALL = "__all";

export type SelectOption = { value: string; label: string; translate?: boolean };

/**
 * Filtr uchun tanlov: birinchi qator — «hammasi» (`null`). Ma'lumot nomlari
 * (zona, kuryer, tuman) tarjima qilinmaydi — `translate: false`.
 */
export function SelectField({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  className?: string;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger aria-label={label} className={cn("w-full", value !== null && "border-brand text-brand", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.translate === false ? <span data-no-translit>{option.label}</span> : option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
