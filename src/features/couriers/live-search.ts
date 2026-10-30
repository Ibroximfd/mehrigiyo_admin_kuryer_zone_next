import {
  MATCH_NONE,
  makeSearchText,
  parseSearchQuery,
  scoreDigits,
  scoreText,
} from "@/lib/search";

import type { LiveCourier } from "./live-tracking";

/**
 * Jonli xaritada kuryer qidiruvi: ism, telefon, zona, joriy buyurtma raqami.
 * Kirill/lotin yozuviga befarq (`lib/search.ts`). Sof funksiyalar — test
 * shu yerda, komponent faqat chizadi.
 */

export type LiveSearchHit = { courier: LiveCourier; score: number };

function scoreCourier(courier: LiveCourier, query: NonNullable<ReturnType<typeof parseSearchQuery>>): number {
  let best = scoreText(makeSearchText(courier.fullName), query);
  best = Math.max(best, scoreDigits(courier.phone, query));
  for (const zone of courier.zones) {
    best = Math.max(best, scoreText(makeSearchText(zone), query));
  }
  const orderNumber = courier.currentOrder?.orderNumber;
  if (orderNumber) {
    // `#DA-184011` ni `184011` deb ham qidiradilar.
    best = Math.max(
      best,
      scoreText(makeSearchText(orderNumber), query),
      scoreDigits(orderNumber, query),
    );
  }
  return best;
}

/** Bo'sh so'rovda `null` — ro'yxat filtrlanmaydi. Natija ball bo'yicha, keyin ism bo'yicha. */
export function searchLiveCouriers(
  couriers: readonly LiveCourier[],
  input: string,
): LiveSearchHit[] | null {
  const query = parseSearchQuery(input);
  if (!query) return null;
  return couriers
    .map((courier) => ({ courier, score: scoreCourier(courier, query) }))
    .filter((hit) => hit.score > MATCH_NONE)
    .sort(
      (a, b) =>
        b.score - a.score || a.courier.fullName.localeCompare(b.courier.fullName),
    );
}

/** Yagona aniq natija — darhol fokuslanadi; ko'p bo'lsa foydalanuvchi tanlaydi. */
export function soleMatch(hits: readonly LiveSearchHit[] | null): LiveCourier | null {
  return hits && hits.length === 1 ? (hits[0]?.courier ?? null) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kuzatish rejimi
// ─────────────────────────────────────────────────────────────────────────────

/** Foydalanuvchi xaritani surgandan keyin shuncha vaqt kuzatish to'xtaydi. */
export const FOLLOW_PAUSE_MS = 10_000;

/**
 * Fokusdagi kuryer siljiganda xarita ortidan yurishi kerakmi.
 * Foydalanuvchi oxirgi 10 s ichida xaritani surgan bo'lsa — yo'q: uning
 * ko'rinishi tortib olinmaydi.
 */
export function shouldFollow({
  focusedId,
  movedId,
  lastUserPanAt,
  now,
}: {
  focusedId: number | null;
  movedId: number;
  lastUserPanAt: number | null;
  now: number;
}): boolean {
  if (focusedId === null || focusedId !== movedId) return false;
  if (lastUserPanAt === null) return true;
  return now - lastUserPanAt >= FOLLOW_PAUSE_MS;
}
