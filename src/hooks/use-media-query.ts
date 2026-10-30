"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * CSS media so'rovini React holatiga bog'laydi.
 *
 * Ko'p joyda buning o'rniga oddiy Tailwind klasslari yetarli (`hidden md:flex`).
 * Bu hook faqat DOM'ning o'zi boshqacha bo'lishi kerak bo'lgan joylar uchun —
 * masalan jadval o'rniga kartochkalar chizilganda: ikkalasini ham render qilib
 * bittasini yashirish ortiqcha ish bo'lardi.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind'dagi `md` chegarasi: 768px dan kichik — mobil. */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)");
}
