"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const PLACEHOLDER = "# raqam, telefon, ism";

/**
 * Tepa paneldagi buyurtma qidiruvi.
 *
 * Bitta fokus halqasi — qutining o'zida (`data-focus-ring="host"`), ichki
 * maydon o'zinikini chizmaydi (globals.css). Ilgari global `:focus-visible`
 * maydonning o'ziga ham halqa qo'yardi va quti ichida ikkinchi ramka
 * paydo bo'lardi.
 *
 *  • `/` — fokusni shu yerga olib keladi (matn yozilmayotgan bo'lsa);
 *  • `Esc` — matnni tozalaydi, bo'sh bo'lsa fokusni bo'shatadi;
 *  • `Enter` — `onSubmit` (boshqa sahifalarda buyurtmalarga o'tish);
 *  • ✕ — bir bosishda tozalash, fokus maydonda qoladi.
 */
export function TopBarSearch({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const input = inputRef.current;
      // Yashirin (mobil) nusxa fokusni o'g'irlamasin.
      if (!input || input.offsetParent === null) return;
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      data-focus-ring="host"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value.trim());
      }}
      className={cn(
        "group bg-surface border-border-control/60 text-ink-faint flex h-9 w-64 shrink-0 items-center gap-2 rounded-lg border pr-1.5 pl-3 lg:w-80",
        "transition-[border-color,box-shadow] duration-(--dur-micro) ease-out",
        "hover:border-border-control",
        "focus-within:border-brand focus-within:ring-brand/20 focus-within:text-brand focus-within:ring-[3px]",
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          if (value) onChange("");
          else inputRef.current?.blur();
        }}
        placeholder={PLACEHOLDER}
        aria-label="Buyurtma qidirish"
        autoComplete="off"
        spellCheck={false}
        className="text-ink placeholder:text-ink-faint h-full min-w-0 flex-1 bg-transparent text-body outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Qidiruvni tozalash"
          title="Qidiruvni tozalash"
          className="text-ink-faint hover:text-ink hover:bg-subtle flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-(--dur-micro)"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd
          aria-hidden
          className="border-line text-ink-faint bg-subtle flex h-5 min-w-5 shrink-0 items-center justify-center rounded border px-1 text-fine font-semibold group-focus-within:hidden"
        >
          /
        </kbd>
      )}
    </form>
  );
}
