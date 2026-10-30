"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { Field } from "@/components/kit/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";

import { fetchLocations } from "../api";
import { regionName } from "../regions";

/**
 * Viloyat ombori tanlovi — hujjat oynalarida birinchi qadam. Viloyat
 * berilsa faqat o'sha viloyat omborlari (kuryer oynalari), aks holda
 * hammasi, viloyat nomi bilan.
 */
export function LocationSelect({
  value,
  onChange,
  region = null,
  label = "Ombor",
}: {
  value: number | null;
  onChange: (locationId: number) => void;
  region?: string | null;
  label?: string;
}) {
  const locations = useQuery({
    queryKey: queryKeys.skladLocations,
    queryFn: ({ signal }) => fetchLocations(signal),
    staleTime: 5 * 60_000,
  });
  const options = (locations.data ?? []).filter(
    (location) => location.isActive && (!region || location.region === region),
  );
  // Viloyat berilgan (kuryer oynasi) va ombor tanlanmagan — sukut ombor
  // o'zi tanlanadi: logist har safar bir xil omborni qidirmasin.
  const fallback = region && value === null ? (options.find((location) => location.isPrimary) ?? (options.length === 1 ? options[0] : undefined)) : undefined;
  useEffect(() => {
    if (fallback) onChange(fallback.id);
  }, [fallback, onChange]);

  return (
    <Field label={label}>
      <Select
        value={value === null ? "" : String(value)}
        onValueChange={(next) => onChange(Number(next))}
        disabled={locations.isPending}
      >
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder="Ombor tanlang" />
        </SelectTrigger>
        <SelectContent>
          {options.map((location) => (
            <SelectItem key={location.id} value={String(location.id)}>
              <span data-no-translit>{location.name}</span>
              {!region ? (
                <span className="text-ink-faint ml-1.5 text-fine">{regionName(location.region)}</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
