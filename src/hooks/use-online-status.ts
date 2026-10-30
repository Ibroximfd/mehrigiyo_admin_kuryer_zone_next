"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Internet ulanishi holati.
 *
 * Operator ko'pincha zaif tarmoqda ishlaydi; ulanish uzilganda so'rovlar
 * jimgina yiqilishi o'rniga yuqorida ochiq ogohlantirish chiqadi.
 *
 * `useSyncExternalStore` — brauzer holatiga obuna bo'lishning to'g'ri yo'li:
 * `useEffect` ichida `setState` chaqirishdan farqli o'laroq, qo'shimcha
 * render bosqichini keltirib chiqarmaydi.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // server'da doim "ulangan" deb hisoblaymiz
  );
}
