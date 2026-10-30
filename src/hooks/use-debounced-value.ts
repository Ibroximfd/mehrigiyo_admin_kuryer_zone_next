"use client";

import { useEffect, useState } from "react";

/**
 * Qiymatni kechiktirib qaytaradi — qidiruv maydonida har bir harfda
 * so'rov ketmasligi uchun.
 *
 * Flutter'da bu `Timer(Duration(milliseconds: 500), ...)` bilan qo'lda
 * yozilardi (`consultations_filter_panel.dart`, `orders_page.dart`).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
