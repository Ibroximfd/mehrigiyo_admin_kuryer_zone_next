"use client";

import { useState } from "react";

import { avatarHue, avatarInitials } from "@/features/couriers/avatar";
import type { CourierAvatar as CourierAvatarData } from "@/features/couriers/avatar";
import type { MarkerTone } from "@/features/couriers/live-tracking";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-8 text-fine",
  md: "size-10 text-dense",
} as const;

/** Halqa rangi — xarita markeri bilan bir xil ma'no. */
const RING = {
  fresh: "ring-ok",
  aging: "ring-warn",
  lost: "ring-ink-faint",
  alert: "ring-danger",
} as const satisfies Record<MarkerTone, string>;

/**
 * Kuryer rasmi: bor bo'lsa — rasm, yo'q yoki yuklanmasa — bosh harflar
 * `id` dan barqaror rangda (markerdagi bilan bir xil). Buzuq rasm hech
 * qachon ko'rinmaydi: `onError` da bosh harflarga qaytadi.
 */
export function CourierAvatar({
  courier,
  size = "md",
  tone,
  className,
}: {
  courier: { id: number; fullName: string; avatar: CourierAvatarData | null };
  size?: keyof typeof SIZE;
  /** Berilsa — yangilik rangidagi halqa. */
  tone?: MarkerTone;
  className?: string;
}) {
  const src = (size === "sm" ? courier.avatar?.thumbUrl : courier.avatar?.url) ?? null;
  // Xato bo'lgan manzil eslab qolinadi — rasm almashsa (WS) yangisi yana sinaladi.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && src !== failedSrc;

  return (
    <span
      data-avatar-hue={avatarHue(courier.id)}
      className={cn(
        "avatar-fallback relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        SIZE[size],
        tone && "ring-offset-surface ring-2 ring-offset-1",
        tone && RING[tone],
        className,
      )}
    >
      <span aria-hidden>{avatarInitials(courier.fullName)}</span>
      {showImage ? (
        // `next/image` emas: media boshqa hostda, o'lcham kichik va oldindan siqilgan (§8.1).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}
