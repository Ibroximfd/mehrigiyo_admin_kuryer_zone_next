"use client";

import { MapPin } from "lucide-react";
import { useId } from "react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { NativeSelect } from "@/shared/ui/native-select";
import { Skeleton } from "@/shared/ui/skeleton";

import type { Region } from "../model/region";

type RegionPickerProps = {
  regions: readonly Region[] | undefined;
  isLoading: boolean;
  value: string | null;
  onValueChange: (region: string | null) => void;
  /** Berilsa — "hammasi" varianti (bo'sh qiymat) qo'shiladi. */
  allLabel?: string;
  className?: string;
};

export function RegionPicker({ regions, isLoading, value, onValueChange, allLabel, className }: RegionPickerProps) {
  const t = useT();
  const id = useId();

  if (isLoading && !regions) return <Skeleton className={cn("h-11 w-full sm:h-10 sm:w-64", className)} />;

  return (
    <div className={cn("flex w-full items-center gap-2 sm:w-64", className)}>
      <label htmlFor={id} className="sr-only">
        {t.regions.label}
      </label>
      <MapPin className="size-4 shrink-0 text-brand" aria-hidden />
      <NativeSelect
        id={id}
        className="flex-1"
        value={value ?? ""}
        onChange={(event) => onValueChange(event.target.value || null)}
      >
        {allLabel ? <option value="">{allLabel}</option> : value ? null : <option value="">{t.regions.placeholder}</option>}
        {(regions ?? []).map((region) => (
          <option key={region.code} value={region.code}>
            {region.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
