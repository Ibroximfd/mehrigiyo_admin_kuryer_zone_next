"use client";

import { useCallback, useRef } from "react";

import { PAN_BLOCKERS } from "@/lib/mouse-scroll";

/** Shundan kam siljish — oddiy bosish (surish boshlanmaydi). */
const THRESHOLD_PX = 6;

/**
 * Doskani sichqoncha bilan ushlab surish (Bitrix/Trello kabi): bo'sh joyni
 * bosib, chapga-o'ngga tortish. Karta, tugma, havola, maydon ustida
 * ishlamaydi — u yerda odatdagi bosish va sudrash. Faqat sichqoncha
 * (`pointerType === "mouse"`), barmoq o'zi suradi.
 */
export function useDragPan<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback((node: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (!(event.target instanceof Element) || event.target.closest(PAN_BLOCKERS)) return;
      if (node.scrollWidth <= node.clientWidth + 1) return;
      const startX = event.clientX;
      const startLeft = node.scrollLeft;
      let panning = false;

      const onMove = (move: PointerEvent) => {
        const dx = move.clientX - startX;
        if (!panning) {
          if (Math.abs(dx) < THRESHOLD_PX) return;
          panning = true;
          node.style.cursor = "grabbing";
          node.style.userSelect = "none";
          node.style.scrollSnapType = "none";
        }
        node.scrollLeft = startLeft - dx;
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        node.style.cursor = "";
        node.style.userSelect = "";
        node.style.scrollSnapType = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    node.addEventListener("pointerdown", onPointerDown);
    cleanup.current = () => node.removeEventListener("pointerdown", onPointerDown);
  }, []);
}
