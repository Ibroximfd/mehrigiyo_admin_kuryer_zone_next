"use client";

import { useT } from "@/shared/i18n/locale";
import { NativeSelect } from "@/shared/ui/native-select";
import { SearchInput } from "@/shared/ui/search-input";

import type { CourierStatusFilter, ShiftFilter } from "../model/courier";
import type { CourierRegionOption, CourierZoneOption } from "../model/options";

type CourierFiltersProps = {
  query: string;
  region: string | null;
  zone: number | null;
  shift: ShiftFilter;
  status: CourierStatusFilter;
  regions: readonly CourierRegionOption[];
  zones: readonly CourierZoneOption[];
  onQueryChange: (value: string) => void;
  onRegionChange: (value: string | null) => void;
  onZoneChange: (value: number | null) => void;
  onShiftChange: (value: ShiftFilter) => void;
  onStatusChange: (value: CourierStatusFilter) => void;
};

/** Telefonda: qidiruv to'liq kenglikda, tanlovlar 2×2 to'rda. Desktopda bitta qator. */
export function CourierFilters(props: CourierFiltersProps) {
  const t = useT();
  return (
    <div role="search" className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <SearchInput
        value={props.query}
        onValueChange={props.onQueryChange}
        placeholder={t.couriers.search}
        className="lg:w-72"
      />
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-1 lg:flex-wrap">
        <NativeSelect
          aria-label={t.couriers.filterRegion}
          value={props.region ?? ""}
          onChange={(event) => props.onRegionChange(event.target.value || null)}
          className="lg:w-48"
        >
          <option value="">{t.couriers.allRegions}</option>
          {props.regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t.couriers.filterZone}
          value={props.zone === null ? "" : String(props.zone)}
          onChange={(event) => props.onZoneChange(event.target.value ? Number(event.target.value) : null)}
          className="lg:w-48"
        >
          <option value="">{t.couriers.allZones}</option>
          {props.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t.couriers.filterShift}
          value={props.shift}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "all" || value === "on" || value === "off") props.onShiftChange(value);
          }}
          className="lg:w-40"
        >
          <option value="all">{`${t.couriers.filterShift}: ${t.common.all}`}</option>
          <option value="on">{t.couriers.shiftOn}</option>
          <option value="off">{t.couriers.shiftOff}</option>
        </NativeSelect>
        <NativeSelect
          aria-label={t.couriers.filterStatus}
          value={props.status}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "active" || value === "inactive" || value === "all") props.onStatusChange(value);
          }}
          className="lg:w-40"
        >
          <option value="active">{t.couriers.statusActive}</option>
          <option value="inactive">{t.couriers.statusInactive}</option>
          <option value="all">{`${t.couriers.filterStatus}: ${t.common.all}`}</option>
        </NativeSelect>
      </div>
    </div>
  );
}
