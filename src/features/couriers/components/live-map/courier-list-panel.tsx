"use client";

import { MapPinOff, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourierAvatar } from "@/features/couriers/components/courier-avatar";
import { isCourierMoving } from "@/features/couriers/live-map-view";
import {
  alertLabel,
  formatAgo,
  formatBattery,
  formatSpeed,
  alertTone,
  markerTone,
} from "@/features/couriers/live-tracking";
import type { CourierAlert, LiveCourier } from "@/features/couriers/live-tracking";
import { cn } from "@/lib/utils";

/** Qatorda ko'rinadigan ogohlantirishlar soni — qolgani `+n`. */
const MAX_ROW_ALERTS = 2;

/**
 * Yon panel ro'yxati: rasm, ism, holat qatori, ogohlantirishlar.
 * Qator ustida sichqoncha — markeri ajraladi; bosilsa — xarita uchadi
 * va karta ochiladi. Ro'yxat qisqa (filial kuryerlari) — virtualizatsiya
 * kerak emas.
 */
export function CourierListPanel({
  couriers,
  now,
  selectedId,
  includeOffShift,
  onHover,
  onPick,
  emptyText,
  filtered,
  onClearFilter,
}: {
  /** Allaqachon tartiblangan (`sortLiveCouriers`) va filtrlangan. */
  couriers: readonly LiveCourier[];
  now: Date;
  selectedId: number | null;
  includeOffShift: boolean;
  onHover: (id: number | null) => void;
  onPick: (id: number) => void;
  emptyText: string;
  /** Holat chipi tanlangan — bo'sh natija "filtrga mos yo'q" deb ko'rsatiladi. */
  filtered: boolean;
  onClearFilter: () => void;
}) {
  if (couriers.length === 0) {
    return filtered ? (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <SearchX className="text-ink-faint size-6" aria-hidden />
        <p className="text-ink-muted text-meta">Bu holatda kuryer yo&apos;q</p>
        <Button variant="outline" size="sm" onClick={onClearFilter}>
          Filtrni tozalash
        </Button>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <MapPinOff className="text-ink-faint size-6" aria-hidden />
        <p className="text-ink-muted text-meta">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul aria-label="Kuryerlar ro'yxati" className="flex flex-col gap-0.5 p-2" onMouseLeave={() => onHover(null)}>
      {couriers.map((courier) => (
        <CourierRow
          key={courier.id}
          courier={courier}
          now={now}
          selected={courier.id === selectedId}
          includeOffShift={includeOffShift}
          onHover={onHover}
          onPick={onPick}
        />
      ))}
    </ul>
  );
}

function CourierRow({
  courier,
  now,
  selected,
  includeOffShift,
  onHover,
  onPick,
}: {
  courier: LiveCourier;
  now: Date;
  selected: boolean;
  includeOffShift: boolean;
  onHover: (id: number | null) => void;
  onPick: (id: number) => void;
}) {
  const point = courier.lastLocation;
  const moving = isCourierMoving(courier, now);
  const extraAlerts = courier.alerts.length - MAX_ROW_ALERTS;

  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onMouseEnter={() => onHover(courier.id)}
        onFocus={() => onHover(courier.id)}
        onBlur={() => onHover(null)}
        onClick={() => onPick(courier.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
          "focus-visible:ring-brand/30 focus-visible:ring-[3px] focus-visible:outline-none",
          selected ? "bg-brand-soft" : "hover:bg-subtle",
          includeOffShift && !courier.onShift && "opacity-70",
        )}
      >
        <CourierAvatar courier={courier} size="sm" tone={markerTone(courier, now)} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-dense font-semibold" data-no-translit>
            {courier.fullName}
          </span>
          <span className="text-ink-muted tabular flex flex-wrap items-center gap-x-1.5 text-fine">
            <span className={cn(!point?.at && "text-ink-faint")}>
              {point?.at ? formatAgo(point.at, now) : "aloqa yo'q"}
            </span>
            {moving && point && point.speed !== null ? <span>{`· ${formatSpeed(point.speed)}`}</span> : null}
            {courier.battery !== null ? (
              <span className={cn(courier.battery <= 15 && "text-danger")}>
                {`· ${formatBattery(courier.battery)}`}
              </span>
            ) : null}
            {courier.currentOrder?.orderNumber ? (
              <span className="text-ink">{`· #${courier.currentOrder.orderNumber}`}</span>
            ) : null}
            {includeOffShift && !courier.onShift ? (
              <>
                <span aria-hidden>·</span>
                <span>Smenadan tashqarida</span>
              </>
            ) : null}
          </span>
          {courier.alerts.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-1">
              {courier.alerts.slice(0, MAX_ROW_ALERTS).map((alert) => (
                <AlertChip key={alert} alert={alert} />
              ))}
              {extraAlerts > 0 ? (
                <span className="border-line text-ink-muted rounded-full border px-1.5 text-fine">
                  {`+${extraAlerts}`}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function AlertChip({ alert }: { alert: CourierAlert }) {
  const fraud = alertTone(alert) === "danger";
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 text-fine font-medium",
        fraud ? "border-danger/30 bg-danger-soft text-danger" : "border-warn/30 bg-warn-soft text-warn",
      )}
    >
      {alertLabel(alert)}
    </span>
  );
}

/** Ro'yxat yuklanayotganda — qator shaklidagi skeletlar. */
export function CourierListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2" aria-hidden>
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="flex items-center gap-3 px-2.5 py-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
