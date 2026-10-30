"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { NAV } from "@/components/panel/nav";
import { escapeTarget, hasOpenOverlay } from "@/lib/escape-back";
import { useUiStore } from "@/stores/ui-store";

/**
 * Global klaviatura qisqartmalari.
 *
 *   g → b/k/f/s/h  bo'limlar (harf bo'yicha)   ⌘B  yon panelni yig'ish
 *   g → 1..5       bo'limlar (tartib bo'yicha) ⌘K  buyruqlar paneli
 *   r              joriy sahifani yangilash
 *   Esc            ichki sahifadan ortga (kuryer → kuryerlar, operator → operatorlar…)
 *
 * "g" ketma-ketligi Gmail/Linear'dagi kabi: `g` bosilgach 1.2 soniya ichida
 * ikkinchi tugma kutiladi.
 */
export function useShortcuts({ onRefresh }: { onRefresh?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    let awaitingGo = false;
    let goTimer: ReturnType<typeof setTimeout> | null = null;

    const resetGo = () => {
      awaitingGo = false;
      if (goTimer) clearTimeout(goTimer);
      goTimer = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      // ⌘B matn yozayotganda ham ishlayveradi.
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      // Esc: avval oyna/menyu yopiladi (Radix o'zi), yozayotgan bo'lsa —
      // maydondan chiqadi; faqat bo'sh sahifada ota sahifaga qaytadi.
      if (event.key === "Escape") {
        if (event.defaultPrevented || isTyping || hasOpenOverlay()) return;
        const target = escapeTarget(pathname, window.location.search);
        if (target) {
          event.preventDefault();
          router.push(target);
        }
        return;
      }

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (awaitingGo) {
        resetGo();
        // Avval harf (`g→b`), keyin raqam (`g→2`).
        const byLetter = NAV.find((item) => item.goKey === key);
        const byIndex = NAV[Number.parseInt(key, 10) - 1];
        const item = byLetter ?? byIndex;
        if (item) {
          event.preventDefault();
          router.push(item.href);
        }
        return;
      }

      if (key === "g") {
        awaitingGo = true;
        goTimer = setTimeout(resetGo, 1200);
        return;
      }

      if (key === "r") {
        event.preventDefault();
        refreshRef.current?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      resetGo();
    };
  }, [router, toggleSidebar, pathname]);
}
