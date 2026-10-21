"use client";

import { Link2, MapPin, Pencil, Truck } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";

import { districtLabel } from "../model/district-groups";
import type { Zone } from "../model/zone";
import { CashPointLabel } from "./cash-point-label";

const VISIBLE_DISTRICTS = 8;

type ZoneCardProps = {
  zone: Zone;
  districtNames: ReadonlyMap<string, string>;
  zoneNames: ReadonlyMap<number, string>;
  courierCount: number | null;
  togglePending: boolean;
  onEdit: () => void;
  onToggleActive: (next: boolean) => void;
};

export function ZoneCard({ zone, districtNames, zoneNames, courierCount, togglePending, onEdit, onToggleActive }: ZoneCardProps) {
  const t = useT();
  const hidden = zone.districtCodes.length - VISIBLE_DISTRICTS;
  const neighbors = zone.neighborZoneIds.map((id) => zoneNames.get(id) ?? `#${id}`);

  return (
    <Card className={cn("flex flex-col gap-4 p-4 sm:p-5", !zone.isActive && "bg-surface-2")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-ink">{zone.name}</h2>
            {zone.isActive ? null : <Badge tone="neutral">{t.zones.inactiveBadge}</Badge>}
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted tabular">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {t.zones.districtsCount(zone.districtCodes.length)}
            </span>
            {courierCount !== null ? (
              <span className="inline-flex items-center gap-1">
                <Truck className="size-3.5" aria-hidden />
                {t.zones.couriers(courierCount)}
              </span>
            ) : null}
          </p>
        </div>
        <Switch
          checked={zone.isActive}
          disabled={togglePending}
          onCheckedChange={onToggleActive}
          aria-label={`${zone.name}: ${t.zones.isActive}`}
        />
      </div>

      {zone.districtCodes.length === 0 ? (
        <p className="text-sm text-warn">{t.zones.noDistrictsInZone}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label={t.zones.districts}>
          {zone.districtCodes.slice(0, VISIBLE_DISTRICTS).map((code) => (
            <li key={code}>
              <Badge tone="brand">{districtLabel(districtNames, code)}</Badge>
            </li>
          ))}
          {hidden > 0 ? (
            <li>
              <Badge tone="outline">+{hidden}</Badge>
            </li>
          ) : null}
        </ul>
      )}

      <dl className="grid gap-2 border-t border-line pt-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="shrink-0 text-ink-faint">{t.zones.cashPoint}</dt>
          <dd className="min-w-0 text-right text-ink">
            <CashPointLabel cashPoint={zone.cashPoint} />
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-ink-faint">{t.zones.neighbors}</dt>
          <dd className="flex min-w-0 items-center justify-end gap-1.5 text-right text-ink">
            {neighbors.length > 0 ? (
              <>
                <Link2 className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <span className="truncate">{neighbors.join(", ")}</span>
              </>
            ) : (
              <span className="text-ink-faint">{t.zones.neighborsNone}</span>
            )}
          </dd>
        </div>
      </dl>

      <Button variant="outline" onClick={onEdit} className="mt-auto w-full">
        <Pencil aria-hidden />
        {t.common.edit}
      </Button>
    </Card>
  );
}
