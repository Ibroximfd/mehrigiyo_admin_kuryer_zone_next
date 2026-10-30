"use client";

import type L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

import { YANDEX_LOAD_TIMEOUT_MS } from "@/features/couriers/map-style";
import { loadYandexMaps, yandexMapsLang } from "@/lib/yandex-maps";
import type { YandexCoords, YandexMap } from "@/lib/yandex-maps";

/** Leaflet zoom animatsiyasi bilan bir xil davomiylik (ms). */
const ZOOM_ANIMATION_MS = 250;

/**
 * Yandex xaritasi — Leaflet ostida fon. Yandex o'z konteynerida chiziladi
 * (sichqoncha hodisalari o'chiq), Leaflet esa markaz/zoomni boshqaradi:
 * har siljish va zoomda Yandex kamerasi shunga moslanadi. Markerlar, iz va
 * kamera mantig'i o'zgarmaydi.
 *
 * Yandex ellipsoid Merkator ishlatadi, Leaflet — sferik: kamera markazi bir
 * xil, shahar miqyosida farq ko'zga tashlanmaydi.
 *
 * [onFail] — API yuklanmadi (kalit, kunlik limit, tarmoq): ota komponent
 * raster zaxiraga o'tadi.
 */
export function YandexBaseLayer({ apiKey, onFail }: { apiKey: string; onFail: () => void }) {
  const map = useMap();

  useEffect(() => {
    let disposed = false;
    let ymap: YandexMap | null = null;
    const container = map.getContainer();
    const host = document.createElement("div");
    host.className = "courier-map-yandex";
    host.setAttribute("aria-hidden", "true");
    container.prepend(host);

    const center = (): YandexCoords => {
      const c = map.getCenter();
      return [c.lat, c.lng];
    };
    const follow = () => ymap?.setCenter(center(), map.getZoom(), { duration: 0 });
    const followZoom = (e: L.ZoomAnimEvent) =>
      ymap?.setCenter([e.center.lat, e.center.lng], e.zoom, { duration: ZOOM_ANIMATION_MS });
    const resize = () => ymap?.container.fitToViewport();

    void loadYandexMaps(apiKey, yandexMapsLang(document.documentElement.lang), YANDEX_LOAD_TIMEOUT_MS)
      .then((ymaps) => {
        if (disposed) return;
        ymap = new ymaps.Map(
          host,
          { center: center(), zoom: map.getZoom(), controls: [] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        );
        // Boshqaruv Leaflet'da — Yandex faqat chizadi.
        ymap.behaviors.disable(["drag", "scrollZoom", "dblClickZoom", "multiTouch", "rightMouseButtonMagnifier"]);
        map.on("move", follow);
        map.on("zoomanim", followZoom);
        map.on("resize", resize);
      })
      .catch(() => {
        if (!disposed) onFail();
      });

    return () => {
      disposed = true;
      map.off("move", follow);
      map.off("zoomanim", followZoom);
      map.off("resize", resize);
      ymap?.destroy();
      host.remove();
    };
  }, [map, apiKey, onFail]);

  return null;
}
