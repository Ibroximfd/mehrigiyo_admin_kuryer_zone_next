"use client";

import { CloudOff, Footprints, MapPin, Smartphone, Truck } from "lucide-react";
import Link from "next/link";

import {
  alertLabel,
  alertTone,
  miniStatusLine,
} from "@/features/couriers/live-tracking";
import type { CourierAlert } from "@/features/couriers/live-tracking";
import { courierPresence } from "@/features/couriers/types";
import type {
  Courier,
  CourierLive,
  CourierPresence,
} from "@/features/couriers/types";
import { formatRelative } from "@/lib/format";
import { yandexMapsPointUrl } from "@/lib/maps";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const PRESENCE: Record<
  CourierPresence,
  { label: string; dot: string; tone: string }
> = {
  online: { label: "Smenada · onlayn", dot: "bg-ok", tone: "text-ok" },
  no_connection: {
    label: "Smenada · aloqa yo'q",
    dot: "bg-danger",
    tone: "text-danger",
  },
  off_shift: {
    label: "Smenadan tashqarida",
    dot: "bg-ink-faint",
    tone: "text-ink-muted",
  },
  no_account: {
    label: "Ilovasiz",
    dot: "bg-line-strong",
    tone: "text-ink-faint",
  },
};

/** Kuryer ilovasidagi holat: smena, aloqa, oflayn amallar, joriy buyurtma. */
export function CourierLiveStatus({ courier }: { courier: Courier }) {
  const presence = courierPresence(courier);
  const view = PRESENCE[presence];
  const { live, device } = courier;
  const lastSeen = live.lastHeartbeatAt ?? device?.lastSeenAt ?? null;

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <p
        className={cn(
          "flex items-center gap-1.5 text-meta font-semibold",
          view.tone,
        )}
        role="status"
      >
        <span aria-hidden className={cn("size-2 rounded-full", view.dot)} />
        {view.label}
        {presence === "no_connection" && lastSeen ? (
          <span className="text-ink-faint font-normal">
            · {formatRelative(lastSeen)}
          </span>
        ) : null}
      </p>

      {live.queueLength > 0 ? (
        <p className="text-warn flex items-center gap-1.5 text-meta font-medium">
          <CloudOff className="size-3.5" aria-hidden />
          {`Telefonda ${live.queueLength} ta yuborilmagan amal`}
          {live.oldestPendingAt ? (
            <span className="text-ink-faint font-normal">
              {` · eng eskisi ${formatRelative(live.oldestPendingAt)}`}
            </span>
          ) : null}
        </p>
      ) : null}

      {live.currentOrderId ? (
        <Link
          href={ROUTES.orderDetail(live.currentOrderId)}
          className="text-link flex items-center gap-1.5 text-meta font-medium hover:underline"
        >
          <Truck className="size-3.5" aria-hidden />
          Hozir yetkazayotgan buyurtmasi
        </Link>
      ) : null}

      <MiniStatus live={live} />

      {live.lastLocation ? <LastLocation location={live.lastLocation} courierId={courier.id} /> : null}

      {device ? (
        <p className="text-ink-faint flex items-center gap-1.5 text-fine">
          <Smartphone className="size-3" aria-hidden />
          <span className="truncate" data-no-translit>
            {[
              device.deviceName,
              device.appVersion ? `v${device.appVersion}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Qurilma"}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Mini-holat (§7.3): `2 daqiqa oldin · 12 km/soat · 63%` + ogohlantirish
 * belgilari. Maydon kelmasa qator ham chiqmaydi — eski backend javobida
 * bo'sh joy qolmaydi.
 */
function MiniStatus({ live }: { live: CourierLive }) {
  const line = miniStatusLine(live, new Date());
  if (!line && live.alerts.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-fine">
      {line ? <span className="text-ink-muted tabular">{line}</span> : null}
      {live.alerts.map((alert) => (
        <AlertBadge key={alert} alert={alert} />
      ))}
    </div>
  );
}

function AlertBadge({ alert }: { alert: CourierAlert }) {
  const fraud = alertTone(alert) === "danger";
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 font-medium",
        fraud ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn",
      )}
    >
      {alertLabel(alert)}
    </span>
  );
}

/** Oxirgi joylashuv — Yandex Maps havolasi va sahifadagi jonli xaritada "Kun izi". */
function LastLocation({
  location,
  courierId,
}: {
  location: NonNullable<CourierLive["lastLocation"]>;
  courierId: number;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
      <a
        href={yandexMapsPointUrl(location)}
        target="_blank"
        rel="noreferrer"
        className="text-link flex items-center gap-1.5 hover:underline"
      >
        <MapPin className="size-3.5" aria-hidden />
        Oxirgi joylashuv
        {location.at ? (
          <span className="text-ink-faint">· {formatRelative(location.at)}</span>
        ) : null}
      </a>
      <Link
        href={ROUTES.mapTrack(courierId)}
        className="text-link flex items-center gap-1 hover:underline"
        title="Kuryerning bugungi yo'li jonli xaritada"
      >
        <Footprints className="size-3.5" aria-hidden />
        Kun izi
      </Link>
    </p>
  );
}
