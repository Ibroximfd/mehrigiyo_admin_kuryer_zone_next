"use client";

import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

import { Maximize2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { MapContainer } from "react-leaflet";

import type { CourierTrack, LiveCourier } from "@/features/couriers/live-tracking";
import type { FocusRequest } from "@/features/couriers/map-focus";
import { readSavedMapStyle, resolveMapStyle, saveMapStyle } from "@/features/couriers/map-style";
import type { MapStyle } from "@/features/couriers/map-style";
import type { LatLng } from "@/lib/maps";
import { cn } from "@/lib/utils";

import { BaseMapLayer } from "./base-map-layer";
import { CourierMarkersLayer } from "./courier-markers-layer";
import { MapController } from "./map-controller";
import { MapStyleSwitcher } from "./map-style-switcher";
import { TrackLayer } from "./track-layer";

/** Boshlang'ich ko'rinish — kuryer bo'lmaganda Toshkent. */
const DEFAULT_CENTER: [number, number] = [41.311, 69.279];
const DEFAULT_ZOOM = 12;

/**
 * Leaflet + OpenFreeMap vektor foni (kalit kerak emas; zaxira — raster OSM,
 * egasi qarori §7.3). Faqat brauzerda — `live-map-island.tsx` `ssr: false`
 * bilan yuklaydi.
 */
export function LiveMap({
  couriers,
  now,
  focusedId,
  focusRequest,
  onArrive,
  highlightId = null,
  onSelect,
  track,
  fitAllSignal,
  onFitAll,
  fitButtonClassName,
}: {
  couriers: readonly LiveCourier[];
  now: Date;
  focusedId: number | null;
  /** Har tanlov — yangi so'rov; kamera uchadi (o'sha kuryer bo'lsa ham). */
  focusRequest: FocusRequest | null;
  /** Kamera kuryerga yetib keldi — karta shunda ochiladi. */
  onArrive: (id: number) => void;
  highlightId?: number | null;
  onSelect: (id: number) => void;
  track: CourierTrack | null;
  fitAllSignal: number;
  onFitAll: () => void;
  /** "Hammasini ko'rsat" tugmasi joyi — sahifa panellariga qarab. */
  fitButtonClassName?: string;
}) {
  const focused = couriers.find((courier) => courier.id === focusedId) ?? null;
  const { resolvedTheme } = useTheme();
  // Faqat brauzerda chiziladi (`ssr: false`) — `localStorage` ni darhol o'qish xavfsiz.
  const [savedStyle, setSavedStyle] = useState<MapStyle | null>(() => readSavedMapStyle());
  const mapStyle = resolveMapStyle(savedStyle);
  const chooseStyle = (next: MapStyle) => {
    setSavedStyle(next);
    saveMapStyle(next);
  };
  const trackBounds: LatLng[] | null = track && track.points.length > 0 ? track.points : null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="courier-map h-full w-full"
        zoomControl={false}
      >
        <BaseMapLayer style={mapStyle} darkTheme={resolvedTheme === "dark"} />
        <MapController
          couriers={couriers}
          focusRequest={focusRequest}
          focused={focused}
          fitAllSignal={fitAllSignal}
          fitBounds={trackBounds}
          onArrive={onArrive}
        />
        {track ? <TrackLayer track={track} /> : null}
        <CourierMarkersLayer
          couriers={couriers}
          now={now}
          focusedId={focusedId}
          highlightId={highlightId}
          onSelect={onSelect}
        />
      </MapContainer>

      <MapStyleSwitcher
        value={mapStyle}
        onChange={chooseStyle}
        className="absolute bottom-3 left-3 z-[500]"
      />

      <button
        type="button"
        onClick={onFitAll}
        title="Hammasini ko'rsat"
        aria-label="Hammasini ko'rsat"
        className={cn(
          "border-line bg-surface/95 text-ink hover:bg-surface elev-1 absolute right-3 bottom-3 z-[500] flex h-9 items-center gap-1.5 rounded-lg border px-3 text-meta font-medium transition-colors",
          fitButtonClassName,
        )}
      >
        <Maximize2 className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Hammasini ko&apos;rsat</span>
      </button>
    </div>
  );
}
