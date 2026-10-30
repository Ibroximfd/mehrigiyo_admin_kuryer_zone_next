import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Rangli holat nishonchasi.
 *
 * Rang ish vaqtida tanlangani uchun Tailwind klassi bilan ifodalab bo'lmaydi
 * (klasslar build paytida yaratiladi). Shuning uchun rang inline CSS
 * o'zgaruvchisi — `--accent` — sifatida beriladi, klasslar esa o'shanga
 * murojaat qiladi. Natijada nishoncha yorug' va qorong'i rejimda ham to'g'ri
 * ko'rinadi, chunki rangning o'zi ham token.
 */
export function StatusPill({
  label,
  color,
  Icon,
  size = "md",
  className,
}: {
  label: string;
  color: string;
  Icon?: LucideIcon;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      style={{ "--accent": color } as React.CSSProperties}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        "border border-[color-mix(in_oklab,var(--accent)_28%,transparent)]",
        "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]",
        "text-[var(--accent)]",
        size === "sm" ? "px-2 py-0.5 text-fine" : "px-2.5 py-1 text-meta",
        className,
      )}
    >
      {Icon ? (
        <Icon className={cn("shrink-0", size === "sm" ? "size-3" : "size-3.5")} />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
