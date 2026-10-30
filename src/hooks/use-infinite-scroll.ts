"use client";

import { useEffect, useRef } from "react";

/**
 * Ro'yxat oxiriga yetganda keyingi sahifani o'zi yuklaydi.
 *
 * Qaytgan `ref` ni ro'yxatning eng pastidagi bo'sh "qorovul" elementga
 * bering. U ko'rinish maydoniga kirishi bilan `onLoadMore` chaqiriladi —
 * ya'ni "Ko'proq yuklash" tugmasini bosish shart emas.
 *
 * Kuzatuvchining ildizi — oyna: qorovul aylanadigan konteyner ichida
 * bo'lgani uchun u konteyner kesib turganda ko'rinmaydi va faqat pastga
 * aylantirilganda ishga tushadi.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasMore,
  isLoading,
  onLoadMore,
  /** Ro'yxat tugashidan biroz oldin yuklab qo'yish uchun zaxira. */
  rootMargin = "160px",
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}) {
  const sentinelRef = useRef<T>(null);

  // Callback o'zgarishi kuzatuvchini qayta yaratmasin.
  const handler = useRef(onLoadMore);
  useEffect(() => {
    handler.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) handler.current();
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, rootMargin]);

  return sentinelRef;
}
