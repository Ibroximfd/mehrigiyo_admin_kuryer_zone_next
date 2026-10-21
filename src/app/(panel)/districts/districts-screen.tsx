"use client";

import { useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

import { DistrictsView } from "@/features/districts/ui/districts-view";
import { useRegions } from "@/features/regions/hooks/use-regions";
import { useSelectedRegion } from "@/features/regions/hooks/use-selected-region";
import { RegionPicker } from "@/features/regions/ui/region-picker";
import { useZones, zoneKeys } from "@/features/zones/hooks/use-zones";
import { useT } from "@/shared/i18n/locale";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchInput } from "@/shared/ui/search-input";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorState, OfflineBanner, PickRegionState } from "@/shared/ui/states";

export function DistrictsScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const regions = useRegions();
  const { region, selectRegion } = useSelectedRegion(regions.data);
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault("").withOptions({ history: "replace" }));
  const zones = useZones(region, { enabled: region !== null });

  const zoneNames = useMemo(() => new Map((zones.data?.zones ?? []).map((zone) => [zone.id, zone.name])), [zones.data]);

  return (
    <>
      <PageHeader title={t.districts.title} description={t.districts.description} />
      <OfflineBanner />
      {regions.isError ? (
        <ErrorState error={regions.error} title={t.regions.loadError} onRetry={() => void regions.refetch()} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <RegionPicker regions={regions.data} isLoading={regions.isPending} value={region} onValueChange={selectRegion} />
            <SearchInput
              value={query}
              onValueChange={(value) => void setQuery(value || null)}
              placeholder={t.districts.search}
              className="sm:w-80"
            />
          </div>
          {region === null ? (
            regions.isPending ? <Skeleton className="h-64 rounded-xl" /> : <PickRegionState />
          ) : (
            <DistrictsView
              key={region}
              region={region}
              query={query}
              onQueryClear={() => void setQuery(null)}
              zoneNames={zoneNames}
              onZonesAffected={() => void queryClient.invalidateQueries({ queryKey: zoneKeys.all })}
            />
          )}
        </>
      )}
    </>
  );
}
