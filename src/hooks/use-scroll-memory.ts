"use client";

import { useCallback, useEffect, useRef } from "react";

import { readScroll, restoreStep, writeScroll } from "@/lib/scroll-memory";
import type { ScrollAxis } from "@/lib/scroll-memory";

/** Kontent shu vaqt ichida o'smasa tiklashdan voz kechiladi. */
const RESTORE_TIMEOUT_MS = 4000;

/**
 * Scroll qiladigan elementga ref beradi: joyni kalit bo'yicha eslab qoladi
 * va qaytganda tiklaydi. Shu uchta holatni qamraydi:
 *
 * - element qayta o'rnatildi (boshqa bo'limdan qaytildi);
 * - element `display: none` dan ko'rinadigan bo'ldi (detal yopildi —
 *   brauzer yashirilgan elementning scrollini nolga tushiradi);
 * - kontent kech keldi yoki bosqichma-bosqich chiziladi (kartalar soni
 *   o'sib boradi) — maqsadga yetguncha yoki foydalanuvchi o'zi surguncha
 *   kutiladi.
 *
 * `key` `null` bo'lsa xotira o'chiq.
 */
export function useScrollMemory<T extends HTMLElement>(key: string | null, axis: ScrollAxis = "y") {
  const elementRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const attach = useCallback(
    (node: T | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      elementRef.current = node;
      if (!node || !key) return;

      const position = () => (axis === "y" ? node.scrollTop : node.scrollLeft);
      const max = () =>
        axis === "y" ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
      const visible = () => node.clientHeight > 0 && node.clientWidth > 0;

      let restoring = true;
      let applying = false;
      let frame = 0;
      let startedAt = performance.now();

      let touched = false;
      const stopRestoring = () => {
        restoring = false;
        touched = true;
      };

      const apply = (target: number) => {
        applying = true;
        if (axis === "y") node.scrollTop = target;
        else node.scrollLeft = target;
        applying = false;
      };

      /*
       * Marshrut almashganda Next o'z segmentini tepaga suradi — bu bizning
       * tiklashdan keyin bo'lishi mumkin. Bir-ikki kadr kuzatib, joy
       * foydalanuvchisiz o'zgargan bo'lsa qayta qo'yamiz.
       */
      const verify = (target: number, frames: number) => {
        requestAnimationFrame(() => {
          if (touched || !visible()) return;
          if (Math.abs(position() - target) > 1 && max() + 1 >= target) apply(target);
          if (frames > 1) verify(target, frames - 1);
        });
      };

      const tryRestore = () => {
        if (!restoring) return;
        const target = readScroll(key);
        const step = restoreStep({ target, current: position(), max: max(), visible: visible() });
        if (step === "done") {
          restoring = false;
          return;
        }
        if (step === "apply" || (step === "wait" && visible())) {
          apply(target);
          if (step === "apply") {
            restoring = false;
            verify(target, 2);
          }
        }
        if (performance.now() - startedAt > RESTORE_TIMEOUT_MS && visible()) restoring = false;
      };

      const onScroll = () => {
        // Yashirin element (detal ochiq) yoki o'zimiz qo'ygan qiymat — yozilmaydi.
        if (applying || !visible()) return;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!restoring) writeScroll(key, position());
        });
      };

      // Foydalanuvchi o'zi sursa — tiklash to'xtaydi, uning tanlovi ustun.
      const userInput = () => {
        stopRestoring();
      };

      // Ko'rinish (0 → o'lcham) va kontent o'sishi — ikkalasida ham qayta urinish.
      const resize = new ResizeObserver(() => {
        if (!visible()) {
          // Yashirildi: keyingi ko'rinishda qayta tiklaymiz.
          restoring = true;
          touched = false;
          startedAt = performance.now();
          return;
        }
        tryRestore();
      });
      resize.observe(node);
      const mutation = new MutationObserver(() => tryRestore());
      mutation.observe(node, { childList: true, subtree: true });

      node.addEventListener("scroll", onScroll, { passive: true });
      node.addEventListener("wheel", userInput, { passive: true });
      node.addEventListener("touchstart", userInput, { passive: true });
      node.addEventListener("pointerdown", userInput, { passive: true });
      node.addEventListener("keydown", userInput);
      tryRestore();

      cleanupRef.current = () => {
        if (frame) cancelAnimationFrame(frame);
        resize.disconnect();
        mutation.disconnect();
        node.removeEventListener("scroll", onScroll);
        node.removeEventListener("wheel", userInput);
        node.removeEventListener("touchstart", userInput);
        node.removeEventListener("pointerdown", userInput);
        node.removeEventListener("keydown", userInput);
      };
    },
    [key, axis],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  return attach;
}
