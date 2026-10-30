"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Side = "left" | "right";

/** Kursor chekkadan shuncha ichkarida bo'lsa strelka chiqadi. */
const EDGE_ZONE_PX = 140;
/** Bitta bosish — taxminan bitta ustun. */
const CLICK_STEP_PX = 300;
/** Strelka ustida shuncha turilsa o'zi sekin suriladi. */
const HOVER_DELAY_MS = 350;
/** Tezliklar soniyasiga pikselda — kadr tezligiga bog'liq emas. */
const HOVER_SPEED = 480;
const PRESS_SPEED = 1400;
/** Shundan qisqa bosish — oddiy "click" (bir qadam). */
const TAP_MS = 220;

/**
 * Kanban doskasining gorizontal skroll strelkalari.
 *
 * Kursor doskaning chap yoki o'ng chetiga yaqinlashganda (va o'sha tomonga
 * surish mumkin bo'lsa) strelka chiqadi. Uch usul:
 *   - bir marta bosish — bir ustunga silliq suriladi;
 *   - strelka ustida turish — o'zi sekin suriladi;
 *   - bosib turish — tez suriladi, qo'yib yuborilganda to'xtaydi.
 * Kartochka sudralayotganda ham ishlaydi: kartani strelka ustiga olib
 * borish doskani suradi. Sensorli ekranda chizilmaydi — u yerda barmoq
 * bilan surish tabiiy.
 */
export function BoardEdgeScroll({
  scrollerRef,
  children,
}: {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [can, setCan] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const [near, setNear] = useState<Side | null>(null);
  const [engaged, setEngaged] = useState<Side | null>(null);

  const speed = useRef(0);
  const frame = useRef<number | null>(null);
  const lastTime = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef(0);
  const pressed = useRef(false);
  const longPressed = useRef(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setCan((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, [scrollerRef]);

  const stopLoop = useCallback(() => {
    speed.current = 0;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    // Uzluksiz surish paytida o'chirilgan snap qaytariladi.
    const el = scrollerRef.current;
    if (el) el.style.scrollSnapType = "";
  }, [scrollerRef]);

  /*
   * Kadr qadami ref'da: rAF zanjiri o'zini o'zi chaqiradi, `useCallback`
   * esa o'ziga havola qila olmaydi. Effekt har renderda eng so'nggi
   * qadamni yozib qo'yadi.
   */
  const step = useRef<FrameRequestCallback>(() => {});
  useEffect(() => {
    step.current = (time) => {
      const el = scrollerRef.current;
      if (!el || speed.current === 0) {
        frame.current = null;
        return;
      }
      const dt = Math.min(64, time - (lastTime.current || time));
      lastTime.current = time;
      el.scrollLeft += (speed.current * dt) / 1000;
      const atEnd =
        speed.current < 0
          ? el.scrollLeft <= 0
          : el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if (atEnd) {
        stopLoop();
        return;
      }
      frame.current = requestAnimationFrame((next) => step.current(next));
    };
  });

  const run = useCallback(
    (side: Side, pxPerSecond: number) => {
      speed.current = side === "left" ? -pxPerSecond : pxPerSecond;
      if (frame.current === null) {
        // `snap-mandatory` har kichik siljishni orqaga tortardi — vaqtincha o'chadi.
        const el = scrollerRef.current;
        if (el) el.style.scrollSnapType = "none";
        lastTime.current = 0;
        frame.current = requestAnimationFrame((time) => step.current(time));
      }
    },
    [scrollerRef],
  );

  const clearHoverTimer = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [scrollerRef, measure]);

  useEffect(
    () => () => {
      stopLoop();
      clearHoverTimer();
    },
    [stopLoop],
  );

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const next: Side | null =
      x < EDGE_ZONE_PX
        ? "left"
        : x > rect.width - EDGE_ZONE_PX
          ? "right"
          : null;
    setNear((prev) => (prev === next ? prev : next));
    // Ustunlar qo'shilganda/kengayganda `scrollWidth` o'zgaradi — arzon tekshiruv.
    measure();
  };

  const release = () => {
    clearHoverTimer();
    stopLoop();
    pressed.current = false;
    setEngaged(null);
  };

  const arrowHandlers = (side: Side) => ({
    onPointerEnter: () => {
      setEngaged(side);
      clearHoverTimer();
      hoverTimer.current = setTimeout(() => {
        if (!pressed.current) run(side, HOVER_SPEED);
      }, HOVER_DELAY_MS);
    },
    onPointerLeave: release,
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      pressed.current = true;
      longPressed.current = false;
      pressStart.current = performance.now();
      clearHoverTimer();
      // Bosib turish — qisqa kechikishdan keyin tez rejim (aks holda oddiy bosish ham sakrardi).
      hoverTimer.current = setTimeout(() => {
        if (!pressed.current) return;
        longPressed.current = true;
        run(side, PRESS_SPEED);
      }, TAP_MS);
    },
    onPointerUp: () => {
      const wasLong =
        longPressed.current || performance.now() - pressStart.current >= TAP_MS;
      pressed.current = false;
      clearHoverTimer();
      if (wasLong) {
        // Hali ustida turibdi — sekin rejimga qaytadi.
        run(side, HOVER_SPEED);
      }
    },
    onClick: () => {
      if (longPressed.current) {
        longPressed.current = false;
        return;
      }
      stopLoop();
      scrollerRef.current?.scrollBy({
        left: side === "left" ? -CLICK_STEP_PX : CLICK_STEP_PX,
        behavior: "smooth",
      });
    },
  });

  return (
    <div
      className="relative h-full min-h-0"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setNear(null)}
    >
      {children}
      {(["left", "right"] as const).map((side) => {
        const visible = can[side] && (near === side || engaged === side);
        const Icon = side === "left" ? ChevronLeft : ChevronRight;
        return (
          <button
            key={side}
            type="button"
            aria-label={side === "left" ? "Chapga surish" : "O'ngga surish"}
            title={side === "left" ? "Chapga surish" : "O'ngga surish"}
            tabIndex={can[side] ? 0 : -1}
            {...arrowHandlers(side)}
            className={cn(
              "border-line bg-surface/95 text-ink absolute top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm",
              "transition-[opacity,transform,background-color,color,border-color] duration-150 ease-out",
              "hover:border-brand hover:text-brand active:bg-brand active:text-white active:scale-95",
              "focus-visible:ring-brand/40 outline-none focus-visible:ring-[3px]",
              "pointer-coarse:hidden",
              side === "left" ? "left-2" : "right-2",
              visible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <Icon className="size-5" strokeWidth={2.4} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
