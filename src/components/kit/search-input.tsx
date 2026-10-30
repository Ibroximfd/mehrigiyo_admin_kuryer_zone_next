"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Qidiruv maydoni.
 *
 * Qulayliklar:
 *  • `/` bosilsa fokus shu maydonga tushadi (matn kiritilayotgan bo'lmasa);
 *  • `Esc` — matnni tozalaydi va fokusni bo'shatadi;
 *  • `Enter` — `onEnter` berilgan bo'lsa, birinchi natijani ochadi;
 *  • so'rov ketayotganda o'ng tomonda kichik indikator ko'rinadi.
 */
export function SearchInput({
  value,
  onChange,
  onEnter,
  placeholder,
  isSearching = false,
  className,
  autoFocusShortcut = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder: string;
  isSearching?: boolean;
  className?: string;
  autoFocusShortcut?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocusShortcut) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;

      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (isTyping) return;

      // Yashirin nusxa (masalan desktopda mobil qidiruv) fokusni o'g'irlamasin.
      if (!inputRef.current || inputRef.current.offsetParent === null) return;
      event.preventDefault();
      inputRef.current.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [autoFocusShortcut]);

  return (
    <div className={cn("relative", className)}>
      <Search className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (value) onChange("");
            else inputRef.current?.blur();
            return;
          }

          // Qidiruv natijasini ochish uchun sichqonchaga o'tish shart emas.
          if (event.key === "Enter" && onEnter) {
            event.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "bg-subtle border-line text-ink placeholder:text-ink-faint h-10 w-full rounded-lg border",
          "pr-16 pl-9 text-body",
          // Bitta halqa: global `:focus-visible` matn maydoniga tegmaydi (globals.css).
          "hover:border-line-strong focus:border-brand focus:bg-surface focus:ring-brand/20 focus:ring-[3px] focus:outline-none",
          "transition-[border-color,box-shadow,background-color] duration-(--dur-micro)",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />

      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {isSearching ? (
          <LoaderCircle className="text-ink-faint size-3.5 animate-spin" />
        ) : null}

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            aria-label="Qidiruvni tozalash"
            className="text-ink-faint hover:text-ink hover:bg-line rounded p-1 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="border-line text-ink-faint bg-surface hidden rounded border px-1.5 py-0.5 text-fine font-medium sm:inline-block">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
