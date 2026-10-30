"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { updateOrder } from "@/features/orders/api";
import type { LogistOrderPatch } from "@/features/orders/api";
import { runSequential, summarizeBulk } from "@/features/orders/bulk";
import type { BulkProgress, BulkSummary } from "@/features/orders/bulk";
import { errorCode } from "@/lib/api-client";

/**
 * Buyurtmalarga birma-bir PATCH — progress, bekor qilish va yakuniy xulosa
 * bilan. `buildPatch` har buyurtma uchun alohida (teg qo'shishda har birining
 * o'z teglari saqlanadi).
 */
export function useBulkPatch() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(
    async (ids: string[], buildPatch: (id: string) => LogistOrderPatch) => {
      controller.current = new AbortController();
      setSummary(null);
      const results = await runSequential(ids, (id) => updateOrder(id, buildPatch(id)), {
        toCode: (error) => errorCode(error) ?? "unknown",
        onProgress: setProgress,
        signal: controller.current.signal,
      });
      const next = summarizeBulk(results, ids.length);
      setSummary(next);
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["couriers"] });
      return next;
    },
    [queryClient],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => {
    setSummary(null);
    setProgress(null);
  }, []);

  return { run, cancel, reset, progress, summary, running: progress !== null };
}
