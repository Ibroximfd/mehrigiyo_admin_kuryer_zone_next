"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { searchLiveCouriers, soleMatch } from "@/features/couriers/live-search";
import { formatAgo, freshness } from "@/features/couriers/live-tracking";
import type { LiveCourier } from "@/features/couriers/live-tracking";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

const FRESHNESS_DOT = {
  fresh: "bg-ok",
  aging: "bg-warn",
  lost: "bg-ink-faint",
} as const;

/**
 * Xarita ustidagi qidiruv: ism · telefon · zona · buyurtma raqami.
 * Natijalar pastda ro'yxat (combobox): ↑/↓ + Enter, Esc — tozalaydi va
 * fokusni yechadi. Yagona natija yozish davomida o'zi fokuslanadi.
 */
export function LiveMapSearch({
  couriers,
  now,
  focusedId,
  onFocus,
  className,
}: {
  couriers: readonly LiveCourier[];
  now: Date;
  focusedId: number | null;
  /** `null` — fokusni yechish (butun ko'rinish). */
  onFocus: (id: number | null) => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(value, 150);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const hits = searchLiveCouriers(couriers, debounced);
  const visible = hits?.slice(0, 8) ?? [];

  // Yagona aniq natija — darhol fokus; so'rov tozalansa — butun ko'rinish.
  const sole = soleMatch(hits);
  const soleId = sole?.id ?? null;
  const hasQuery = debounced.trim().length > 0;
  useEffect(() => {
    if (soleId !== null) onFocus(soleId);
    else if (!hasQuery && focusedId !== null) onFocus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat natija o'zgarganda
  }, [soleId, hasQuery]);

  const choose = (courier: LiveCourier) => {
    onFocus(courier.id);
    setValue(courier.fullName);
    setOpen(false);
  };

  const clear = () => {
    setValue("");
    setOpen(false);
    onFocus(null);
  };

  const showList = open && hasQuery;

  return (
    <div className={cn("relative", className)}>
      <Search className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && visible[active] ? `${listId}-${visible[active].courier.id}` : undefined}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (value) clear();
            else inputRef.current?.blur();
          } else if (event.key === "ArrowDown" && visible.length) {
            event.preventDefault();
            setOpen(true);
            setActive((index) => (index + 1) % visible.length);
          } else if (event.key === "ArrowUp" && visible.length) {
            event.preventDefault();
            setActive((index) => (index - 1 + visible.length) % visible.length);
          } else if (event.key === "Enter") {
            const hit = visible[active];
            if (hit) {
              event.preventDefault();
              choose(hit.courier);
            }
          }
        }}
        placeholder="Kuryerni qidirish — ism, telefon, buyurtma raqami"
        aria-label="Kuryerni qidirish — ism, telefon, buyurtma raqami"
        className={cn(
          "bg-surface/95 border-line text-ink placeholder:text-ink-faint elev-1 h-10 w-full rounded-lg border",
          "pr-9 pl-9 text-dense",
          "hover:border-line-strong focus:border-brand focus:ring-brand/20 focus:ring-[3px] focus:outline-none",
          "transition-[border-color,box-shadow] duration-(--dur-micro)",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clear}
          aria-label="Qidiruvni tozalash"
          className="text-ink-faint hover:text-ink hover:bg-line absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Topilgan kuryerlar"
          className="border-line bg-elevated elev-3 absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border p-1"
        >
          {visible.length === 0 ? (
            <li className="text-ink-muted px-2.5 py-2 text-meta">Hech kim topilmadi</li>
          ) : (
            visible.map((hit, index) => {
              const point = hit.courier.lastLocation;
              const fresh = freshness(point?.at ?? null, now);
              return (
                <li
                  key={hit.courier.id}
                  id={`${listId}-${hit.courier.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(hit.courier)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5",
                    index === active ? "bg-subtle" : "hover:bg-subtle",
                  )}
                >
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", FRESHNESS_DOT[fresh])} />
                  <span className="text-ink min-w-0 flex-1 truncate text-dense font-medium" data-no-translit>
                    {hit.courier.fullName}
                  </span>
                  <span className="text-ink-faint shrink-0 text-fine">
                    {point?.at ? formatAgo(point.at, now) : "aloqa yo'q"}
                  </span>
                  {hit.courier.currentOrder?.orderNumber ? (
                    <span className="text-ink-muted tabular shrink-0 text-fine">
                      #{hit.courier.currentOrder.orderNumber}
                    </span>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
