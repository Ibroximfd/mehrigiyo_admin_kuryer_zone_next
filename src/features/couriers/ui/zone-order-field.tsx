"use client";

import { ArrowDown, ArrowUp, Star, X } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { NativeSelect } from "@/shared/ui/native-select";

import type { CourierZoneOption } from "../model/options";
import { addZone, makePrimary, moveZone, removeZone } from "../model/zone-order";

type ZoneOrderFieldProps = {
  value: readonly number[];
  onChange: (ids: number[]) => void;
  /** Tanlash mumkin bo'lgan zonalar (viloyat bo'yicha, faol). */
  available: readonly CourierZoneOption[];
  /** Nom uchun — hamma zonalar (nofaol bo'lib qolgan joriy zona ham). */
  allZones: readonly CourierZoneOption[];
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
};

/** Tartibli zonalar: 1-o'rin — asosiy. Yulduz — asosiy qilish, o'qlar — tartib. */
export function ZoneOrderField({ value, onChange, available, allZones, invalid, describedBy, disabled }: ZoneOrderFieldProps) {
  const t = useT();
  const names = new Map(allZones.map((zone) => [zone.id, zone.name]));
  const addable = available.filter((zone) => !value.includes(zone.id));

  return (
    <div className="flex flex-col gap-2" aria-describedby={describedBy}>
      {value.length === 0 ? (
        <p className={cn("rounded-xl border border-dashed px-4 py-4 text-center text-sm text-ink-faint", invalid ? "border-danger" : "border-line-strong")}>
          {t.couriers.zonesEmpty}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {value.map((id, index) => {
            const name = names.get(id) ?? `#${id}`;
            const isPrimary = index === 0;
            return (
              <li
                key={id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border py-1.5 pr-1.5 pl-3",
                  isPrimary ? "border-brand bg-brand-soft" : "border-line bg-surface",
                )}
              >
                <span className="w-5 shrink-0 text-xs text-ink-faint tabular">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                {isPrimary ? (
                  <Badge tone="brand" className="bg-surface">
                    <Star aria-hidden />
                    {t.couriers.primary}
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => onChange(makePrimary(value, id))}
                    aria-label={`${name}: ${t.couriers.makePrimary}`}
                    title={t.couriers.makePrimary}
                  >
                    <Star aria-hidden />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveZone(value, id, "up"))}
                  aria-label={`${name}: ${t.couriers.moveUp}`}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === value.length - 1}
                  onClick={() => onChange(moveZone(value, id, "down"))}
                  aria-label={`${name}: ${t.couriers.moveDown}`}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => onChange(removeZone(value, id))}
                  aria-label={`${name}: ${t.couriers.removeZone}`}
                >
                  <X aria-hidden />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      <NativeSelect
        aria-label={t.couriers.zonesAdd}
        value=""
        disabled={disabled || addable.length === 0}
        onChange={(event) => {
          const id = Number(event.target.value);
          if (Number.isInteger(id) && id > 0) onChange(addZone(value, id));
        }}
      >
        <option value="">{addable.length === 0 ? t.couriers.zonesNoneLeft : `+ ${t.couriers.zonesAdd}`}</option>
        {addable.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
