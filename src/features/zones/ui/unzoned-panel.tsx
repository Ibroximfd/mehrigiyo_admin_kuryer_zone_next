"use client";

import { CircleCheck, Plus, TriangleAlert } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import type { UnzonedDistrict, Zone } from "../model/zone";

type UnzonedPanelProps = {
  districts: readonly UnzonedDistrict[];
  activeZones: readonly Zone[];
  pendingCode: string | null;
  onAddToZone: (district: UnzonedDistrict, zone: Zone) => void;
};

/** Zonasiz tumanlar — buyurtmasi kuryersiz qoladi, shuning uchun ko'zga tashlanadi. */
export function UnzonedPanel({ districts, activeZones, pendingCode, onAddToZone }: UnzonedPanelProps) {
  const t = useT();

  if (districts.length === 0) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
        <CircleCheck className="size-4 shrink-0" aria-hidden />
        {t.zones.unzonedNone}
      </p>
    );
  }

  return (
    <Card className="border-warn/40 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <h2 className="font-semibold text-ink">
            {t.zones.unzonedTitle} <span className="text-ink-muted tabular">· {districts.length}</span>
          </h2>
          <p className="text-sm text-ink-muted">{t.zones.unzonedText}</p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {districts.map((district) => (
          <li key={district.code} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface py-1 pr-1 pl-3">
            <span className="min-w-0 truncate text-sm font-medium">{district.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="md"
                  pending={pendingCode === district.code}
                  aria-label={t.zones.addToZoneLabel(district.name)}
                  className="shrink-0 px-3"
                >
                  {pendingCode === district.code ? null : <Plus aria-hidden />}
                  <span className="hidden sm:inline">{t.zones.addToZone}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t.zones.addToZone}</DropdownMenuLabel>
                {activeZones.length === 0 ? (
                  <DropdownMenuItem disabled>{t.zones.noActiveZones}</DropdownMenuItem>
                ) : (
                  activeZones.map((zone) => (
                    <DropdownMenuItem key={zone.id} onSelect={() => onAddToZone(district, zone)}>
                      {zone.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </Card>
  );
}
