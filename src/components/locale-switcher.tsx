"use client";

import { Check, Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, localeInfo, type Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Til tanlagichi: Русский · Ўзбекча · O'zbekcha.
 *
 * Til nomlari `data-no-translit` ichida — har biri o'z yozuvida qoladi,
 * aks holda rus tilida "O'zbekcha" ham tarjima qilinib ketardi.
 *
 *   segmented — uchta tugma (login sahifasi, foydalanuvchi menyusi);
 *   menu      — tepa paneldagi ixcham tugma + ochiladigan ro'yxat.
 */
export function LocaleSwitcher({
  variant = "segmented",
  className,
}: {
  variant?: "segmented" | "menu";
  className?: string;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  if (variant === "menu") {
    return (
      <LocaleMenu locale={locale} onChange={setLocale} className={className} />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Til"
      className={cn(
        "bg-subtle border-line inline-flex items-center gap-0.5 rounded-lg border p-0.5",
        className,
      )}
    >
      {LOCALES.map((option) => {
        const active = option.value === locale;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            lang={option.htmlLang}
            onClick={() => setLocale(option.value)}
            className={cn(
              "rounded-md px-2 py-1 text-meta font-semibold transition-colors",
              active
                ? "bg-surface text-ink shadow-card"
                : "text-ink-faint hover:text-ink",
            )}
          >
            <span data-no-translit title={option.label}>
              {option.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LocaleMenu({
  locale,
  onChange,
  className,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
}) {
  const current = localeInfo(locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tilni tanlash"
        className={cn(
          "text-ink-muted hover:text-ink hover:bg-subtle flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-meta font-semibold transition-colors",
          "focus-visible:ring-brand/30 focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
      >
        <Languages className="size-4" aria-hidden />
        <span data-no-translit>{current.short}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {LOCALES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            lang={option.htmlLang}
            onSelect={() => onChange(option.value)}
          >
            <span data-no-translit className="flex-1">
              {option.label}
            </span>
            {option.value === locale ? (
              <Check className="text-brand size-4" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
