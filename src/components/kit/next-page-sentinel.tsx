"use client";

import { LoaderCircle } from "lucide-react";

import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

/** Ro'yxat oxiri: pastga aylantirganda keyingi sahifa o'zi yuklanadi — «Yana yuklash» tugmasisiz. */
export function NextPageSentinel({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  const ref = useInfiniteScroll({ hasMore, isLoading, onLoadMore });
  if (!hasMore) return null;
  return (
    <div ref={ref} className="text-ink-muted border-line flex min-h-11 items-center justify-center gap-2 border-t p-3 text-meta" aria-live="polite">
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {isLoading ? "Yuklanmoqda…" : null}
    </div>
  );
}
