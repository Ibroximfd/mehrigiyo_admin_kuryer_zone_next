"use client";

import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Reply-quote bosilganda asl xabarga o'tish.
 *
 * Xabar ekranda bo'lsa — suriladi va bir marta "yonib o'chadi"
 * (`.reply-flash`). Hali yuklanmagan bo'lsa eskiroq sahifalar birma-bir
 * olinadi (chegara bilan — cheksiz aylanib qolmasin), topilgach suriladi.
 *
 * Ikkala xona (operator va admin) uchun bitta hook: sahifa yuklash usuli
 * har xil bo'lgani uchun `fetchOlder` tashqaridan beriladi va "yana
 * bormi" javobini qaytaradi.
 */
export function useJumpToMessage({
  scrollRef,
  fetchOlder,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Eskiroq sahifani yuklaydi; yana sahifa bormi — shuni qaytaradi. */
  fetchOlder: () => Promise<boolean>;
}) {
  return useCallback(
    async (id: number) => {
      const find = () =>
        scrollRef.current?.querySelector<HTMLElement>(
          `[data-message-id="${id}"]`,
        ) ?? null;

      let element = find();

      // Topilmadi — tarixni birma-bir yuklaymiz (ko'pi bilan 15 sahifa).
      for (let attempt = 0; attempt < 15 && !element; attempt++) {
        const hasMore = await fetchOlder();
        // Yangi sahifa DOM'ga chizilishini kutamiz (ikki kadr).
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        element = find();
        if (!element && !hasMore) break;
      }

      if (!element) {
        // Juda eski (yoki o'chirilgan) xabar — jimgina muvaffaqiyatsiz
        // bo'lish o'rniga sababi aytiladi.
        toast.info("Asl xabar topilmadi — juda eski bo'lishi mumkin");
        return false;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // Flash surish tugagach boshlanadi — aks holda ko'z yetib borguncha
      // so'nib ulgurardi. Ketma-ket bosilganda ham qaytadan yonadi.
      const target = element;
      window.setTimeout(() => {
        target.classList.remove("reply-flash");
        void target.offsetWidth;
        target.classList.add("reply-flash");
        window.setTimeout(() => target.classList.remove("reply-flash"), 2100);
      }, 380);

      return true;
    },
    [scrollRef, fetchOlder],
  );
}
