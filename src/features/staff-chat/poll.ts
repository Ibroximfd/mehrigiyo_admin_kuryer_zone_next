"use client";

import { useMemo } from "react";

import { useOperatorSocketOnline } from "@/hooks/use-operator-socket";

/**
 * Soketsiz rejim uchun zaxira so'rov — xodimlar chati.
 *
 * Asosiy kanal — operator soketi (`staff_message`, `staff_badge` …): ochiq
 * turganda so'rov umuman ketmaydi, qayta ulanishda esa panel karkasi
 * hamma narsani yangilaydi. Soket uzilgan bo'lsa (proksi, tarmoq, server
 * qayta ishga tushdi) ro'yxat va ochiq kanal so'rov bilan tirik turadi:
 *
 *   — o'zgarish bo'lsa keyingi so'rov `min` dan keyin;
 *   — o'zgarish bo'lmasa oraliq ikki barobar, `max` gacha o'sadi;
 *   — yashirin tabda so'rov ketmaydi (TanStack standarti), tabga
 *     qaytganda esa darhol yangilanadi (`refetchOnWindowFocus`).
 */

export type BackoffOptions = { minMs: number; maxMs: number };

export const STAFF_POLL_BACKOFF: BackoffOptions = {
  minMs: 8_000,
  maxMs: 60_000,
};

/**
 * Holatli oraliq hisoblagich. Bir fetch uchun bir necha marta chaqirilishi
 * mumkin — oraliq faqat yangi javob (`updatedAt`) kelganda o'zgaradi.
 */
export function createBackoffInterval({ minMs, maxMs }: BackoffOptions) {
  let delay = minMs;
  let lastData: unknown = undefined;
  let lastUpdatedAt = -1;

  return (data: unknown, updatedAt: number): number => {
    if (updatedAt === lastUpdatedAt) return delay;
    const changed = lastUpdatedAt === -1 || data !== lastData;
    lastUpdatedAt = updatedAt;
    lastData = data;
    delay = changed ? minMs : Math.min(maxMs, delay * 2);
    return delay;
  };
}

type PollableQuery = {
  state: { data: unknown; dataUpdatedAt: number };
};

/**
 * `refetchInterval` qiymati: soket ochiq — `false`, uzilgan — backoff.
 * Har chaqiruvchi o'z hisoblagichini oladi (ro'yxat va xona alohida).
 */
export function useStaffFallbackPoll():
  false | ((query: PollableQuery) => number) {
  const online = useOperatorSocketOnline();
  const next = useMemo(() => createBackoffInterval(STAFF_POLL_BACKOFF), []);

  return useMemo(
    () =>
      online
        ? false
        : (query: PollableQuery) =>
            next(query.state.data, query.state.dataUpdatedAt),
    [online, next],
  );
}
