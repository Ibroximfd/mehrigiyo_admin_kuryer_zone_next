"use client";

import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";

import { usePerfTier } from "@/hooks/use-perf-tier";
import { cn } from "@/lib/utils";

/**
 * Umumiy animatsiya qoliplari.
 *
 * Bir necha qoida:
 *  • harakat qisqa (150–320ms) va bir tomonlama — interfeys "sekinlashmaydi";
 *  • masofa kichik (4–12px) — sakrash emas, siljish;
 *  • `prefers-reduced-motion` yoqilgan bo'lsa animatsiya butunlay o'chadi.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

/** Ro'yxat elementlarini ketma-ket chiqarish uchun ota konteyner. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

/**
 * Sahifa kontenti — marshrut o'zgarganda yumshoq kirish.
 * `key` sifatida marshrutni bersangiz, har o'tishda qaytadan o'ynaydi.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Ro'yxatni ketma-ket ochib beruvchi o'ram. */
export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** `StaggerList` ichidagi bitta element. */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Raqamni joriy qiymatdan yangisiga silliq "sanab" o'tkazadi.
 * Statistika kartochkalarida ma'lumot yangilanganini ko'rsatadi.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className={cn("tabular", className)}>{format(value)}</span>;
  }

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      className={cn("tabular inline-block", className)}
    >
      {format(value)}
    </motion.span>
  );
}

/**
 * Bosiladigan sirt — hover'da yengil ko'tariladi, bosilganda cho'kadi.
 *
 * Faqat `transform` ustida ishlaydi (kompozitor qatlami), shuning uchun
 * layout qayta hisoblanmaydi. Prujina qattiq va tez: interfeys "o'ynoqi"
 * emas, javobgar his qilishi kerak — kun bo'yi shu ekranda ishlanadi.
 *
 * `prefers-reduced-motion` yoqilgan bo'lsa oddiy `div` qaytadi.
 */
export function Pressable({
  children,
  className,
  /** Ko'tarilish balandligi, px. */
  lift = 2,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      whileHover={{ y: -lift }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Sirpanuvchi faol indikator (rail, tepa panel) uchun o'tish: qattiq va tez
 * prujina — interfeys "o'ynoqi" emas, javobgar his qilsin. Zaif mashinada va
 * `prefers-reduced-motion` da indikator sakrab o'tadi (davomiylik 0).
 */
const INDICATOR_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};
const INSTANT: Transition = { duration: 0 };

export function useIndicatorTransition(): Transition {
  const reduced = useReducedMotion();
  const tier = usePerfTier();
  return reduced || tier === "low" ? INSTANT : INDICATOR_SPRING;
}

export { motion };
