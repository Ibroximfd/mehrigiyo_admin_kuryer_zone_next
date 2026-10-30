"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { Locale } from "@/lib/i18n/locale";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Server tilga bog'liq matn beradigan kesh ildizlari: buyurtmadagi
 * `delivery.district_display` `X-Lang` bo'yicha keladi.
 */
export const LOCALIZED_QUERY_ROOTS = ["orders"] as const;

/** Faqat haqiqiy almashuv: birinchi (gidratsiya) qiymati emas. */
export function isLocaleSwitch(prev: Locale | null, next: Locale): boolean {
  return prev !== null && prev !== next;
}

/**
 * Til almashganda tilga bog'liq server ma'lumoti qayta so'raladi —
 * aks holda tuman nomi sahifa yangilanguncha eski tilda turardi.
 */
export function useLocaleRefetch(): void {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((state) => state.locale);
  const hydrated = useLocaleStore((state) => state.hydrated);
  const previous = useRef<Locale | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (isLocaleSwitch(previous.current, locale)) {
      for (const root of LOCALIZED_QUERY_ROOTS) {
        void queryClient.invalidateQueries({ queryKey: [root] });
      }
    }
    previous.current = locale;
  }, [hydrated, locale, queryClient]);
}
