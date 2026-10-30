"use client";

import type { LucideIcon } from "lucide-react";

import { FilterDropdown } from "@/components/kit/filter-dropdown";
import type { FilterOption } from "@/components/kit/filter-dropdown";

/**
 * Bitta qiymatli filtr pilli — tanlangani qayta bosilsa o'chadi. Kuryer,
 * Yaratdi, Ilova, Yetk. sana, Viloyat, Teg — hammasi shu shaklda.
 */
export function SingleChoicePill({
  label,
  icon,
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder,
  contentClassName,
}: {
  label: string;
  icon?: LucideIcon;
  options: FilterOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  contentClassName?: string;
}) {
  return (
    <FilterDropdown
      label={label}
      icon={icon}
      options={options}
      selected={value === null ? [] : [value]}
      onSelect={(next) => onChange(next === value ? null : next)}
      onClear={value !== null ? () => onChange(null) : undefined}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
      contentClassName={contentClassName}
    />
  );
}
