"use client";

import { CalendarRange, X } from "lucide-react";

import { formatDay } from "@/features/statistics/filter";
import { cn } from "@/lib/utils";

/**
 * Sana oralig'i — bitta yaxlit boshqaruv.
 *
 * ── Nima uchun bu komponent bor ──────────────────────────────────────────
 * Ilgari filtr qatorida ikkita YALANG'OCH `<input type="date">` turardi.
 * Brauzerning o'z boshqaruvi bo'lgani uchun ular loyihaning qolgan
 * qismidan butunlay ajralib turardi: `dd/mm/yyyy` kulrang shabloni, o'ng
 * chekkadagi tizim kalendar ikonkasi, boshqa balandlik va boshqa burchak
 * radiusi. Yonida esa silliq pill-chiplar — natijada qator "yarim tayyor"
 * ko'rinardi.
 *
 * Bu yerda native `<input>` SAQLANADI (kalendar, klaviatura, skrinrider,
 * mobil g'ildirak — hammasi brauzerdan), lekin u bitta pill konteyner
 * ichiga olinadi va o'z fonini, chegarasini va tizim ikonkasini yo'qotadi.
 * Ya'ni ko'rinish bizniki, xatti-harakat brauzerniki — yangi sana tanlash
 * mantig'i yozilmaydi, demak buziladigan narsa ham yo'q.
 */
export function DateRangeField({
  from,
  to,
  onChange,
  onClear,
  className,
}: {
  /** `YYYY-MM-DD` yoki bo'sh satr. */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** Berilsa, oraliq to'lganda tozalash tugmasi chiqadi. */
  onClear?: () => void;
  className?: string;
}) {
  const active = Boolean(from || to);

  return (
    <div
      data-focus-ring="host"
      className={cn(
        "border-border-control/60 bg-surface group flex h-(--control-h) shrink-0 items-center gap-1 rounded-full border pr-1 pl-3",
        "transition-[border-color,box-shadow] duration-(--dur-micro) ease-out",
        "hover:border-border-control",
        // Ichkaridagi maydonlardan biri fokusda bo'lsa butun pill yonadi —
        // fokus halqasi alohida input atrofida emas, boshqaruv atrofida.
        "focus-within:border-brand focus-within:ring-brand/20 focus-within:ring-[3px]",
        active && "border-brand/45 bg-brand-soft",
        className,
      )}
    >
      <CalendarRange
        aria-hidden
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-brand" : "text-ink-faint",
        )}
      />

      <DateInput
        value={from}
        max={to || undefined}
        onChange={(value) => onChange(value, to)}
        label="Boshlanish sanasi"
        placeholder="boshlanish"
      />

      <span aria-hidden className="text-ink-faint shrink-0 text-meta">
        —
      </span>

      <DateInput
        value={to}
        min={from || undefined}
        onChange={(value) => onChange(from, value)}
        label="Tugash sanasi"
        placeholder="tugash"
      />

      {active && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Sanani tozalash"
          title="Sanani tozalash"
          className="text-ink-faint hover:text-ink hover:bg-surface-3 ml-0.5 shrink-0 rounded-full p-1 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        // Tozalash tugmasi yo'q paytda ham o'ng chekka bo'shligi saqlanadi —
        // sana tanlanganda boshqaruv kengligi sakramaydi.
        <span aria-hidden className="w-1.5 shrink-0" />
      )}
    </div>
  );
}

/**
 * Konteyner ichidagi bitta sana maydoni.
 *
 * Qiymat bo'lmaganda native `dd/mm/yyyy` shabloni o'rniga o'zimizning
 * kichik yozuvimiz turadi: `opacity-0` bilan input ustiga qo'yiladi, ya'ni
 * bosilganda baribir native kalendar ochiladi.
 */
function DateInput({
  value,
  min,
  max,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <span className="relative flex shrink-0 items-center">
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={cn(
          "tabular text-ink w-[6.5rem] bg-transparent text-meta outline-none",
          // Tizim kalendar ikonkasi olib tashlanadi — bizda o'z ikonkamiz bor
          // va ikkitasi yonma-yon turishi shovqin edi.
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:inset-0",
          "[&::-webkit-calendar-picker-indicator]:m-0",
          "[&::-webkit-calendar-picker-indicator]:h-full",
          "[&::-webkit-calendar-picker-indicator]:w-full",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-0",
          // Bo'sh maydonning native matni yashiriladi — o'rniga o'z yozuvimiz.
          !value && "text-transparent",
        )}
      />
      {!value ? (
        <span
          aria-hidden
          className="text-ink-faint pointer-events-none absolute left-0 text-meta"
        >
          {placeholder}
        </span>
      ) : null}
    </span>
  );
}

/** Sarlavhada ko'rinadigan qisqa matn: `10.08 — 20.08`. */
export function describeRange(from: string, to: string): string {
  if (from && to) return `${formatDay(from)} — ${formatDay(to)}`;
  if (from) return `${formatDay(from)} dan`;
  if (to) return `${formatDay(to)} gacha`;
  return "";
}
