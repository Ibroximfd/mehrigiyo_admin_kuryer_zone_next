"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * 3D og'ish (tilt) effekti: sichqoncha kartochka ustida yurganda u yorug'
 * aksi bilan birga mayin egiladi.
 *
 * Performance sirlari:
 *   - burchaklar React holatiga emas, to'g'ridan-to'g'ri CSS o'zgaruvchilarga
 *     yoziladi — harakat paytida komponent UMUMAN qayta chizilmaydi;
 *   - yozish `requestAnimationFrame` ichida — kadr boshiga ko'pi bilan bitta;
 *   - sensorli ekran va `prefers-reduced-motion` da effekt o'zi o'chadi.
 *
 * Burchak radiusi (`rounded-*`) shu komponentga beriladi — yorug' aks uni
 * `border-radius: inherit` orqali oladi.
 */

/** Faqat aniq kursorli, harakatga qarshiligi yo'q qurilmalarda yoqiladi. */
const TILT_MEDIA =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Maksimal og'ish burchagi — katta qiymat "o'yinchoq"qa aylantirib yuboradi. */
const MAX_TILT_DEG = 6;

export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  useEffect(() => {
    const media = window.matchMedia(TILT_MEDIA);
    const sync = () => {
      enabled.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || !enabled.current) return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width; // 0..1
    const y = (event.clientY - rect.top) / rect.height; // 0..1

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty("--fx-ry", `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
      element.style.setProperty("--fx-rx", `${((0.5 - y) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
      element.style.setProperty("--fx-gx", `${(x * 100).toFixed(1)}%`);
      element.style.setProperty("--fx-gy", `${(y * 100).toFixed(1)}%`);
      element.style.setProperty("--fx-glare", "1");
    });
  };

  const onPointerLeave = () => {
    const element = ref.current;
    if (!element) return;

    cancelAnimationFrame(frame.current);
    element.style.setProperty("--fx-rx", "0deg");
    element.style.setProperty("--fx-ry", "0deg");
    element.style.setProperty("--fx-glare", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn("fx-tilt relative", className)}
    >
      {children}
      <span aria-hidden className="fx-glare" />
    </div>
  );
}
