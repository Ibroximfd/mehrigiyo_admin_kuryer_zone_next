"use client";

import { useEffect, useState } from "react";

/**
 * Bitta "hozir" soati: ko'p element (xarita markerlari, doska kartalaridagi
 * "ustunda 2 soat") shu qiymatdan hisoblanadi va hammasi bir vaqtda
 * yangilanadi — har element uchun alohida taymer yo'q.
 */
export function useNowTick(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
