"use client";

import { useEffect, useState } from "react";

/**
 * Bitta «hozir» soati: «3 daqiqa oldin» kabi yozuvlar shu qiymatdan hisoblanadi
 * va birga yangilanadi — har element uchun alohida taymer yo'q.
 */
export function useNowTick(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
