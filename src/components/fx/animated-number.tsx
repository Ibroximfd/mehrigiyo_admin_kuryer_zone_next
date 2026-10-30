"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Raqamli sanagich: qiymat paydo bo'lganda (yoki o'zgarganda) unga qarab
 * yumshoq "yugurib" boradi. Statistika shunchaki turmasdan, jonlanadi.
 *
 * `requestAnimationFrame` + easeOutCubic; `prefers-reduced-motion` da
 * animatsiyasiz, bir zumda ko'rsatiladi.
 */
export function AnimatedNumber({
  value,
  duration = 700,
  className,
}: {
  value: number;
  /** Animatsiya davomiyligi, ms. */
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  /** Oldingi qiymat — yangi animatsiya shu yerdan boshlanadi. */
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (
      from === value ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{shown}</span>;
}
