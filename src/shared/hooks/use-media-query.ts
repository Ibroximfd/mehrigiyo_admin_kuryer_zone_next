"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * CSS media so'rovi React holati sifatida. Faqat DOM tuzilishi farq qilishi
 * kerak bo'lgan joylarda (jadval ↔ kartochkalar); qolgan joyda Tailwind yetarli.
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
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/**
 * Keng jadval sig'adigan ekran: Tailwind `xl` (1280px). `lg` da yon panel
 * 16rem oladi va kontentga ~690px qoladi — ko'p ustunli jadval sig'maydi,
 * shuning uchun undan torroqda kartochkalar ko'rsatiladi.
 */
export function useIsWideScreen(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}
