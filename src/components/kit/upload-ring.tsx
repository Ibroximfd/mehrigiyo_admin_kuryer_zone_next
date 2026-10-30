"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Yuklash halqasi — Telegram'dagi kabi: fayl yuborilayotganda pufak ustida
 * aylana to'lib boradi, o'rtasida esa bekor qilish belgisi turadi.
 *
 * `progress` — 0..1. `null` bo'lsa (baytlar hali ketmagan yoki hammasi
 * ketib, server javobi kutilmoqda) halqa noaniq rejimda aylanadi — bu
 * "hali tugamadi" degani, "0%" emas.
 *
 * Rang ota elementdan (`currentColor`): rasm ustida oq, fayl qatorida
 * matn rangi.
 */
export function UploadRing({
  progress,
  onCancel,
  size = 44,
  className,
}: {
  progress: number | null;
  /** Berilmasa halqa faqat ko'rsatkich — bosib bo'lmaydi. */
  onCancel?: () => void;
  size?: number;
  className?: string;
}) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const determinate = progress !== null;
  const clamped = determinate ? Math.min(1, Math.max(0, progress)) : 0;
  const offset = determinate
    ? circumference * (1 - clamped)
    : circumference * 0.72;

  const label = determinate
    ? `Yuklanmoqda — ${Math.round(clamped * 100)}%`
    : "Yuborilmoqda";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(clamped * 100) : undefined}
      title={label}
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className={cn(!determinate && "animate-spin")}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>

      {onCancel ? (
        <button
          type="button"
          aria-label="Yuborishni bekor qilish"
          title="Yuborishni bekor qilish"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }}
          className="absolute inset-0 flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
