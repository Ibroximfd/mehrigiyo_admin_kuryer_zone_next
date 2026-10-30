"use client";

import { LoaderCircle } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { memo, useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { orderStatusInfo } from "@/features/orders/types";
import { columnHasMore } from "@/features/pipeline/board-ops";
import { LeadCard } from "@/features/pipeline/components/lead-card";
import { DELIVERED_COLUMN } from "@/features/pipeline/types";
import type { PipelineBoard, PipelineColumn, PipelineLead } from "@/features/pipeline/types";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useDragPan } from "@/hooks/use-drag-pan";
import { useScrollMemory } from "@/hooks/use-scroll-memory";
import { useNowTick } from "@/hooks/use-now-tick";
import { usePerfTier } from "@/hooks/use-perf-tier";
import { useProgressiveCount } from "@/hooks/use-progressive-count";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Shundan ko'p kartali ustunda ko'chish animatsiyasi (`layoutId`) o'chadi. */
const LAYOUT_ANIMATION_LIMIT = 120;

/**
 * Dostavka / Baza doskasi — faqat ko'rish (logist bu yerda buyurtmani
 * ko'chirmaydi: buyurtma holati `Buyurtmalar` doskasida, Baza esa
 * logistga `read_only`).
 *
 * Katta hajm: har ustun 50 tadan keladi va pastga yetganda o'zi davom
 * etadi (`useInfiniteScroll`). Ko'rinmaydigan kartalar `.cv-card`
 * (`content-visibility: auto`) bilan chizilmaydi — yuzlab karta skrollni
 * og'irlashtirmaydi.
 *
 * Harakat: karta real vaqtda ustundan ustunga o'tsa `layoutId` bilan
 * silliq ko'chadi; kelgan karta yuqoridan tushadi, ketgani so'nadi.
 * `prefers-reduced-motion` da hammasi o'chadi.
 */
export function PipelineBoardView({
  board,
  onOpenLead,
  onLoadMore,
  isLoadingColumn,
}: {
  board: PipelineBoard;
  onOpenLead: (lead: PipelineLead) => void;
  onLoadMore: (columnKey: string) => void;
  isLoadingColumn: (columnKey: string) => boolean;
}) {
  // Bitta soat butun doskaga — "ustunda 2 soat" daqiqada bir yangilanadi.
  const now = useNowTick(60_000);
  // Detal yoki boshqa bo'limdan qaytganda doska va ustunlar o'sha joyda.
  const rememberBoardScroll = useScrollMemory<HTMLDivElement>(`pipeline:${board.stage}:x`, "x");
  const dragPan = useDragPan<HTMLDivElement>();
  const setBoardRef = useCallback(
    (node: HTMLDivElement | null) => {
      rememberBoardScroll(node);
      dragPan(node);
    },
    [rememberBoardScroll, dragPan],
  );
  return (
    <LayoutGroup id={`pipeline-${board.stage}`}>
      <div
        ref={setBoardRef}
        data-wheel-x
        className="scrollbar-thin flex h-full min-h-0 gap-3 overflow-x-auto px-4 pb-4 sm:px-6"
      >
        {board.columns.map((column) => (
          <BoardColumn
            key={column.key}
            column={column}
            label={columnLabel(board.stage, column)}
            accent={columnAccent(board, column)}
            now={now}
            onOpenLead={onOpenLead}
            onLoadMore={onLoadMore}
            loading={isLoadingColumn(column.key)}
            scrollKey={`pipeline:${board.stage}:${column.key}`}
            awaitingBase={board.stage === "delivery" && column.key === DELIVERED_COLUMN}
            hint={
              board.stage === "delivery" && column.key === DELIVERED_COLUMN
                ? "Hammasi yetkazilgan — 24 soatdan keyin Bazaga o'tadi"
                : undefined
            }
          />
        ))}
      </div>
    </LayoutGroup>
  );
}

function columnAccent(board: PipelineBoard, column: PipelineColumn): string {
  if (board.stage === "delivery") return orderStatusInfo(column.key).mark;
  return column.color ?? "var(--ink-faint)";
}

function columnLabel(stage: PipelineBoard["stage"], column: PipelineColumn): string {
  // Dostavkada mahalliy yorliq — buyurtmalar doskasi bilan bir xil nom.
  if (stage === "delivery") return orderStatusInfo(column.key).label;
  return column.label;
}

/**
 * Ustun `memo`: real vaqtda bitta ustun o'zgarsa qolganlari qayta
 * chizilmaydi (doska yamog'i o'zgarmagan ustun obyektini saqlaydi).
 */
const BoardColumn = memo(function BoardColumn({
  column,
  label,
  accent,
  now,
  onOpenLead,
  onLoadMore,
  loading,
  scrollKey,
  awaitingBase = false,
  hint,
}: {
  column: PipelineColumn;
  label: string;
  accent: string;
  now: Date;
  onOpenLead: (lead: PipelineLead) => void;
  onLoadMore: (columnKey: string) => void;
  loading: boolean;
  scrollKey: string;
  /** «Yetkazildi» ustuni — kartada Bazagacha qolgan vaqt. */
  awaitingBase?: boolean;
  /** Ustun sarlavhasi ostidagi izoh. */
  hint?: string;
}) {
  const reduced = useReducedMotion();
  const rememberScroll = useScrollMemory<HTMLUListElement>(scrollKey);
  const tier = usePerfTier();
  const hasMore = columnHasMore(column);
  const loadMore = useCallback(() => onLoadMore(column.key), [onLoadMore, column.key]);
  const sentinel = useInfiniteScroll({ hasMore, isLoading: loading, onLoadMore: loadMore });
  const rendered = useProgressiveCount(column.leads.length);
  const visible = column.leads.slice(0, rendered);
  /*
   * `layoutId` har renderda hamma kartani o'lchaydi — yuzlab kartada bu
   * qimmat. Ko'chish animatsiyasi faqat o'rtacha ustunda va kuchli
   * mashinada; aks holda karta shunchaki joyida paydo bo'ladi.
   */
  const animateLayout = !reduced && tier !== "low" && column.leads.length <= LAYOUT_ANIMATION_LIMIT;

  return (
    <section
      aria-label={label}
      style={{ "--accent": accent } as React.CSSProperties}
      className="border-line bg-subtle/60 flex h-full w-72 shrink-0 flex-col rounded-xl border"
    >
      <header className="flex items-center gap-2 border-b border-[color-mix(in_oklab,var(--accent)_30%,transparent)] px-3 py-2.5">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--accent)]" />
        <h2 className="text-ink min-w-0 truncate text-dense font-semibold">
          {label}
        </h2>
        <span className="bg-surface text-ink-muted tabular ml-auto rounded-full px-2 py-0.5 text-fine font-semibold">
          {column.total}
        </span>
      </header>
      {hint ? <p className="text-ink-faint px-3 pt-2 text-fine">{hint}</p> : null}

      <ul ref={rememberScroll} className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {visible.map((lead) => (
            <motion.li
              key={lead.id}
              layout={animateLayout ? "position" : false}
              layoutId={animateLayout ? `lead-${lead.id}` : undefined}
              initial={reduced ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.26, ease: EASE_OUT }}
              className="cv-card"
            >
              <LeadCard lead={lead} now={now} onOpen={onOpenLead} awaitingBase={awaitingBase} />
            </motion.li>
          ))}
        </AnimatePresence>

        {column.leads.length === 0 ? (
          <li className="text-ink-faint px-2 py-6 text-center text-meta">Bo&apos;sh</li>
        ) : null}

        {hasMore ? (
          <li ref={sentinel as React.Ref<HTMLLIElement>} className="flex justify-center py-2">
            {loading ? (
              <LoaderCircle className="text-ink-faint size-4 animate-spin" aria-label="Yuklanmoqda" />
            ) : (
              <button
                type="button"
                onClick={loadMore}
                className="text-link text-meta font-medium hover:underline"
              >
                Yana {column.total - column.leads.length} ta
              </button>
            )}
          </li>
        ) : null}
      </ul>
    </section>
  );
});

/** Doska skeleti — ustunlar va kartalar shaklida (sakrash bo'lmasin). */
export function PipelineBoardSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className="flex h-full gap-3 overflow-hidden px-4 pb-4 sm:px-6" aria-hidden>
      {Array.from({ length: columns }).map((_, column) => (
        <div
          key={column}
          className="border-line bg-subtle/60 flex w-72 shrink-0 flex-col gap-2 rounded-xl border p-2"
        >
          <Skeleton className="h-6 w-32 rounded-md" />
          {Array.from({ length: 4 }).map((__, row) => (
            <Skeleton key={row} className={cn("h-24 rounded-xl", row > 1 && "opacity-60")} />
          ))}
        </div>
      ))}
    </div>
  );
}
