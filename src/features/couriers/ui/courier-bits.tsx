"use client";

import { Smartphone, Star } from "lucide-react";

import { useLocale, useT } from "@/shared/i18n/locale";
import { formatAmount, formatRelative } from "@/shared/lib/format";
import { formatPhone } from "@/shared/lib/phone";
import { Badge } from "@/shared/ui/badge";
import { StatusDot } from "@/shared/ui/status-dot";

import { orderedCourierZones, type Courier } from "../model/courier";

/** Kuryer qatori/kartochkasining kichik bo'laklari — jadval va kartochka bir xil ko'rinsin. */

export function CourierPhone({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <a href={`tel:+${phone}`} className="text-sm text-ink-muted tabular underline-offset-4 hover:text-ink hover:underline">
      {formatPhone(phone)}
    </a>
  );
}

export function CourierZones({ courier, zoneNames }: { courier: Courier; zoneNames: ReadonlyMap<number, string> }) {
  const t = useT();
  const zones = orderedCourierZones(courier, zoneNames);
  if (zones.length === 0) return <span className="text-sm text-ink-faint">{t.common.none}</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t.couriers.zones}>
      {zones.map((zone) => (
        <li key={zone.id}>
          <Badge tone={zone.isPrimary ? "brand" : "neutral"} title={zone.isPrimary ? t.couriers.primary : undefined}>
            {zone.isPrimary ? <Star aria-label={t.couriers.primary} /> : null}
            {zone.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function CourierShift({ courier }: { courier: Courier }) {
  const t = useT();
  const tone = courier.onShift ? (courier.online ? "ok" : "warn") : "muted";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <StatusDot tone={tone} pulse={courier.onShift && courier.online} />
      <span className={courier.onShift ? "text-ink" : "text-ink-faint"}>
        {courier.onShift ? t.couriers.onShift : t.couriers.offShift}
        {courier.onShift ? <span className="text-ink-faint"> · {courier.online ? t.couriers.online : t.couriers.offline}</span> : null}
      </span>
    </span>
  );
}

export function CourierToday({ courier }: { courier: Courier }) {
  const t = useT();
  return (
    <div className="flex flex-col text-sm tabular">
      <span className="text-ink">{t.couriers.todayStats(courier.today.delivered, courier.today.assigned)}</span>
      <span className="text-xs text-ink-faint">
        {t.couriers.cod}: {formatAmount(courier.today.codTotal)} {t.common.sum}
      </span>
    </div>
  );
}

export function CourierAccount({ courier }: { courier: Courier }) {
  const t = useT();
  if (!courier.isActive) return <Badge tone="danger">{t.couriers.deactivatedBadge}</Badge>;
  return courier.hasAccount ? <Badge tone="ok">{t.couriers.hasAccount}</Badge> : <Badge tone="outline">{t.couriers.noAccount}</Badge>;
}

export function CourierDevice({ courier }: { courier: Courier }) {
  const t = useT();
  const locale = useLocale();
  const device = courier.device;
  if (!device) return <span className="text-sm text-ink-faint">{t.couriers.noDevice}</span>;
  const details = [device.platform, device.appVersion].filter(Boolean).join(" · ");
  return (
    <div className="flex min-w-0 items-start gap-2 text-sm">
      <Smartphone className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-ink">{device.name ?? details}</p>
        <p className="truncate text-xs text-ink-faint">
          {device.name && details ? `${details} · ` : null}
          {device.lastSeenAt ? t.couriers.lastSeen(formatRelative(device.lastSeenAt, locale)) : null}
        </p>
      </div>
    </div>
  );
}

export function CourierLoad({ courier }: { courier: Courier }) {
  const t = useT();
  return (
    <span className="text-sm tabular" title={t.couriers.loadHint}>
      <span className={courier.load > 0 ? "font-semibold text-ink" : "text-ink-faint"}>{courier.load}</span>
    </span>
  );
}
