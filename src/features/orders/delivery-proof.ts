import { resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Kuryer ilovasidan keladigan yetkazish ma'lumoti (`KURYER_API_QOLLANMA.md`
 * §4, §7). Kuryer `<Order>` obyekti bilan bir xil maydonlar — logist
 * javobida ham shu nomlar bilan keladi deb o'qiladi; maydon bo'lmasa
 * `null` (eski backend) va bo'lim ko'rinmaydi.
 */

/** Status ichidagi kuryer bosqichi — `status` ga tegmaydi. */
export const DELIVERY_STAGES = [
  { value: "unassigned", label: "Biriktirilmagan" },
  { value: "assigned", label: "Kuryerga biriktirildi" },
  { value: "picked_up", label: "Kuryer oldi" },
  { value: "on_the_way", label: "Yo'lda" },
  { value: "arrived", label: "Yetib keldi" },
  { value: "delivered", label: "Yetkazildi" },
  { value: "failed_attempt", label: "Yetkazib bo'lmadi" },
] as const;

export type DeliveryStage = (typeof DELIVERY_STAGES)[number]["value"];

export function mapDeliveryStage(raw: unknown): DeliveryStage | null {
  const value = asOptionalString(raw);
  return DELIVERY_STAGES.some((stage) => stage.value === value)
    ? (value as DeliveryStage)
    : null;
}

export type ProofPhoto = { full: string; thumb: string };

export type DeliveryProof = {
  photos: ProofPhoto[];
  deliveredAt: Date | null;
  receivedAmount: number | null;
  /** Server formatlagan summa — bo'lmasa ilova o'zi formatlaydi. */
  receivedAmountDisplay: string | null;
  paymentKind: string | null;
  /** Kuryer GPS nuqtasi manzildan necha metr uzoqda; GPS yo'q bo'lsa `null`. */
  distanceToAddressM: number | null;
  /** Qurilma soati server soatidan necha soniya farq qilgan. */
  timeDriftS: number | null;
  location: { lat: number; lng: number } | null;
  note: string | null;
  anomalyFlags: string[];
};

export function mapDeliveryProof(raw: unknown): DeliveryProof | null {
  if (!isRecord(raw)) return null;
  const location = asRecord(raw.location);
  const lat = asOptionalNumber(location.lat ?? raw.lat);
  const lng = asOptionalNumber(location.lng ?? raw.lng);

  return {
    photos: asArray(raw.photos)
      .map((item) => {
        const photo = asRecord(item);
        const full = asString(photo.full ?? photo.url);
        const thumb = asString(photo.thumb, full);
        return full
          ? { full: resolveMediaUrl(full), thumb: resolveMediaUrl(thumb) }
          : null;
      })
      .filter((photo): photo is ProofPhoto => photo !== null),
    deliveredAt: parseDate(raw.delivered_at),
    receivedAmount: asOptionalNumber(raw.received_amount),
    receivedAmountDisplay: asOptionalString(raw.received_amount_display),
    paymentKind: asOptionalString(raw.payment_kind),
    distanceToAddressM: asOptionalInt(raw.distance_to_address_m),
    timeDriftS: asOptionalInt(raw.time_drift_s ?? raw.time_drift_seconds),
    location: lat !== null && lng !== null ? { lat, lng } : null,
    note: asOptionalString(raw.note),
    anomalyFlags: asArray(raw.anomaly_flags)
      .map((flag) => asString(flag))
      .filter(Boolean),
  };
}

