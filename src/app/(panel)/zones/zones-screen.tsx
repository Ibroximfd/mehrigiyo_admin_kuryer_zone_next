"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { courierKeys, useCouriers } from "@/features/couriers/hooks/use-couriers";
import { countCouriersByZone } from "@/features/couriers/model/courier";
import { districtKeys, useDistricts } from "@/features/districts/hooks/use-districts";
import { districtDisplayName } from "@/features/districts/model/district";
import { useRegions } from "@/features/regions/hooks/use-regions";
import { useSelectedRegion } from "@/features/regions/hooks/use-selected-region";
import { findRegion } from "@/features/regions/model/region";
import { RegionPicker } from "@/features/regions/ui/region-picker";
import { ZonesView } from "@/features/zones/ui/zones-view";
import { useLocale, useT } from "@/shared/i18n/locale";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorState, OfflineBanner, PickRegionState } from "@/shared/ui/states";

/**
 * Zonalar sahifasi — bir nechta bo'lim shu yerda yig'iladi: tumanlar
 * (nomlar va `zone_id`), kuryerlar (zona bo'yicha soni) va zonalarning o'zi.
 */
export function ZonesScreen() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const regions = useRegions();
  const { region, selectRegion } = useSelectedRegion(regions.data);
  const districts = useDistricts(region);
  const couriers = useCouriers(
    { region, zone: null, shift: "all", status: "active", search: "" },
    { enabled: region !== null },
  );

  const districtOptions = useMemo(
    () =>
      (districts.data ?? []).map((district) => ({
        code: district.code,
        name: districtDisplayName(district, locale),
        zoneId: district.zoneId,
        isActive: district.isActive,
      })),
    [districts.data, locale],
  );
  const districtNames = useMemo(
    () => new Map(districtOptions.map((option) => [option.code, option.name])),
    [districtOptions],
  );
  const courierCounts = useMemo(() => (couriers.data ? countCouriersByZone(couriers.data) : null), [couriers.data]);

  const onZonesChanged = () => {
    void queryClient.invalidateQueries({ queryKey: districtKeys.all });
    void queryClient.invalidateQueries({ queryKey: courierKeys.all });
  };

  const regionName = findRegion(regions.data ?? [], region)?.name ?? region ?? "";
  const picker = (
    <RegionPicker regions={regions.data} isLoading={regions.isPending} value={region} onValueChange={selectRegion} />
  );

  return (
    <>
      <PageHeader title={t.zones.title} description={t.zones.description} />
      <OfflineBanner />
      {regions.isError ? (
        <ErrorState error={regions.error} title={t.regions.loadError} onRetry={() => void regions.refetch()} />
      ) : region === null ? (
        regions.isPending ? (
          <Skeleton className="h-11 w-full sm:w-64" />
        ) : (
          <>
            {picker}
            <PickRegionState />
          </>
        )
      ) : (
        <ZonesView
          key={region}
          region={region}
          regionName={regionName}
          districtOptions={districtOptions}
          districtNames={districtNames}
          courierCounts={courierCounts}
          onZonesChanged={onZonesChanged}
          toolbarStart={picker}
        />
      )}
    </>
  );
}
