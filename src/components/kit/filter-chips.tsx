"use client";

import { cn } from "@/lib/utils";

export type FilterChip<T> = {
  value: T;
  label: string;
  /** Rang tokeni; berilmasa brend rangi ishlatiladi. */
  color?: string;
  /** Nechta element borligini ko'rsatuvchi raqam. */
  count?: number;
};

/**
 * Gorizontal filtr chiplari.
 *
 * Klaviatura bilan boshqariladi (chap/o'ng strelkalar), tanlangani esa
 * `aria-pressed` orqali skrinriderga ham bildiriladi. Chekkalarda yumshoq
 * soya — hali siljitish mumkinligini bildiradi.
 */
export function FilterChips<T extends string | number | null>({
  options,
  value,
  onChange,
  label = "Holat bo'yicha filtr",
  className,
}: {
  options: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <ChipRow label={label} className={className}>
      {options.map((option, index) => (
        <Chip
          key={String(option.value)}
          option={option}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            // Bitta tanlovda strelka tanlovning o'zini suradi.
            const next = options[index + (event.key === "ArrowRight" ? 1 : -1)];
            if (next) onChange(next.value);
          }}
        />
      ))}
    </ChipRow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ChipRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-wheel-x
      className={cn(
        "scrollbar-thin fade-edges -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Chip<T extends string | number | null>({
  option,
  selected,
  onClick,
  onKeyDown,
}: {
  option: FilterChip<T>;
  selected: boolean;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const accent = option.color ?? "var(--brand)";

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{ "--accent": accent } as React.CSSProperties}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5",
        "text-dense font-medium transition-colors",
        selected
          ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]"
          : "border-line text-ink-muted hover:border-line-strong hover:text-ink bg-surface",
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors",
          selected ? "bg-[var(--accent)]" : "bg-ink-faint/50",
        )}
      />
      {option.label}
      {option.count !== undefined ? (
        <span
          className={cn(
            "tabular rounded px-1 text-fine",
            selected ? "bg-[var(--accent)]/15" : "bg-subtle",
          )}
        >
          {option.count}
        </span>
      ) : null}
    </button>
  );
}

