"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

import { avatarHue, avatarInitials, shortName } from "@/features/couriers/avatar";
import { pillPlacements } from "@/features/couriers/live-map-view";
import { isMoving, markerTone } from "@/features/couriers/live-tracking";
import type { LiveCourier } from "@/features/couriers/live-tracking";

import {
  MARKER_SIZE,
  applyMarkerState,
  applyPillPlacement,
  bindMarkerImage,
  markerHtml,
} from "./marker-icon";

/** Shu zoomdan uzoqda ism yorliqlari yashirinadi (hover/fokusda chiqadi). */
export const NAMES_MIN_ZOOM = 12;

/**
 * Kuryer markerlari — imperativ Leaflet qatlami.
 *
 * Nega `react-leaflet` `<Marker>` emas: silliq siljish uchun bitta DOM
 * element saqlanishi kerak; `<Marker icon>` o'zgarganda element almashadi.
 * Bu yerda marker bir marta yaratiladi, keyin faqat `setLatLng` (CSS o'tish
 * siljitadi) va `data-*` atributlar yangilanadi.
 *
 * Rang `now` dan hisoblanadi — u 15 s da bir o'zgaradi (`useNowTick`),
 * barcha markerlar bitta effektda qayta bo'yaladi.
 */
export function CourierMarkersLayer({
  couriers,
  now,
  focusedId,
  highlightId,
  onSelect,
}: {
  couriers: readonly LiveCourier[];
  now: Date;
  /** Tanlangan kuryer — kattalashadi va pulslaydi; qolganlari xiralashadi. */
  focusedId: number | null;
  /** Yon paneldagi qator ustida turgan kuryer. */
  highlightId: number | null;
  onSelect: (id: number) => void;
}) {
  const map = useMap();
  const markers = useRef(new Map<number, L.Marker>());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Zoom: yorliqlar ko'rinishi va joylashuvi.
  useEffect(() => {
    const container = map.getContainer();
    const onZoom = () => {
      container.dataset.names = map.getZoom() >= NAMES_MIN_ZOOM ? "on" : "off";
      placePills(map, markers.current);
    };
    onZoom();
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  useEffect(() => {
    const pool = markers.current;
    const seen = new Set<number>();

    for (const courier of couriers) {
      const point = courier.lastLocation;
      if (!point) continue;
      seen.add(courier.id);

      let marker = pool.get(courier.id);
      if (!marker) {
        marker = L.marker([point.lat, point.lng], {
          icon: L.divIcon({
            className: "courier-marker",
            html: markerHtml(),
            iconSize: [MARKER_SIZE, MARKER_SIZE],
            iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
          }),
          keyboard: true,
          title: courier.fullName,
          alt: courier.fullName,
          riseOnHover: true,
        });
        marker.on("click", () => onSelectRef.current(courier.id));
        marker.addTo(map);
        const created = marker.getElement();
        if (created) {
          created.dataset.img = "none";
          // Kamera yetib kelganda puls shu bo'yicha topiladi (`map-controller`).
          created.dataset.courierId = String(courier.id);
          bindMarkerImage(created);
        }
        pool.set(courier.id, marker);
      } else {
        const current = marker.getLatLng();
        if (current.lat !== point.lat || current.lng !== point.lng) {
          marker.setLatLng([point.lat, point.lng]);
        }
      }

      const element = marker.getElement();
      if (element) {
        const focused = focusedId === courier.id;
        const highlighted = highlightId === courier.id;
        applyMarkerState(element, {
          tone: markerTone(courier, now),
          moving: isMoving(point.speed),
          heading: point.heading,
          focused,
          dimmed: focusedId !== null && !focused && !highlighted,
          highlighted,
          initials: avatarInitials(courier.fullName),
          hue: avatarHue(courier.id),
          imageUrl: courier.avatar?.thumbUrl ?? null,
          name: shortName(courier.fullName),
        });
        element.style.zIndex = focused ? "1000" : highlighted ? "900" : "";
      }
    }

    // Smenadan chiqqan, filtrdan tushgan yoki nuqtasi yo'qolgan kuryer — xaritadan tushadi.
    for (const [id, marker] of pool) {
      if (!seen.has(id)) {
        marker.remove();
        pool.delete(id);
      }
    }

    placePills(map, pool);
  }, [couriers, now, focusedId, highlightId, map]);

  useEffect(() => {
    const pool = markers.current;
    return () => {
      pool.forEach((marker) => marker.remove());
      pool.clear();
    };
  }, []);

  return null;
}

/** Ekranda bir-biriga yaqin markerlarning yorlig'i tepaga chiqadi. */
function placePills(map: L.Map, pool: ReadonlyMap<number, L.Marker>): void {
  const points = [...pool].map(([id, marker]) => {
    const point = map.latLngToContainerPoint(marker.getLatLng());
    return { id, x: point.x, y: point.y };
  });
  const placement = pillPlacements(points);
  for (const [id, marker] of pool) {
    const element = marker.getElement();
    if (element) applyPillPlacement(element, placement.get(id) ?? "below");
  }
}
