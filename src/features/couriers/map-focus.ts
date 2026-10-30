import type { LiveCourier } from "./live-tracking";

/**
 * Xaritada kuryerga "uchish" — sof qoidalar (kamera komponenti faqat
 * bajaradi).
 *
 * Nega `focusedId` emas, `FocusRequest`: fokus id'si o'zgarmasa effekt
 * ishlamaydi — o'sha kuryerni qayta tanlash, markerni bosish yoki qidiruvda
 * yana tanlash "hech narsa bo'lmadi" bo'lib qolardi. Har tanlov yangi
 * `nonce` oladi, ya'ni har safar uchadi.
 */
export type FocusRequest = { id: number; nonce: number };

/** Har tanlov (qidiruv, ro'yxat, marker) — yangi so'rov, hatto o'sha kuryer bo'lsa ham. */
export function nextFocusRequest(previous: FocusRequest | null, id: number): FocusRequest {
  return { id, nonce: (previous?.nonce ?? 0) + 1 };
}

/** Tanlovni bajarish mumkinmi: joylashuvi yo'q kuryerga uchib bo'lmaydi. */
export type FocusDecision = { kind: "fly"; id: number } | { kind: "no-location"; id: number };

export function decideFocus(courier: Pick<LiveCourier, "id" | "lastLocation">): FocusDecision {
  return courier.lastLocation
    ? { kind: "fly", id: courier.id }
    : { kind: "no-location", id: courier.id };
}

/** Kuryerga yaqinlashish darajasi — ko'cha va uy raqami o'qiladi. */
export const FOCUS_ZOOM = 17;
export const FLY_DURATION_S = 1.2;
export const FLY_EASE_LINEARITY = 0.25;
/** "Harakatni kamaytirish" yoqilgan: sakrash emas, qisqa va yumshoq siljish. */
export const REDUCED_DURATION_S = 0.4;
/** Kamera allaqachon yaqin bo'lsa — shuncha pog'ona chiqib, qaytib tushadi. */
export const BOUNCE_OUT_ZOOM = 2;
/** Nishon markazdan shu pikseldan yaqin — uchish ko'rinmaydi, "sakrash" kerak. */
export const NEAR_CENTER_PX = 80;

export type FlightStep = { zoom: number; duration: number; easeLinearity: number };

/**
 * Kamera qadamlari.
 *
 * Oddiy holat — bitta `flyTo(17)`; Leaflet uzoq masofada o'zi chiqib-tushadi.
 * Kamera allaqachon ≥ 17 da va nishon deyarli markazda bo'lsa bitta
 * `flyTo` hech narsa ko'rsatmaydi — shuning uchun avval 2 pog'ona chiqib,
 * keyin qaytib tushiladi: foydalanuvchi tanlov "ishladi"ni ko'radi.
 */
export function planFlight({
  currentZoom,
  distancePx,
  reducedMotion,
}: {
  currentZoom: number;
  /** Nishonning hozirgi ekran markazidan masofasi. */
  distancePx: number;
  reducedMotion: boolean;
}): FlightStep[] {
  if (reducedMotion) {
    return [{ zoom: FOCUS_ZOOM, duration: REDUCED_DURATION_S, easeLinearity: FLY_EASE_LINEARITY }];
  }
  const near = currentZoom >= FOCUS_ZOOM && distancePx < NEAR_CENTER_PX;
  if (!near) {
    return [{ zoom: FOCUS_ZOOM, duration: FLY_DURATION_S, easeLinearity: FLY_EASE_LINEARITY }];
  }
  const half = FLY_DURATION_S / 2;
  return [
    { zoom: FOCUS_ZOOM - BOUNCE_OUT_ZOOM, duration: half, easeLinearity: FLY_EASE_LINEARITY },
    { zoom: FOCUS_ZOOM, duration: half, easeLinearity: FLY_EASE_LINEARITY },
  ];
}

/** Barcha qadamlar tugashi kerak bo'lgan vaqt (ms) — `moveend` kelmasa zaxira. */
export function flightTimeoutMs(steps: readonly FlightStep[]): number {
  return Math.round(steps.reduce((sum, step) => sum + step.duration, 0) * 1000) + 400;
}
