"use client";

import { Hexagon, MapPin, MapPinned } from "lucide-react";

import { FilterDropdown } from "@/components/kit/filter-dropdown";
import { REGIONS } from "@/features/orders/regions";
import { toggleZoneFilter, ZONE_NONE } from "@/features/orders/server-filters";
import type { OrderFilters } from "@/features/orders/use-order-filters";
import { districtAreaOptions, regionAreaOptions, toggleAreaRegion } from "@/features/zones/area-filter";
import { useRegionsDictionary, useZones } from "@/features/zones/use-zones";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Hudud pillari (2026-10-15): Viloyat → Zona → Tuman kaskadi, hammasi
 * serverda (`?region=`, `?zone=` / `none`, `?district=`). Manba — taqsimlash
 * oynasi va kuryerlar sahifasi bilan bir xil: `/meta/regions/` va `/zones/`.
 */

/**
 * Viloyat — lug'atdan; lug'at kelmaguncha mahalliy ro'yxat. Bir nechtasi
 * tanlanadi (2026-10-29); olib tashlangan viloyatning zonasi va tumani
 * tushib qoladi (`toggleAreaRegion`).
 */
export function RegionFilterPill({ filters: f }: { filters: OrderFilters }) {
  const dictionary = useRegionsDictionary();
  const zones = useZones(null);
  const options = dictionary.data?.length
    ? regionAreaOptions(dictionary.data, null)
    : REGIONS.map((item) => ({ value: item.value, label: item.label }));

  const select = (value: string) => {
    const next = toggleAreaRegion(
      { regions: f.regions, zones: f.zones, districts: f.districts },
      value,
      zones.data ?? [],
    );
    void f.setRegions(next.regions.length ? [...next.regions] : null);
    if (next.zones.length !== f.zones.length) void f.setZones(next.zones.length ? [...next.zones] : null);
    if (next.districts.length !== f.districts.length) {
      void f.setDistricts(next.districts.length ? [...next.districts] : null);
    }
  };

  return (
    <FilterDropdown
      label="Viloyat"
      icon={MapPinned}
      options={options}
      selected={f.regions}
      onSelect={select}
      onClear={f.regions.length ? () => void f.setRegions(null) : undefined}
      closeOnSelect={false}
      searchable
      searchPlaceholder="Viloyat qidirish..."
      contentClassName="w-64"
    />
  );
}

/** Tanlangan viloyatlarning zonalari; viloyat tanlanmagan — hammasi. */
function zonesInRegions<T extends { region: string }>(list: readonly T[], regions: readonly string[]): T[] {
  if (regions.length === 0) return [...list];
  const set = new Set(regions);
  return list.filter((zone) => set.has(zone.region));
}

/**
 * Zona pilli: o'z zonalarimiz + "Hududi noma'lum" savati (`zone=none`).
 * Viloyat(lar) tanlangan bo'lsa — faqat ularning zonalari. Zonalar
 * yuklanmasa ham "Hududi noma'lum" ishlaydi.
 */
export function ZoneFilterPill({ filters: f }: { filters: OrderFilters }) {
  const zones = useZones(null);
  const options = zonesInRegions(zones.data ?? [], f.regions)
    .filter((zone) => zone.isActive || f.zones.includes(String(zone.id)))
    .map((zone) => ({ value: String(zone.id), label: zone.name }));

  const select = (value: string) => {
    const next = toggleZoneFilter(f.zones, value);
    void f.setZones(next.length ? next : null);
    // Tanlangan tuman endi tanlangan zonalarga kirmasa — tushadi.
    if (next.length && f.districts.length) {
      const allowed = new Set(
        (zones.data ?? [])
          .filter((zone) => next.includes(String(zone.id)))
          .flatMap((zone) => zone.districtCodes),
      );
      const kept = f.districts.filter((code) => allowed.has(code));
      if (kept.length !== f.districts.length) void f.setDistricts(kept.length ? kept : null);
    }
  };

  return (
    <FilterDropdown
      label="Zona"
      icon={Hexagon}
      sections={[
        {
          key: "special",
          options: [{ value: ZONE_NONE, label: "Hududi noma'lum" }],
          selected: f.zones,
          onSelect: select,
        },
        {
          key: "zones",
          heading: options.length ? "Zonalar" : undefined,
          options,
          selected: f.zones,
          onSelect: select,
        },
      ]}
      onClear={f.zones.length ? () => void f.setZones(null) : undefined}
      closeOnSelect={false}
      searchable={options.length > 6}
      searchPlaceholder="Zona qidirish..."
      contentClassName="w-64"
    />
  );
}

/**
 * Tuman pilli — viloyat(lar) tanlangan bo'lsa faqat ularning tumanlari;
 * zona(lar) tanlangan bo'lsa faqat shu zonalarning tumanlari.
 */
export function DistrictFilterPill({ filters: f }: { filters: OrderFilters }) {
  const dictionary = useRegionsDictionary();
  const zones = useZones(null);
  const locale = useLocaleStore((state) => state.locale);
  const realZones = f.zones.filter((key) => key !== ZONE_NONE);
  const options = districtAreaOptions(
    { regions: f.regions, zones: realZones },
    zones.data ?? [],
    dictionary.data ?? [],
    null,
    locale,
  );
  if (options.length === 0 && f.districts.length === 0) return null;

  return (
    <FilterDropdown
      label="Tuman"
      icon={MapPin}
      options={options}
      selected={f.districts}
      onSelect={(value) => {
        const next = f.districts.includes(value)
          ? f.districts.filter((item) => item !== value)
          : [...f.districts, value];
        void f.setDistricts(next.length ? next : null);
      }}
      onClear={f.districts.length ? () => void f.setDistricts(null) : undefined}
      closeOnSelect={false}
      searchable
      searchPlaceholder="Tuman qidirish..."
      contentClassName="w-64"
    />
  );
}
