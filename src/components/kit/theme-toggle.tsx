"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useIsClient } from "@/hooks/use-is-client";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Yorug'", Icon: Sun },
  { value: "dark", label: "Qorong'i", Icon: Moon },
  { value: "system", label: "Tizim", Icon: Monitor },
] as const;

/**
 * Mavzu almashtirgichi — uchta holatli segment.
 *
 * "Tizim" varianti operatorning OS sozlamasiga ergashadi. Server'da render
 * paytida joriy mavzu noma'lum bo'lgani uchun komponent faqat brauzerda
 * ko'rinadi (aks holda hydration mos kelmaydi).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return <div className={cn("h-8 w-[102px]", className)} aria-hidden />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Mavzu"
      className={cn(
        "bg-subtle border-line inline-flex items-center gap-0.5 rounded-lg border p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              active
                ? "bg-surface text-ink shadow-card"
                : "text-ink-faint hover:text-ink",
            )}
          >
            <option.Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
