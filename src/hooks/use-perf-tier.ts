"use client";

import { useSyncExternalStore } from "react";

import type { PerfTier } from "@/stores/ui-store";

/**
 * `<html data-perf>` pog'onasi — boot skripti (`layout.tsx`) birinchi
 * chizishdan oldin qo'yadi, sozlama o'zgarsa `ui-store` yangilaydi.
 *
 * CSS uni o'zi o'qiydi; bu hook JS animatsiyalar (motion) uchun — ular
 * `data-perf="low"` da bir zumda o'tishi kerak. Serverda `low`: xavfsiz tomon,
 * brauzerda birinchi renderdayoq haqiqiy qiymat o'qiladi.
 */
function readTier(): PerfTier {
  const value = document.documentElement.getAttribute("data-perf");
  return value === "medium" || value === "high" ? value : "low";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-perf"],
  });
  return () => observer.disconnect();
}

export function usePerfTier(): PerfTier {
  return useSyncExternalStore(subscribe, readTier, () => "low");
}
