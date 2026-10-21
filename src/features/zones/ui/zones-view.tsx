"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { describeError } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { Skeleton } from "@/shared/ui/skeleton";

import { useUpdateZone, useZones } from "../hooks/use-zones";
import type { DistrictOption } from "../model/district-groups";
import { sortZones, type UnzonedDistrict, type Zone } from "../model/zone";
import { UnzonedPanel } from "./unzoned-panel";
import { ZoneCard } from "./zone-card";
import { ZoneFormSheet, type ZoneSheetTarget } from "./zone-form-sheet";

type ZonesViewProps = {
  region: string;
  regionName: string;
  /** Tumanlar (`zone_id` bilan) — tumanlar bo'limidan, app qatlamida uzatiladi. */
  districtOptions: readonly DistrictOption[];
  districtNames: ReadonlyMap<string, string>;
  /** Zona → faol kuryerlar soni; noma'lum bo'lsa `null`. */
  courierCounts: ReadonlyMap<number, number> | null;
  /** Zona o'zgarganda tumanlar/kuryerlar keshini eskirtirish. */
  onZonesChanged: () => void;
  /** Asboblar qatorining chap qismi (viloyat tanlovi) — app qatlamidan. */
  toolbarStart?: ReactNode;
};

export function ZonesView({
  region,
  regionName,
  districtOptions,
  districtNames,
  courierCounts,
  onZonesChanged,
  toolbarStart,
}: ZonesViewProps) {
  const t = useT();
  const zonesQuery = useZones(region);
  const update = useUpdateZone(onZonesChanged);
  const [sheet, setSheet] = useState<ZoneSheetTarget | null>(null);
  const [pendingDeactivation, setPendingDeactivation] = useState<Zone | null>(null);
  const [pendingZoneId, setPendingZoneId] = useState<number | null>(null);
  const [pendingDistrict, setPendingDistrict] = useState<string | null>(null);

  const zones = useMemo(() => sortZones(zonesQuery.data?.zones ?? []), [zonesQuery.data]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const activeZones = useMemo(() => zones.filter((zone) => zone.isActive), [zones]);
  const names = useMemo(() => {
    const merged = new Map(districtNames);
    for (const district of zonesQuery.data?.unzonedDistricts ?? []) {
      if (!merged.has(district.code)) merged.set(district.code, district.name);
    }
    return merged;
  }, [districtNames, zonesQuery.data]);

  const setActive = (zone: Zone, isActive: boolean) => {
    setPendingZoneId(zone.id);
    update.mutate(
      { id: zone.id, patch: { is_active: isActive } },
      {
        onSuccess: () => toast.success(isActive ? t.zones.activated : t.zones.deactivated),
        onError: (error) => toast.error(describeError(error, t)),
        onSettled: () => {
          setPendingZoneId(null);
          setPendingDeactivation(null);
        },
      },
    );
  };

  const addToZone = (district: UnzonedDistrict, zone: Zone) => {
    setPendingDistrict(district.code);
    update.mutate(
      { id: zone.id, patch: { district_codes: [...zone.districtCodes, district.code] } },
      {
        onSuccess: () => toast.success(t.zones.addedToZone(district.name, zone.name)),
        onError: (error) => toast.error(describeError(error, t)),
        onSettled: () => setPendingDistrict(null),
      },
    );
  };

  const createButton = (
    <Button onClick={() => setSheet({ mode: "create" })}>
      <Plus aria-hidden />
      {t.zones.create}
    </Button>
  );

  let content;
  if (zonesQuery.isPending) content = <ZonesSkeleton />;
  else if (zonesQuery.isError) content = <ErrorState error={zonesQuery.error} onRetry={() => void zonesQuery.refetch()} />;
  else {
    content = (
      <>
        <UnzonedPanel
          districts={zonesQuery.data.unzonedDistricts}
          activeZones={activeZones}
          pendingCode={pendingDistrict}
          onAddToZone={addToZone}
        />
        {zones.length === 0 ? (
          <EmptyState title={t.zones.emptyTitle} description={t.zones.emptyText} action={createButton} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {zones.map((zone) => (
              <li key={zone.id} className="flex">
                <ZoneCard
                  zone={zone}
                  districtNames={names}
                  zoneNames={zoneNames}
                  courierCount={courierCounts ? (courierCounts.get(zone.id) ?? 0) : null}
                  togglePending={pendingZoneId === zone.id}
                  onEdit={() => setSheet({ mode: "edit", zone })}
                  onToggleActive={(next) => (next ? setActive(zone, true) : setPendingDeactivation(zone))}
                />
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {toolbarStart}
        {createButton}
      </div>
      {content}

      <ZoneFormSheet
        target={sheet}
        onClose={() => setSheet(null)}
        region={region}
        regionName={regionName}
        regionZones={zones}
        districtOptions={districtOptions}
        districtNames={names}
        onSaved={onZonesChanged}
      />

      <ConfirmDialog
        open={pendingDeactivation !== null}
        onOpenChange={(open) => (open ? undefined : setPendingDeactivation(null))}
        title={t.zones.deactivateTitle(pendingDeactivation?.name ?? "")}
        description={t.zones.deactivateText}
        confirmLabel={t.zones.deactivateConfirm}
        pending={pendingDeactivation !== null && pendingZoneId === pendingDeactivation.id}
        onConfirm={() => (pendingDeactivation ? setActive(pendingDeactivation, false) : undefined)}
      />
    </div>
  );
}

function ZonesSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="flex flex-col gap-4 p-5">
            <Skeleton className="h-5 w-40" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }, (_, chip) => (
                <Skeleton key={chip} className="h-6 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
