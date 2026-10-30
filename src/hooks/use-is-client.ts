"use client";

import { useSyncExternalStore } from "react";

/** Hech qachon o'zgarmaydigan tashqi manba — obuna bo'shligicha qoladi. */
const subscribe = () => () => {};

/**
 * Komponent brauzerda render bo'lyaptimi?
 *
 * Server'da (build paytida) `false`, brauzerda `true` qaytaradi. Bu
 * `useState` + `useEffect` juftligining o'rniga ishlatiladi: React uni
 * hydration bilan bir qadamda hal qiladi, ortiqcha qayta render bo'lmaydi.
 *
 * Kerak bo'ladigan joylar: qiymati faqat brauzerda ma'lum bo'lgan narsalar
 * (joriy mavzu, `localStorage`, ekran o'lchami).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
