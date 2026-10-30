"use client";

import { ChevronsLeft, MessagesSquare } from "lucide-react";

import { formatSom } from "@/lib/format";

/**
 * Ustun sarlavhasi — dizayndagi to'liq rangli plashka (status belgisi rangi,
 * oq yozuv), ostida markazda summa pilli (to'lanadigan summa, butun ustun
 * bo'yicha — serverdan).
 */
export function ColumnHeader({
  label,
  count,
  totalAmount,
  mark,
  unread,
  onUnreadClick,
  fresh = 0,
  onCollapse,
}: {
  label: string;
  count: number;
  totalAmount: number | null;
  mark: string;
  /** Chatida o'qilmagan xabari bor buyurtmalar soni (xabarlar emas). */
  unread: number;
  /** Chat belgisi bosilsa — doska shu buyurtmalarga suziladi. */
  onUnreadClick?: () => void;
  /** Hali hech kim olmagan yangi buyurtmalar soni — "3 yangi". */
  fresh?: number;
  onCollapse?: () => void;
}) {
  return (
    <header className="flex flex-col gap-2.5">
      <div
        style={{ "--mark": mark } as React.CSSProperties}
        className="mark-glow flex h-10 items-center justify-between gap-2 rounded-xl bg-[var(--mark)] px-3 text-white"
      >
        <h2 className="text-micro truncate font-bold tracking-wider uppercase">{label}</h2>
        <span className="flex shrink-0 items-center gap-1.5">
          {fresh > 0 ? (
            <span
              title={`${fresh} ta buyurtmani hali hech kim olmagan`}
              className="bg-amber text-amber-ink tabular text-micro inline-flex h-5 items-center rounded-full px-1.5 font-bold"
            >
              {fresh} yangi
            </span>
          ) : null}
          {unread > 0 ? (
            <button
              type="button"
              onClick={onUnreadClick}
              title={`Chatda yangi xabari bor buyurtmalar: ${unread} — ko'rsatish`}
              aria-label={`Chatda yangi xabari bor buyurtmalar: ${unread} — ko'rsatish`}
              className="tabular text-micro inline-flex h-5 items-center gap-0.5 rounded-full bg-white px-1.5 font-bold text-danger transition-transform duration-(--dur-micro) hover:scale-105"
            >
              <MessagesSquare className="size-3" aria-hidden />
              {unread > 99 ? "99+" : unread}
            </button>
          ) : null}
          <span className="tabular text-meta font-bold">{count}</span>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Ustunni yig'ish"
              title="Ustunni yig'ish"
              className="-mr-1.5 rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <ChevronsLeft className="size-3.5" />
            </button>
          ) : null}
        </span>
      </div>
      <div className="flex justify-center">
        <span className="bg-surface-3 text-ink-muted tabular rounded-full px-3 py-1 text-meta font-semibold">
          {totalAmount !== null ? formatSom(totalAmount) : "—"}
        </span>
      </div>
    </header>
  );
}
