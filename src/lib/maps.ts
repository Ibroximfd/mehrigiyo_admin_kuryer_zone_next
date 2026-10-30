/**
 * Xarita koordinatasi va tashqi havola (2026-10-16: egasi qarori — ichki
 * xarita yo'q, faqat bepul Yandex Maps havolasi; kalit talab qilinmaydi).
 *
 * Sof funksiyalar — kuryer isboti, kuryer kartasi va marshrut rejasi bitta
 * manbadan foydalanadi; test ham shu yerda.
 */

export type LatLng = { lat: number; lng: number };

/** Nuqtani Yandex Maps saytida ochish — `types.ts` dagi `mapLink` bilan bir xil format. */
export function yandexMapsPointUrl(point: LatLng): string {
  return `https://yandex.uz/maps/?pt=${point.lng},${point.lat}&z=16`;
}

/** Koordinata `null`/`undefined` bo'lsa nuqta yo'q — havola ham chiqmaydi. */
export function toLatLng(
  lat: number | null | undefined,
  lng: number | null | undefined,
): LatLng | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined)
    return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const EARTH_RADIUS_M = 6_371_000;

/**
 * Ikki nuqta orasidagi to'g'ri chiziq (haversine), metr. Yo'l masofasi emas —
 * kuryer buyurtmaga "qancha yaqin" ekanini ko'z bilan baholash uchun.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
