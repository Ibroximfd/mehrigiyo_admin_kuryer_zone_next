"use client";

import { CircleMarker, Polyline, Tooltip } from "react-leaflet";

import { formatStopDuration } from "@/features/couriers/live-tracking";
import type { CourierTrack } from "@/features/couriers/live-tracking";
import { formatTime } from "@/lib/format";

/**
 * Kun izi: yo'l chizig'i + to'xtash nuqtalari (3 daqiqadan ko'p bir joyda).
 * Ranglar CSS tokenlaridan — `pathOptions` ichida `var(--…)` ishlaydi,
 * chunki Leaflet SVG atributiga yozadi va brauzer o'zgaruvchini yechadi.
 */
export function TrackLayer({ track }: { track: CourierTrack }) {
  const path = track.points.map((point) => [point.lat, point.lng] as [number, number]);
  return (
    <>
      {path.length > 1 ? (
        <>
          <Polyline
            positions={path}
            pathOptions={{ color: "var(--surface)", weight: 7, opacity: 0.9, lineJoin: "round" }}
          />
          <Polyline
            positions={path}
            pathOptions={{ color: "var(--order-shipping-mark)", weight: 4, opacity: 0.95, lineJoin: "round" }}
          />
        </>
      ) : null}
      {track.stops.map((stop, index) => (
        <CircleMarker
          key={`${stop.lat}-${stop.lng}-${index}`}
          center={[stop.lat, stop.lng]}
          radius={7}
          pathOptions={{
            color: "var(--surface)",
            weight: 2,
            fillColor: "var(--order-pending-mark)",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <span className="text-dense font-semibold">
              {`To'xtash — ${formatStopDuration(stop.durationS)}`}
            </span>
            {stop.from && stop.to ? (
              <span className="text-ink-muted text-fine block">
                {`${formatTime(stop.from)} – ${formatTime(stop.to)}`}
              </span>
            ) : null}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
