"use client";

import { useState } from "react";

import { avatarHue, avatarInitials } from "@/features/couriers/avatar";
import { cn } from "@/lib/utils";

/**
 * Suhbatdosh / a'zo rasmi: rasm bo'lmasa yoki yuklanmasa — bosh harflar
 * (`id` dan barqaror rang, kuryer markeri bilan bir xil palitra). Pastki
 * o'ng burchakda holat nuqtasi: onlayn — yashil, smenada (kuryer) — brend.
 */
export function PeerAvatar({
  id,
  fullName,
  avatarUrl,
  online = false,
  onShift = null,
  size = "md",
  className,
}: {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  online?: boolean;
  /** Faqat kuryer; `null` — noma'lum, nuqta ko'rsatilmaydi. */
  onShift?: boolean | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0",
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
    >
      <span
        data-avatar-hue={avatarHue(id)}
        className={cn(
          "avatar-fallback flex size-full items-center justify-center overflow-hidden rounded-full font-semibold",
          size === "sm" ? "text-fine" : "text-meta",
        )}
      >
        {showImage ? (
          // Media serverdagi kichik rasm — `next/image` statik eksportda optimallashtirmaydi.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden data-no-translit>
            {avatarInitials(fullName)}
          </span>
        )}
      </span>
      {online || onShift ? (
        <span
          aria-hidden
          className={cn(
            "ring-surface absolute right-0 bottom-0 size-2.5 rounded-full ring-2",
            online ? "bg-ok" : "bg-brand",
          )}
        />
      ) : null}
    </span>
  );
}
