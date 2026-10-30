"use client";

import type { MaplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";

import {
  MAP_STYLE_URL,
  OPENFREEMAP_ATTRIBUTION,
  OSM_ATTRIBUTION,
  VECTOR_LOAD_TIMEOUT_MS,
  YANDEX_MAPS_KEY,
  supportsWebGL,
} from "@/features/couriers/map-style";
import { isVectorStyle } from "@/features/couriers/map-style";
import type { MapStyle } from "@/features/couriers/map-style";

import { YandexBaseLayer } from "./yandex-base-layer";

type BaseMode = "yandex" | "vector" | "raster";
type GlLayer = InstanceType<typeof MaplibreGL>;

/**
 * Xarita foni: Yandex (kalit bo'lsa, `yandex-base-layer.tsx`) yoki
 * OpenFreeMap vektor uslubi (MapLibre GL, Leaflet ichida —
 * markerlar, iz va kamera mantig'i o'zgarmaydi). MapLibre faqat kerak
 * bo'lganda (`import()`) yuklanadi.
 *
 * Zaxira — raster OSM: WebGL yo'q, kutubxona yuklanmadi yoki uslub
 * `VECTOR_LOAD_TIMEOUT_MS` ichida tayyor bo'lmadi. Zaxiraga o'tilgach shu
 * sahifa ochiq turganda qaytib urinilmaydi (tarmoq yoki GPU muammosi
 * bir zumda o'tib ketmaydi).
 */
export function BaseMapLayer({ style, darkTheme = false }: { style: MapStyle; darkTheme?: boolean }) {
  const map = useMap();
  const vectorWanted = isVectorStyle(style);
  // Vektor bir marta yiqilsa shu sahifada qayta urinilmaydi.
  const [vectorFailed, setVectorFailed] = useState(() => !supportsWebGL());
  // Yandex ham bir marta yiqilsa (kalit, kunlik limit, tarmoq) — shu sahifada raster.
  const [yandexFailed, setYandexFailed] = useState(false);
  const onYandexFail = useCallback(() => setYandexFailed(true), []);
  const mode: BaseMode =
    style === "yandex" && YANDEX_MAPS_KEY && !yandexFailed
      ? "yandex"
      : vectorWanted && !vectorFailed
        ? "vector"
        : "raster";
  const layerRef = useRef<GlLayer | null>(null);
  const styleUrl = vectorWanted ? MAP_STYLE_URL[style] : MAP_STYLE_URL.plain;
  // Qatlam yaratilayotgan paytdagi uslub (mavzu kech aniqlanishi mumkin); keyin — `setStyle`.
  const styleRef = useRef(styleUrl);
  useEffect(() => {
    styleRef.current = styleUrl;
  }, [styleUrl]);

  // Qorong'i raster zaxira — CSS invers (`globals.css`, `data-basemap`).
  useEffect(() => {
    const container = map.getContainer();
    container.dataset.basemap = mode;
    // Raster'da qorong'i filtr: "Qorong'i" zaxirasi yoki Standart + qorong'i mavzu.
    container.dataset.basemapDark = String(
      style === "dark" || ((style === "standard" || style === "yandex") && darkTheme),
    );
  }, [map, mode, style, darkTheme]);

  useEffect(() => {
    if (mode !== "vector") return;
    let disposed = false;
    let loaded = false;
    const fail = () => {
      if (!disposed && !loaded) setVectorFailed(true);
    };
    const timer = window.setTimeout(fail, VECTOR_LOAD_TIMEOUT_MS);
    map.attributionControl?.addAttribution(OPENFREEMAP_ATTRIBUTION);

    void Promise.all([import("maplibre-gl"), import("@maplibre/maplibre-gl-leaflet")])
      .then(([maplibre, plugin]) => {
        if (disposed) return;
        // Ishchi `public/` dan (`npm run vendor:maplibre`) — bundl ichida u yo'q.
        maplibre.setWorkerUrl(`/vendor/maplibre-gl/${maplibre.getVersion()}/maplibre-gl-worker.js`);
        const layer = new plugin.MaplibreGL({
          style: styleRef.current,
          attributionControl: false,
        });
        layer.addTo(map);
        layerRef.current = layer;
        const glMap = layer.getMaplibreMap();
        glMap.once("load", () => {
          loaded = true;
          window.clearTimeout(timer);
        });
        // Uslub yoki manba yuklanmay turib xato — zaxira; keyingi plitka xatolari jim.
        glMap.on("error", () => {
          if (!loaded) {
            window.clearTimeout(timer);
            fail();
          }
        });
      })
      .catch(() => {
        window.clearTimeout(timer);
        fail();
      });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      map.attributionControl?.removeAttribution(OPENFREEMAP_ATTRIBUTION);
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, [map, mode]);

  // Uslub almashdi — qatlam qayta yaratilmaydi (kontekst saqlanadi).
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || mode !== "vector") return;
    try {
      layer.getMaplibreMap().setStyle(styleUrl);
    } catch {
      // Eski uslub qoladi — xarita ishlashda davom etadi.
    }
  }, [styleUrl, mode]);

  if (mode === "yandex" && YANDEX_MAPS_KEY) {
    return <YandexBaseLayer apiKey={YANDEX_MAPS_KEY} onFail={onYandexFail} />;
  }
  if (mode === "raster") {
    return (
      <TileLayer
        attribution={OSM_ATTRIBUTION}
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
    );
  }
  return null;
}
