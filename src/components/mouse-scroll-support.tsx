"use client";

import { useEffect } from "react";

import { wheelTarget } from "@/lib/mouse-scroll";
import type { ScrollBox } from "@/lib/mouse-scroll";

/**
 * DOM zanjiri → qaror funksiyasining kutilgan shakli. Ota dangasa
 * o'qiladi (getter): odatda bir-ikki qadamda qaror chiqadi.
 */
function chain(element: Element | null, owners: Map<ScrollBox, HTMLElement>): ScrollBox | null {
  if (!(element instanceof HTMLElement) || element === document.body) return null;
  const overflowY = getComputedStyle(element).overflowY;
  const box: ScrollBox = {
    get parent() {
      return chain(element.parentElement, owners);
    },
    wheelX: element.hasAttribute("data-wheel-x"),
    scrollsY: (overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight + 1,
    scrollLeft: element.scrollLeft,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  };
  owners.set(box, element);
  return box;
}

/**
 * Butun ilova uchun bitta tinglovchi: `data-wheel-x` qatorlar ustida
 * sichqoncha g'ildiragi yon tomonga suradi (Shift shart emas). Trackpad
 * gorizontal surishi (deltaX), Shift+g'ildirak va Ctrl (zoom) —
 * brauzerniki, tegilmaydi.
 */
export function MouseScrollSupport() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.shiftKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const owners = new Map<ScrollBox, HTMLElement>();
      const start = chain(event.target instanceof Element ? event.target : null, owners);
      const target = wheelTarget(start, event.deltaY);
      const element = target ? owners.get(target) : undefined;
      if (!element) return;
      event.preventDefault();
      // Satr rejimidagi g'ildirak (Firefox) — piksellarga.
      element.scrollLeft += event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;
    };
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);
  return null;
}
