"use client";

import { useMemo } from "react";

import { CouriersView } from "@/features/couriers/ui/couriers-view";
import { useRegions } from "@/features/regions/hooks/use-regions";
import { useZones } from "@/features/zones/hooks/use-zones";
import { useT } from "@/shared/i18n/locale";
import { PageHeader } from "@/shared/ui/page-header";
import { ErrorState, OfflineBanner } from "@/shared/ui/states";

/** Kuryerlar: zonalar (hamma viloyat) va viloyatlar ro'yxati shu yerda uzatiladi. */
export function CouriersScreen() {
  const t = useT();
  const regions = useRegions();
  const zones = useZones(null);

  const zoneOptions = useMemo(
    () =>
      (zones.data?.zones ?? []).map((zone) => ({
        id: zone.id,
        name: zone.name,
        region: zone.region,
        isActive: zone.isActive,
      })),
    [zones.data],
  );
  const regionOptions = useMemo(
    () => (regions.data ?? []).map((region) => ({ code: region.code, name: region.name })),
    [regions.data],
  );

  return (
    <>
      <PageHeader title={t.couriers.title} description={t.couriers.description} />
      <OfflineBanner />
      {zones.isError ? (
        <ErrorState error={zones.error} onRetry={() => void zones.refetch()} />
      ) : (
        <CouriersView zones={zoneOptions} regions={regionOptions} />
      )}
    </>
  );
}
