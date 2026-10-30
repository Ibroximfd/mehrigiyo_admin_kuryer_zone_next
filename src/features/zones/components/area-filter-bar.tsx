"use client";

import { Hexagon, MapPin, MapPinned, X } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { FilterDropdown } from "@/components/kit/filter-dropdown";
import { cn } from "@/lib/utils";

import {
  EMPTY_AREA,
  areaChips,
  isAreaEmpty,
  removeAreaChip,
  toggleAreaDistrict,
  toggleAreaRegion,
  toggleAreaZone,
} from "../area-filter";
import type { AreaFilter, AreaOption } from "../area-filter";
import type { Zone } from "../types";

/**
 * Hudud filtri qatori: Viloyat · Zona · Tuman — uchta kaskadli, har biri
 * **ko'p tanlovli** (2026-10-29),
 * tanlovlar olib tashlanadigan chip bo'lib qatorning o'zida turadi.
 * Sonlar (berilsa) kulrang: logist qayerda ish borligini tanlamasdan ko'radi.
 *
 * Variantlarni chaqiruvchi hisoblaydi (`area-filter.ts`) — komponent faqat
 * ko'rsatadi va kaskad o'tishlarini qo'llaydi.
 */
export function AreaFilterBar({
  value,
  onChange,
  zones,
  regionOptions,
  zoneOptions,
  districtOptions,
  loading = false,
  showChips = true,
  className,
  children,
}: {
  value: AreaFilter;
  onChange: (next: AreaFilter) => void;
  /** Kaskad o'tishlari uchun to'liq zona ro'yxati. */
  zones: readonly Pick<Zone, "id" | "name" | "region" | "isActive" | "districtCodes">[];
  regionOptions: AreaOption[];
  zoneOptions: AreaOption[];
  districtOptions: AreaOption[];
  loading?: boolean;
  showChips?: boolean;
  className?: string;
  /** Qatorning o'ng tomoni (qidiruv, smena tugmasi va h.k.). */
  children?: React.ReactNode;
}) {
  const chips = areaChips(value, {
    regions: regionOptions,
    zones: zoneOptions,
    districts: districtOptions,
  });

  return (
    <div
      role="group"
      aria-label="Hudud filtri"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {loading ? (
        [0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-(--control-h) w-28 rounded-full" />
        ))
      ) : (
        <>
          <FilterDropdown
            label="Viloyat"
            icon={MapPinned}
            options={regionOptions}
            selected={[...value.regions]}
            onSelect={(next) => onChange(toggleAreaRegion(value, next, zones))}
            onClear={value.regions.length ? () => onChange({ ...value, regions: [] }) : undefined}
            closeOnSelect={false}
            searchable={regionOptions.length > 6}
            searchPlaceholder="Viloyat qidirish..."
            contentClassName="w-64"
          />
          <FilterDropdown
            label="Zona"
            icon={Hexagon}
            options={zoneOptions}
            selected={[...value.zones]}
            onSelect={(next) => onChange(toggleAreaZone(value, next, zones))}
            onClear={value.zones.length ? () => onChange({ ...value, zones: [] }) : undefined}
            closeOnSelect={false}
            searchable={zoneOptions.length > 6}
            searchPlaceholder="Zona qidirish..."
            contentClassName="w-64"
          />
          <FilterDropdown
            label="Tuman"
            icon={MapPin}
            options={districtOptions}
            selected={[...value.districts]}
            onSelect={(next) => onChange(toggleAreaDistrict(value, next, zones))}
            onClear={value.districts.length ? () => onChange({ ...value, districts: [] }) : undefined}
            closeOnSelect={false}
            searchable={districtOptions.length > 6}
            searchPlaceholder="Tuman qidirish..."
            contentClassName="w-64"
          />
        </>
      )}

      {children}

      {showChips && chips.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5" aria-label="Tanlangan hudud">
          {chips.map((chip) => (
            <button
              key={`${chip.kind}:${chip.value}`}
              type="button"
              onClick={() => onChange(removeAreaChip(value, chip, zones))}
              aria-label={`${chip.label} filtrini olib tashlash`}
              className="bg-brand-soft text-brand hover:bg-brand/15 inline-flex items-center gap-1 rounded-full py-1 pr-1.5 pl-2.5 text-fine font-semibold transition-colors focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span data-no-translit>{chip.label}</span>
              <X className="size-3" aria-hidden />
            </button>
          ))}
          {!isAreaEmpty(value) ? (
            <button
              type="button"
              onClick={() => onChange(EMPTY_AREA)}
              className="text-ink-muted hover:text-ink px-1.5 py-1 text-fine font-medium transition-colors"
            >
              Tozalash
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
