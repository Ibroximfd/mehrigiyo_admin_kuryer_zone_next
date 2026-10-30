"use client";

import { ChevronDown, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchableText } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
  /** Yonidagi nuqta rangi (status, teg va h.k.); berilmasa nuqta chiqmaydi. */
  color?: string;
  /** O'ng chetda kulrang son (masalan, hududdagi buyurtmalar); berilmasa chiqmaydi. */
  count?: number;
};

/**
 * Bitta ochiluvchi ro'yxat ichidagi mustaqil bo'lim — masalan "To'lov"
 * pillida "Holati" va "Turi". Har bo'lim o'z tanlovini o'zi boshqaradi.
 */
export type FilterSection = {
  key: string;
  heading?: string;
  options: FilterOption[];
  selected: string[];
  onSelect: (value: string) => void;
};

/**
 * Filtr pilli + ochiluvchi ro'yxat.
 *
 * ── Nima uchun chiplar o'rniga ───────────────────────────────────────────
 * Buyurtmalar sahifasida yettita filtr guruhi bor edi va har biri o'z chip
 * qatorini egallardi — sarlavha besh qatorga cho'zilib, doska ekranning
 * yarmini yo'qotardi. Bu yerda har guruh bitta pill: yopiq holda faqat nomi
 * ("Kuryer"), tanlov bo'lsa nomi va qiymati ("Kuryer · Alisher") hamda
 * shu yerning o'zida bekor qilish tugmasi. Yetti guruh bir qatorga sig'adi.
 *
 * ── Tuzilish ─────────────────────────────────────────────────────────────
 * Pill ikkita tugmadan iborat: ochuvchi (Radix Popover trigger) va, tanlov
 * bo'lsa, ✕ — ular alohida, chunki tugma ichida tugma yaroqsiz HTML va
 * skrinrider uchun ham chalkash. Ro'yxat `cmdk` ustida: strelka bilan
 * yurish, Enter bilan tanlash, uzun ro'yxatda (kuryerlar) qidiruv.
 *
 * Bir bo'limli qisqa shakl (`options`/`selected`/`onSelect`) yoki ko'p
 * bo'limli (`sections`) — ikkalasi ham bitta komponent.
 */
export function FilterDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onSelect,
  sections,
  valueLabel,
  onClear,
  searchable = false,
  searchPlaceholder = "Qidirish...",
  closeOnSelect = true,
  footer,
  contentClassName,
  className,
}: {
  /** Pill nomi — "Kuryer", "Davr". */
  label: string;
  icon?: LucideIcon;
  /** Bir bo'limli qisqa shakl. */
  options?: FilterOption[];
  selected?: string[];
  onSelect?: (value: string) => void;
  /** Ko'p bo'limli shakl; berilsa qisqa shakl e'tiborsiz qoladi. */
  sections?: FilterSection[];
  /**
   * Pillda ko'rinadigan qiymat. Berilmasa tanlanganlarning nomidan
   * yig'iladi: bitta — nomi, bir nechta — "Birinchisi +2". `null` —
   * filtr yo'q, pill xira turadi.
   */
  valueLabel?: string | null;
  /** Berilsa pillda ✕ va ro'yxat tagida "Tozalash" chiqadi. */
  onClear?: () => void;
  /** Ro'yxat tepasida qidiruv maydoni (uzun ro'yxatlar uchun). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Tanlangach yopilsinmi — ko'p tanlovda `false` qulay. */
  closeOnSelect?: boolean;
  /** Ro'yxat ostidagi ixtiyoriy qism (masalan sana oralig'i). */
  footer?: React.ReactNode;
  contentClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);

  const resolvedSections: FilterSection[] = sections ?? [
    {
      key: "default",
      options: options ?? [],
      selected: selected ?? [],
      onSelect: onSelect ?? (() => {}),
    },
  ];

  const resolvedValue =
    valueLabel !== undefined ? valueLabel : summarize(resolvedSections);
  const active = resolvedValue !== null && resolvedValue !== "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        data-focus-ring="host"
        className={cn(
          "group/pill flex h-(--control-h) shrink-0 items-stretch rounded-full border",
          "transition-[border-color,background-color,color] duration-(--dur-micro) ease-out",
          "has-[:focus-visible]:border-brand has-[:focus-visible]:ring-brand/25 has-[:focus-visible]:ring-[3px]",
          active
            ? "border-brand bg-brand-soft text-brand font-semibold shadow-[0_0_0_1px_var(--brand)]"
            : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink has-[[aria-expanded=true]]:border-line-strong has-[[aria-expanded=true]]:text-ink",
          className,
        )}
      >
        <PopoverTrigger
          aria-label={active ? `${label}: ${resolvedValue}` : label}
          // Uzun qiymat pillda kesiladi (sana oralig'i, uzun ism) — to'lig'i
          // sichqoncha ustida turganda ko'rinadi.
          title={active ? `${label}: ${resolvedValue}` : label}
          className={cn(
            "flex min-w-0 items-center gap-1.5 rounded-full pl-3 text-dense font-medium whitespace-nowrap outline-none select-none",
            active && onClear ? "pr-1" : "pr-2.5",
          )}
        >
          {Icon ? (
            <Icon
              aria-hidden
              className={cn(
                "size-3.5 shrink-0",
                active ? "text-brand" : "text-ink-faint",
              )}
            />
          ) : null}
          <span className={cn(active && "text-brand/70")}>{label}</span>
          {active ? (
            <>
              <span aria-hidden className="text-brand/40">
                ·
              </span>
              <span className="max-w-36 truncate">{resolvedValue}</span>
            </>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 opacity-60 transition-transform duration-(--dur-micro)",
              open && "rotate-180",
            )}
          />
        </PopoverTrigger>

        {active && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={`${label} filtrini olib tashlash`}
            title="Filtrni olib tashlash"
            className="text-brand/60 hover:text-brand hover:bg-brand/10 my-1 mr-1 flex items-center rounded-full px-1 outline-none transition-colors"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => {
          // Qidiruvsiz ro'yxatda fokus `cmdk` ildiziga tushadi — shunda
          // strelkalar darhol ishlaydi. Qidiruvli ro'yxatda Radix o'zi
          // birinchi maydonga (inputga) fokus beradi.
          if (searchable) return;
          event.preventDefault();
          commandRef.current?.focus();
        }}
        className={cn("w-56 gap-0 overflow-hidden p-0", contentClassName)}
      >
        <Command ref={commandRef} loop>
          {searchable ? <CommandInput placeholder={searchPlaceholder} /> : null}

          <CommandList>
            <CommandEmpty className="text-ink-faint py-4 text-meta">
              Topilmadi
            </CommandEmpty>

            {resolvedSections.map((section, index) => (
              <Fragment key={section.key}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={section.heading}>
                  {section.options.map((option) => {
                    const checked = section.selected.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        // Qiymat `cmdk` uchun noyob kalit; qidiruv esa
                        // ko'rinadigan nom bo'yicha.
                        value={`${section.key}:${option.value}`}
                        // Uchala til shakli: rus/kirill yozilgan qidiruv ham topsin.
                        keywords={[searchableText(option.label)]}
                        data-checked={checked}
                        onSelect={() => {
                          section.onSelect(option.value);
                          if (closeOnSelect) setOpen(false);
                        }}
                        className={cn(
                          "text-dense",
                          checked && "text-ink font-medium",
                        )}
                      >
                        {option.color ? (
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: option.color }}
                          />
                        ) : null}
                        <span className="truncate">{option.label}</span>
                        {option.count !== undefined ? (
                          <span className="text-ink-faint tabular ml-auto pl-2 text-fine">
                            {option.count}
                          </span>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Fragment>
            ))}
          </CommandList>
        </Command>

        {footer}

        {active && onClear ? (
          <div className="border-line border-t p-1">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="text-ink-muted hover:bg-subtle hover:text-ink flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-dense transition-colors outline-none focus-visible:bg-subtle"
            >
              <X className="size-3.5" />
              Tozalash
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Tanlanganlardan pill yozuvi: "Naqd", "Kutilmoqda +2", "To'lanmagan · Naqd". */
function summarize(sections: FilterSection[]): string | null {
  const parts = sections
    .map((section) => {
      const picked = section.options.filter((option) =>
        section.selected.includes(option.value),
      );
      if (picked.length === 0) return null;
      return picked.length === 1
        ? picked[0].label
        : `${picked[0].label} +${picked.length - 1}`;
    })
    .filter((part): part is string => part !== null);
  return parts.length ? parts.join(" · ") : null;
}
