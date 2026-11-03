"use client";

import { useEffect, useRef } from "react";

/** Oxirgacha shuncha piksel qolganda keyingi sahifa so'raladi. */
const PRELOAD_PX = 400;

/**
 * Ro'yxat oxiriga yetganda keyingi sahifani o'zi yuklaydi («Yana yuklash»
 * tugmasisiz). Qo'riqchi element ko'rinishga 400px qolganda chaqiriladi;
 * yuklanayotganda yoki sahifa qolmaganda chaqirilmaydi.
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const latest = useRef(onLoadMore);
  useEffect(() => {
    latest.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) latest.current();
      },
      { rootMargin: `${PRELOAD_PX}px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  return ref;
}
