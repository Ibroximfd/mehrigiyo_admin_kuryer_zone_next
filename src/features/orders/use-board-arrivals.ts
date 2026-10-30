"use client";

import { useCallback, useEffect, useState } from "react";

import { detectArrivals, snapshotBoard, unseenInColumn } from "./arrivals";
import type { Arrival, BoardSnapshot } from "./arrivals";
import type { OrderBoardColumn } from "./board";
import type { LogistOrder } from "./types";

/** Kartaning kirish animatsiyasi shuncha davom etadi (CSS `card-arrive` bilan mos). */
const ARRIVAL_MS = 4_000;
/** Ustunning "yonishi" — qisqaroq: ko'z tushsin, chalg'itmasin. */
const HIGHLIGHT_MS = 1_800;

type Tracked = {
  columns: readonly OrderBoardColumn<LogistOrder>[];
  key: string;
  /** `null` — taqqoslash uchun ishonchli oldingi holat yo'q. */
  snapshot: BoardSnapshot | null;
};

export type BoardArrivals = {
  /** Karta hozirgina kelgan — kirish animatsiyasi. */
  isArriving: (orderId: string) => boolean;
  /** Ustunga hozirgina karta tushdi — bir zum yonadi. */
  isHighlighted: (status: string) => boolean;
  /** Logist ustunni pastga surgan paytda kelgan, hali ko'rmagan kartalar. */
  unseenCount: (column: OrderBoardColumn<LogistOrder>) => number;
  /** Ustun tepasi ko'rindi — tabletka o'chadi. */
  clearUnseen: (status: string) => void;
};

function addAll<T>(set: ReadonlySet<T>, values: Iterable<T>): Set<T> {
  const next = new Set(set);
  for (const value of values) next.add(value);
  return next;
}

/**
 * Doskadagi "hozirgina kelgan" kartalar (qoidalar — `arrivals.ts`).
 *
 * Taqqoslash render paytida qilinadi (oldingi qiymatni holatda saqlash
 * naqshi) — effektdagi `setState` bir kadr kech qolib, karta avval
 * animatsiyasiz chizilib, keyin "sakrab" kirardi.
 */
export function useBoardArrivals({
  columns,
  filtersKey,
  ready,
  isFresh,
}: {
  columns: readonly OrderBoardColumn<LogistOrder>[];
  filtersKey: string;
  /** Haqiqiy (placeholder emas) ma'lumot bor. */
  ready: boolean;
  isFresh: (order: LogistOrder) => boolean;
}): BoardArrivals {
  const [tracked, setTracked] = useState<Tracked>(() => ({
    columns,
    key: filtersKey,
    snapshot: ready ? snapshotBoard(columns) : null,
  }));
  const [recent, setRecent] = useState<ReadonlySet<string>>(() => new Set());
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(() => new Set());
  const [unseen, setUnseen] = useState<ReadonlySet<string>>(() => new Set());

  if (tracked.columns !== columns || tracked.key !== filtersKey) {
    const comparable = ready && tracked.key === filtersKey ? tracked.snapshot : null;
    const arrivals: Arrival[] = detectArrivals(comparable, columns, isFresh);
    setTracked({ columns, key: filtersKey, snapshot: ready ? snapshotBoard(columns) : null });
    if (tracked.key !== filtersKey) setUnseen(new Set());
    if (arrivals.length > 0) {
      setRecent(addAll(recent, arrivals.map((arrival) => arrival.id)));
      setHighlighted(addAll(highlighted, arrivals.map((arrival) => arrival.status)));
      setUnseen(addAll(unseen, arrivals.map((arrival) => arrival.id)));
    }
  }

  useEffect(() => {
    if (recent.size === 0) return;
    const timer = setTimeout(() => setRecent(new Set()), ARRIVAL_MS);
    return () => clearTimeout(timer);
  }, [recent]);

  useEffect(() => {
    if (highlighted.size === 0) return;
    const timer = setTimeout(() => setHighlighted(new Set()), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const isArriving = useCallback((orderId: string) => recent.has(orderId), [recent]);
  const isHighlighted = useCallback((status: string) => highlighted.has(status), [highlighted]);
  const unseenCount = useCallback(
    (column: OrderBoardColumn<LogistOrder>) => unseenInColumn(unseen, column),
    [unseen],
  );
  const clearUnseen = useCallback(
    (status: string) => {
      const inColumn = columns.find((column) => column.status === status)?.orders ?? [];
      if (!inColumn.some((order) => unseen.has(order.id))) return;
      setUnseen((current) => {
        const next = new Set(current);
        for (const order of inColumn) next.delete(order.id);
        return next;
      });
    },
    [columns, unseen],
  );

  return { isArriving, isHighlighted, unseenCount, clearUnseen };
}
