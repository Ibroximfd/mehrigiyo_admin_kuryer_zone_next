"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Doska va ro'yxatdagi tanlov — ommaviy amallar paneli uchun. Faqat id lar
 * saqlanadi (server ma'lumoti nusxalanmaydi): buyurtmalar har safar joriy
 * keshdan olinadi, ya'ni realtime yangilanish tanlovni eskirtirmaydi.
 */
export function useOrderSelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return useMemo(
    () => ({ selected, toggle, selectMany, clear }),
    [selected, toggle, selectMany, clear],
  );
}

export type OrderSelection = ReturnType<typeof useOrderSelection>;
