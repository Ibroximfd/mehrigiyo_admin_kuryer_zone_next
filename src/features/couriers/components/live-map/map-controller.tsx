"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

import { flightTimeoutMs, planFlight } from "@/features/couriers/map-focus";
import type { FocusRequest } from "@/features/couriers/map-focus";
import { shouldFollow } from "@/features/couriers/live-search";
import type { LiveCourier } from "@/features/couriers/live-tracking";
import type { LatLng } from "@/lib/maps";

/** Kuzatishda (kuryer siljiganda) kamera siljishi. */
const FOLLOW_DURATION_S = 0.8;
const FIT_PADDING: L.PointTuple = [40, 40];

/**
 * Xarita harakati — hamma "kamera" mantig'i bitta joyda:
 *   • birinchi yuklanishda hamma kuryerga sig'diradi, keyin zoomga tegmaydi;
 *   • "Hammasini ko'rsat" (`fitAllSignal` o'zgarganda) — yana sig'diradi;
 *   • fokus so'rovi (`focusRequest`) — HAR tanlovda (o'sha kuryer qayta
 *     tanlansa ham) 17-zoomga silliq uchadi, yetib borgach marker
 *     pulslaydi va `onArrive` chaqiriladi (karta shunda ochiladi);
 *   • kuzatish — fokusdagi kuryer siljisa xarita ortidan yuradi, lekin
 *     foydalanuvchi oxirgi 10 s ichida xaritani surgan bo'lsa — yo'q;
 *   • kun izi yuklanganda — izga sig'diradi.
 */
export function MapController({
  couriers,
  focusRequest,
  focused,
  fitAllSignal,
  fitBounds,
  onArrive,
}: {
  couriers: readonly LiveCourier[];
  focusRequest: FocusRequest | null;
  /** Kuzatiladigan kuryer (kamera uning ortidan yuradi). */
  focused: LiveCourier | null;
  fitAllSignal: number;
  /** Tashqi chegaralar (kun izi); o'zgarganda sig'diriladi. */
  fitBounds: LatLng[] | null;
  /** Kamera kuryerga yetib keldi (`moveend`). */
  onArrive?: (id: number) => void;
}) {
  const map = useMap();
  const fittedOnce = useRef(false);
  const lastUserPanAt = useRef<number | null>(null);
  const programmatic = useRef(false);
  /** Uchish davomida kuzatish (`panTo`) uni bo'lib qo'ymasin. */
  const flying = useRef(false);
  const onArriveRef = useRef(onArrive);
  useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  // Yon panel yig'ilganda/ochilganda konteyner o'lchami o'zgaradi — plitkalar qayta hisoblanadi.
  useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  // Foydalanuvchi harakati — faqat o'zi boshlagan surish/zoom.
  useEffect(() => {
    const markUser = () => {
      if (!programmatic.current) lastUserPanAt.current = Date.now();
    };
    const onMoveEnd = () => {
      programmatic.current = false;
    };
    map.on("dragstart", markUser);
    map.on("zoomstart", markUser);
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("dragstart", markUser);
      map.off("zoomstart", markUser);
      map.off("moveend", onMoveEnd);
    };
  }, [map]);

  const fitAll = (animate: boolean) => {
    const points = couriers
      .map((courier) => courier.lastLocation)
      .filter((point): point is NonNullable<typeof point> => point !== null)
      .map((point) => L.latLng(point.lat, point.lng));
    if (points.length === 0) return;
    programmatic.current = true;
    if (points.length === 1 && points[0]) {
      map.setView(points[0], 14, { animate });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: FIT_PADDING, animate, maxZoom: 15 });
  };

  // Birinchi yuklanish — bir marta; keyin foydalanuvchi zoomi saqlanadi.
  useEffect(() => {
    if (fittedOnce.current || couriers.length === 0) return;
    fittedOnce.current = true;
    fitAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat ro'yxat ilk kelganda
  }, [couriers]);

  useEffect(() => {
    if (fitAllSignal > 0) fitAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tugma bosilganda
  }, [fitAllSignal]);

  // Fokus so'rovi: har yangi `nonce` — uchish (o'sha kuryer bo'lsa ham).
  useEffect(() => {
    if (!focusRequest) return;
    const courier = couriers.find((item) => item.id === focusRequest.id);
    const point = courier?.lastLocation;
    if (!point) return;

    const target = L.latLng(point.lat, point.lng);
    const center = map.getSize().divideBy(2);
    const steps = planFlight({
      currentZoom: map.getZoom(),
      distancePx: map.latLngToContainerPoint(target).distanceTo(center),
      reducedMotion: prefersReducedMotion(),
    });

    let cancelled = false;
    let stepIndex = 0;
    let arrived = false;
    const arrive = () => {
      if (arrived || cancelled) return;
      arrived = true;
      flying.current = false;
      map.off("moveend", onStepEnd);
      pulseMarker(map, focusRequest.id);
      onArriveRef.current?.(focusRequest.id);
    };
    const runStep = () => {
      const step = steps[stepIndex];
      if (!step) {
        arrive();
        return;
      }
      programmatic.current = true;
      map.flyTo(target, step.zoom, {
        duration: step.duration,
        easeLinearity: step.easeLinearity,
      });
    };
    function onStepEnd() {
      if (cancelled) return;
      stepIndex += 1;
      if (stepIndex < steps.length) runStep();
      else arrive();
    }

    // `flyTo` oldingi uchishni o'zi to'xtatadi; uning tinglovchisi esa cleanup'da olingan.
    map.on("moveend", onStepEnd);
    flying.current = true;
    runStep();
    // `moveend` kelmay qolsa (kamera allaqachon joyida) — zaxira.
    const fallback = window.setTimeout(arrive, flightTimeoutMs(steps));

    return () => {
      cancelled = true;
      flying.current = false;
      window.clearTimeout(fallback);
      map.off("moveend", onStepEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat yangi so'rovda; ro'yxat yangilanishi uchishni qayta boshlamasin
  }, [focusRequest?.nonce, map]);

  // Kuzatish: fokusdagi kuryer siljidi.
  const focusedLat = focused?.lastLocation?.lat ?? null;
  const focusedLng = focused?.lastLocation?.lng ?? null;
  useEffect(() => {
    if (!focused || focusedLat === null || focusedLng === null || flying.current) return;
    const follow = shouldFollow({
      focusedId: focused.id,
      movedId: focused.id,
      lastUserPanAt: lastUserPanAt.current,
      now: Date.now(),
    });
    if (!follow) return;
    programmatic.current = true;
    map.panTo([focusedLat, focusedLng], {
      animate: !prefersReducedMotion(),
      duration: FOLLOW_DURATION_S,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat koordinata o'zgarganda
  }, [focusedLat, focusedLng]);

  // Kun izi chegaralari.
  useEffect(() => {
    if (!fitBounds || fitBounds.length === 0) return;
    programmatic.current = true;
    map.fitBounds(
      L.latLngBounds(fitBounds.map((point) => L.latLng(point.lat, point.lng))),
      { padding: FIT_PADDING, animate: true },
    );
  }, [fitBounds, map]);

  return null;
}

/** Harakatni kamaytirish so'ralgan — uchish qisqaradi (sakramaydi), kuzatish sakraydi. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Yetib kelgandagi puls — har safar qaytadan boshlanadi (o'sha kuryer
 * qayta tanlansa ham): atribut olib tashlanadi, reflow, qayta qo'yiladi.
 */
function pulseMarker(map: L.Map, id: number): void {
  const element = map
    .getContainer()
    .querySelector<HTMLElement>(`.courier-marker[data-courier-id="${id}"]`);
  if (!element) return;
  delete element.dataset.pulse;
  void element.offsetWidth;
  element.dataset.pulse = "on";
}
