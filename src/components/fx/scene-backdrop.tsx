"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import type { Scene } from "@/components/fx/scenes";
import { usePerfTier } from "@/hooks/use-perf-tier";
import { cn } from "@/lib/utils";

/**
 * Fon sahnasi ("Tungi yo'l"): foto → rang tusi → to'r → scrim.
 *
 * Ota element `relative`, kontent esa shu qatlamdan KEYIN va `relative`
 * bo'lishi kerak — qatlam mutlaq joylashgan, bosishga sezgir emas va
 * skrinriderlar uchun ko'rinmaydi. Bo'lim almashganda eski foto yangisiga
 * 0.7 s da erib o'tadi (`AnimatePresence`); zaif mashinada va
 * `prefers-reduced-motion` da almashuv bir zumda.
 *
 * Foto `object-position` — sahnaning o'z fokus nuqtasi (`scenes.ts`),
 * shuning uchun inline: bu hisoblangan qiymat, dizayn soni emas.
 */
export function SceneBackdrop({
  scene,
  preload = false,
  className,
}: {
  scene: Scene;
  /** Kirish sahifasi LCP'si — foto `<head>` dan oldindan yuklanadi. */
  preload?: boolean;
  className?: string;
}) {
  const active = scene;
  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const instant = reduced === true || tier === "low";

  return (
    <div aria-hidden className={cn("scene-layer", className)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={active.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: instant ? 0 : 0.7, ease: "easeOut" }}
        >
          <Image
            src={active.src}
            alt=""
            fill
            sizes="100vw"
            preload={preload}
            className="scene-photo"
            style={{ objectPosition: active.focus }}
          />
        </motion.div>
      </AnimatePresence>
      <div className="scene-tint" />
      <div className="scene-grid" />
      <div className="scene-scrim" />
    </div>
  );
}
