"use client";

import {
  DndContext,
  DragOverlay,
  defaultDropAnimationSideEffects,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { useDragPan } from "@/hooks/use-drag-pan";
import { useScrollMemory } from "@/hooks/use-scroll-memory";

import { BoardEdgeScroll } from "./board-edge-scroll";

export type ItemId = string | number;
export type ColumnId = string | number;

/** Doska elementdan faqat `id` ni biladi — qolgani chizuvchining ishi. */
export type BoardItem = { id: ItemId };
export type BoardColumn = { id: ColumnId };

/** Kartochka qaysi holatda chizilayotgani. */
export type CardState = {
  /** Ayni shu kartochka sudralyapti. */
  dragging: boolean;
  /** Kursor ostidagi nusxa (`DragOverlay`), asl joyidagisi emas. */
  overlay: boolean;
};

const IDLE: CardState = { dragging: false, overlay: false };
const DRAGGING: CardState = { dragging: true, overlay: false };
const OVERLAY: CardState = { dragging: true, overlay: true };

/** Ustun tanasining skroll holati — tepaga chiqadigan bildirgich uchun. */
export type ColumnScrollState = {
  /** Ustun tepasi ko'rinmayapti (logist pastga surgan). */
  scrolledDown: boolean;
  scrollToTop: () => void;
};

/** Shundan pastga surilgan ustun "surilgan" hisoblanadi (tasodifiy 1–2 px emas). */
const SCROLLED_DOWN_PX = 48;

/**
 * Sudraladigan ustunli doska — leadlar (sdelka) va buyurtmalar uchun umumiy.
 *
 * Ustunlar statuslardan quriladi, kartochkalar `getColumnId` bo'yicha
 * guruhlanadi. Kartochka boshqa ustunga tashlanganda `onMove` (o'rni bilan),
 * o'sha ustun ichida joyi o'zgarsa `onReorder` chaqiriladi; chaqiruvchi
 * optimistik yangilashni o'zi bajaradi.
 *
 * Sudrash paytida `previewGroups` ishlaydi: kartochka boshqa ustun ustiga
 * olib borilishi bilan o'sha ustunga vaqtincha ko'chiriladi — qolgan
 * kartochkalar silliq surilib joy ochadi, operator kartochka qayerga
 * tushishini oldindan ko'radi. Tashlangach preview tozalanadi va haqiqiy
 * holat optimistik yangilashdan keladi.
 */
export function DragBoard<
  TItem extends BoardItem,
  TColumn extends BoardColumn,
>({
  columns,
  items,
  getColumnId,
  onMove,
  onReorder,
  renderCard,
  renderColumnHeader,
  renderColumnFooter,
  isDraggable,
  isColumnCollapsed,
  columnAccent,
  isColumnHighlighted,
  renderColumnTopNotice,
  emptyState,
  fluid = false,
  appearance = "framed",
  scrollMemoryKey,
}: {
  columns: TColumn[];
  items: TItem[];
  /**
   * Element qaysi ustunga tegishli.
   *
   * Barqaror funksiya bo'lishi kerak (modul darajasida yoki `useCallback`),
   * aks holda guruhlash har renderda qaytadan hisoblanadi.
   */
  getColumnId: (item: TItem) => ColumnId | null;
  /**
   * Boshqa ustunga ko'chirildi. `position` — nishon ustundagi indeks
   * (0 — eng tepa), ya'ni chaqiruvchi bitta so'rov bilan status va o'rinni
   * birga saqlaydi.
   */
  onMove: (itemId: ItemId, columnId: ColumnId, position: number) => void;
  /**
   * Ustun ichida tartib o'zgarganda — ustundagi yangi to'liq tartib bilan.
   * Berilmasa bir xil ustunga tashlash hech narsa qilmaydi.
   */
  onReorder?: (columnId: ColumnId, itemIds: ItemId[]) => void;
  /** Kartochka ko'rinishi — har bir doska o'zinikini beradi. */
  renderCard: (item: TItem, state: CardState) => React.ReactNode;
  renderColumnHeader: (column: TColumn, count: number) => React.ReactNode;
  renderColumnFooter?: (column: TColumn) => React.ReactNode;
  /** Ba'zi kartochkalar qulflangan bo'lishi mumkin (masalan yetkazilgan buyurtma). */
  isDraggable?: (item: TItem) => boolean;
  /**
   * Yig'ilgan ustun: tor reyka, faqat sarlavha chiziladi, kartochkalar va
   * tashlash zonasi yo'q (kuzatuv ustuni uchun). Sarlavha o'zi ochish
   * tugmasini beradi.
   */
  isColumnCollapsed?: (column: TColumn) => boolean;
  /**
   * Ustunning rangi — chetki chiziqlar shu rangning xira aralashmasi bo'ladi,
   * ya'ni ustun sarlavhadan pastga qarab bir butun ko'rinadi. Berilmasa
   * oddiy neytral chiziq qoladi.
   */
  columnAccent?: (column: TColumn) => string | undefined;
  /** Ustun bir zum yonadi (masalan unga hozirgina yangi karta tushdi). */
  isColumnHighlighted?: (column: TColumn) => boolean;
  /**
   * Ustun tanasining tepasida yopishib turadigan bildirgich (layoutni
   * surmaydi) — masalan "N yangi ↑". Skroll holati bilan chaqiriladi.
   */
  renderColumnTopNotice?: (
    column: TColumn,
    scroll: ColumnScrollState,
  ) => React.ReactNode;
  emptyState?: React.ReactNode;
  /**
   * Ustunlar ekran kengligini bo'lib oladi (dizayn: `64px + 4 × 1fr`);
   * tor ekranda esa minimal kenglikda gorizontal suriladi (snap bilan).
   */
  fluid?: boolean;
  /** `open` — ustun tanasi sarlavhadan ajralgan yengil shisha ramkada; `framed` — sarlavhaga ulangan. */
  appearance?: "framed" | "open";
  /**
   * Berilsa doska va har ustunning scroll joyi shu kalit bilan eslab
   * qolinadi — detaldan yoki boshqa bo'limdan qaytganda o'sha joydan.
   */
  scrollMemoryKey?: string;
}) {
  const [draggingItem, setDraggingItem] = useState<TItem | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rememberBoardScroll = useScrollMemory<HTMLDivElement>(
    scrollMemoryKey ? `${scrollMemoryKey}:x` : null,
    "x",
  );
  // Sichqoncha: bo'sh joyni ushlab doskani yon tomonga tortish.
  const dragPan = useDragPan<HTMLDivElement>();
  const setScrollerRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      rememberBoardScroll(node);
      dragPan(node);
    },
    [rememberBoardScroll, dragPan],
  );
  const [previewGroups, setPreviewGroups] = useState<Map<
    ColumnId,
    ItemId[]
  > | null>(null);

  // Sudrash 6px dan keyin boshlanadi — oddiy bosish kartochkani ochadi.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const itemById = useMemo(
    () => new Map<ItemId, TItem>(items.map((item) => [item.id, item])),
    [items],
  );

  /** Ustunlar bo'yicha guruhlangan element id'lari. */
  const byColumn = useMemo(() => {
    const groups = new Map<ColumnId, ItemId[]>();
    for (const column of columns) groups.set(column.id, []);

    for (const item of items) {
      const columnId = getColumnId(item);
      if (columnId === null) continue;
      groups.get(columnId)?.push(item.id);
    }

    return groups;
  }, [columns, items, getColumnId]);

  const groups = previewGroups ?? byColumn;

  // To'qnashuv aniqlagichining "xotirasi" — ustunlar orasida o'tish paytida
  // nishon sakrab ketmasligi uchun (dnd-kit'ning ko'p ustunli namunasi).
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedToNewColumn = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      movedToNewColumn.current = false;
    });
  }, [previewGroups]);

  /**
   * Kursor ostidagi elementga qarab aniqlaydi — `closestCorners` dan farqli
   * o'laroq kartochka qaysi ustun ustida bo'lsa, o'shani tanlaydi va
   * ustun almashgan kadrda oldingi nishonni ushlab turadi. Natijada preview
   * bir joyda turadi, siltanish yo'qoladi.
   */
  const detectCollision: CollisionDetection = useCallback(
    (args) => {
      const pointerHits = pointerWithin(args);
      const hits =
        pointerHits.length > 0 ? pointerHits : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");

      if (overId !== null) {
        if (isColumnId(overId)) {
          // Ustun ustida — ichidagi eng yaqin kartochkaga aniqlashtiramiz.
          const ids = findGroup(overId, groups) ?? [];
          if (ids.length > 0) {
            const inColumn = new Set<UniqueIdentifier>(ids);
            const closest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) => inColumn.has(container.id),
              ),
            });
            if (closest.length > 0) overId = closest[0].id;
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Ustun endigina almashgan bo'sh kadr — oldingi nishonni saqlaymiz,
      // aks holda kartochka bir zum orqaga "sakraydi".
      if (movedToNewColumn.current) lastOverId.current = args.active.id;
      return lastOverId.current !== null ? [{ id: lastOverId.current }] : [];
    },
    [groups],
  );

  /**
   * Tashlangandan keyin preview darhol tozalanmaydi.
   *
   * Aks holda kartochka bir kadr eski ustuniga qaytadi va faqat optimistik
   * yangilash kelgach yangi joyida paydo bo'ladi — ko'zga "orqaga sakrash"
   * bo'lib tashlanadi. Shu sababli preview yangi ma'lumot kelgunga qadar
   * ushlab turiladi.
   */
  const settlingRef = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  };

  useEffect(() => {
    if (!settlingRef.current) return;
    settlingRef.current = false;
    clearSettleTimer();
    setPreviewGroups(null);
  }, [items]);

  useEffect(() => clearSettleTimer, []);

  const finishDrag = () => {
    setDraggingItem(null);
    clearSettleTimer();
    settlingRef.current = false;
    setPreviewGroups(null);
  };

  /** O'zgarish yuborildi — preview yangi ma'lumot kelguncha qoladi. */
  const settleDrag = () => {
    setDraggingItem(null);
    settlingRef.current = true;

    // Server javob bermasa ham preview abadiy qolib ketmasin.
    clearSettleTimer();
    settleTimer.current = setTimeout(() => {
      settlingRef.current = false;
      setPreviewGroups(null);
    }, 2000);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as TItem | undefined;
    setDraggingItem(item ?? null);
    lastOverId.current = null;
    // Preview — joriy guruhlarning nusxasi; sudrash davomida faqat u o'zgaradi.
    setPreviewGroups(new Map([...byColumn].map(([id, ids]) => [id, [...ids]])));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as ItemId;

    setPreviewGroups((current) => {
      if (!current) return current;

      const from = findContainer(activeId, current);
      const to = findContainer(over.id, current);
      if (from === null || to === null) return current;

      // Bir xil ustun ichida — faqat o'rin almashish.
      if (from === to) {
        if (!onReorder || isColumnId(over.id)) return current;

        const ids = current.get(from) ?? [];
        const oldIndex = ids.indexOf(activeId);
        const newIndex = ids.indexOf(over.id as ItemId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return current;
        }

        const reordered = [...ids];
        reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, activeId);

        const next = new Map(current);
        next.set(from, reordered);
        return next;
      }

      const fromIds = (current.get(from) ?? []).filter((id) => id !== activeId);
      const toIds = [...(current.get(to) ?? [])];

      // Nishon kartochkaning ustki yoki pastki yarmiga qarab joy tanlanadi;
      // ustunning bo'sh joyiga olib borilsa — oxiriga.
      const overIndex = isColumnId(over.id)
        ? -1
        : toIds.indexOf(over.id as ItemId);
      let insertAt = toIds.length;
      if (overIndex !== -1) {
        const activeTop = active.rect.current.translated?.top ?? 0;
        const isBelow = activeTop > over.rect.top + over.rect.height / 2;
        insertAt = overIndex + (isBelow ? 1 : 0);
      }
      toIds.splice(insertAt, 0, activeId);

      movedToNewColumn.current = true;

      const next = new Map(current);
      next.set(from, fromIds);
      next.set(to, toIds);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const item = event.active.data.current?.item as TItem | undefined;
    const target = previewGroups
      ? findContainer(event.active.id as ItemId, previewGroups)
      : null;

    // Yangi tartib preview'dan olinadi — u sudrash davomida yig'ilgan.
    const orderedIds =
      target !== null ? (previewGroups?.get(target) ?? null) : null;

    if (!item || target === null) {
      finishDrag();
      return;
    }

    if (target !== getColumnId(item)) {
      // Nishon ustundagi o'rin ham shu yerda ma'lum — bitta so'rov yetadi.
      const position = orderedIds ? orderedIds.indexOf(item.id) : -1;
      settleDrag();
      onMove(item.id, target, Math.max(0, position));
      return;
    }

    // O'sha ustun ichida tartib o'zgargan bo'lsa saqlaymiz.
    if (onReorder && orderedIds) {
      const before = byColumn.get(target) ?? [];
      const changed =
        before.length !== orderedIds.length ||
        before.some((id, index) => id !== orderedIds[index]);
      if (changed) {
        settleDrag();
        onReorder(target, orderedIds);
        return;
      }
    }

    finishDrag();
  };

  if (columns.length === 0) return <>{emptyState}</>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={detectCollision}
      // `Always` har render'da barcha ustunlarni qayta o'lchardi va ko'p
      // kartochkada sezilarli sekinlashtirardi. `WhileDragging` faqat
      // sudrash boshlanganda va joylashuv o'zgarganda o'lchaydi.
      measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={finishDrag}
    >
      <BoardEdgeScroll scrollerRef={scrollerRef}>
        <div
          ref={setScrollerRef}
          data-wheel-x
          className={cn(
            "scrollbar-thin flex h-full gap-3 overflow-x-auto px-4 pb-4 sm:px-5",
            fluid && "snap-x snap-mandatory md:snap-none",
          )}
        >
          {columns.map((column) => {
            const ids = groups.get(column.id) ?? EMPTY_IDS;

            return (
              <BoardColumnView
                key={String(column.id)}
                column={column}
                ids={ids}
                itemById={itemById}
                renderCard={renderCard}
                renderHeader={renderColumnHeader}
                renderFooter={renderColumnFooter}
                isDraggable={isDraggable}
                collapsed={isColumnCollapsed?.(column) ?? false}
                accent={columnAccent?.(column)}
                highlighted={isColumnHighlighted?.(column) ?? false}
                renderTopNotice={renderColumnTopNotice}
                fluid={fluid}
                appearance={appearance}
                scrollMemoryKey={scrollMemoryKey ? `${scrollMemoryKey}:${String(column.id)}` : null}
              />
            );
          })}
        </div>
      </BoardEdgeScroll>

      {/*
        Preview kartochkani yangi joyida ushlab turadi, shuning uchun overlay
        aynan o'sha joyga qo'nadi — "orqaga uchish" muammosi yo'q. Qisqa
        joylashish harakati sudrashni tugallangandek ko'rsatadi.
      */}
      <DragOverlay dropAnimation={dropAnimation}>
        {draggingItem ? (
          <RenderSlot render={renderCard} args={[draggingItem, OVERLAY]} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Qo'yib yuborilganda overlay o'z joyiga qo'nadi.
 *
 * Qisqa va sekinlashib to'xtaydigan — kartochka allaqachon o'sha yerda
 * bo'lgani uchun bu faqat "yopishtirish" harakati, uzoq bo'lishi shart emas.
 */
const dropAnimation: DropAnimation = {
  duration: 180,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    // Asl joydagi nusxa overlay qo'nguncha xira turadi.
    styles: { active: { opacity: "0.4" } },
  }),
};

/** Ustun id'si `column-` prefiksi bilan uzatiladi — element id'sidan farqlash uchun. */
const COLUMN_PREFIX = "column-";

function isColumnId(id: UniqueIdentifier): boolean {
  return typeof id === "string" && id.startsWith(COLUMN_PREFIX);
}

function toColumnId(id: ColumnId): string {
  return `${COLUMN_PREFIX}${id}`;
}

/** `column-N` ko'rinishidagi id bo'yicha guruhni topadi. */
function findGroup(
  id: UniqueIdentifier,
  groups: Map<ColumnId, ItemId[]>,
): ItemId[] | null {
  const raw = String(id).slice(COLUMN_PREFIX.length);
  for (const [columnId, ids] of groups) {
    if (String(columnId) === raw) return ids;
  }
  return null;
}

/** Id qaysi ustunga tegishli: `column-N` yoki element id'si bo'yicha. */
function findContainer(
  id: UniqueIdentifier,
  groups: Map<ColumnId, ItemId[]>,
): ColumnId | null {
  if (isColumnId(id)) {
    const raw = String(id).slice(COLUMN_PREFIX.length);
    for (const key of groups.keys()) {
      if (String(key) === raw) return key;
    }
    return null;
  }

  for (const [columnId, ids] of groups) {
    if (ids.includes(id as ItemId)) return columnId;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

function BoardColumnView<TItem extends BoardItem, TColumn extends BoardColumn>({
  column,
  ids,
  itemById,
  renderCard,
  renderHeader,
  renderFooter,
  isDraggable,
  collapsed,
  accent,
  highlighted,
  renderTopNotice,
  fluid,
  appearance,
  scrollMemoryKey,
}: {
  column: TColumn;
  /** Ustundagi id'lar — preview o'zgarmagan ustunda identifikatsiya saqlanadi. */
  ids: ItemId[];
  itemById: Map<ItemId, TItem>;
  renderCard: (item: TItem, state: CardState) => React.ReactNode;
  renderHeader: (column: TColumn, count: number) => React.ReactNode;
  renderFooter?: (column: TColumn) => React.ReactNode;
  isDraggable?: (item: TItem) => boolean;
  collapsed: boolean;
  /** Ustun rangi; chetki chiziqlar shundan xiralashtirib olinadi. */
  accent?: string;
  highlighted: boolean;
  renderTopNotice?: (
    column: TColumn,
    scroll: ColumnScrollState,
  ) => React.ReactNode;
  fluid: boolean;
  appearance: "framed" | "open";
  scrollMemoryKey: string | null;
}) {
  const items = useMemo(
    () =>
      ids
        .map((id) => itemById.get(id))
        .filter((item): item is TItem => item !== undefined),
    [ids, itemById],
  );
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const { setNodeRef, isOver } = useDroppable({
    id: toColumnId(column.id),
    data: { columnId: column.id },
    // Yig'ilgan ustunga tashlab bo'lmaydi — u faqat kuzatuv reykasi.
    disabled: collapsed,
  });

  // Element holatda (ref emas): `scrollToTop` render paytida bildirgichga uzatiladi.
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const [scrolledDown, setScrolledDown] = useState(false);
  const rememberScroll = useScrollMemory<HTMLDivElement>(scrollMemoryKey);
  const setBodyRef = useCallback(
    (node: HTMLDivElement | null) => {
      setBody(node);
      setNodeRef(node);
      rememberScroll(node);
    },
    [setNodeRef, rememberScroll],
  );
  const scrollToTop = useCallback(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    body?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [body]);

  const style = accent
    ? ({ "--accent": accent } as React.CSSProperties)
    : undefined;

  if (collapsed) {
    return (
      <section
        style={style}
        className="flex w-(--kanban-col-collapsed-w) shrink-0 flex-col transition-[width] duration-(--dur-standard) ease-out"
      >
        <RenderSlot render={renderHeader} args={[column, items.length]} />
      </section>
    );
  }

  const open = appearance === "open";

  return (
    <section
      style={style}
      className={cn(
        "flex shrink-0 flex-col transition-[width] duration-(--dur-standard) ease-out",
        fluid
          ? "w-[17rem] snap-start md:w-auto md:min-w-[15rem] md:flex-1 md:basis-0"
          : "w-[300px]",
        open && "gap-2.5",
        highlighted && "column-arrive",
      )}
    >
      <RenderSlot render={renderHeader} args={[column, items.length]} />

      <div
        ref={setBodyRef}
        onScroll={(event) =>
          setScrolledDown(event.currentTarget.scrollTop > SCROLLED_DOWN_PX)
        }
        className={cn(
          "scrollbar-thin flex-1 overflow-y-auto transition-colors duration-150 ease-linear",
          open
            ? cn(
                // Shisha tana (Tungi yo'l): kartalar sahna ustidagi yengil
                // ramkada; tashlash paytida esa butun ustun yengil yonadi.
                "glass-card kanban-tint space-y-2.5 rounded-2xl border p-2",
                isOver && "bg-brand-soft ring-brand/40 ring-1",
              )
            : cn(
                "kanban-tint space-y-2 rounded-b-xl border border-t-0 p-2",
                // Chetki chiziqlar ustun rangining xira aralashmasi.
                "border-[color-mix(in_oklab,var(--accent,var(--line))_45%,var(--line))]",
                isOver ? "bg-brand-soft border-brand/40" : "bg-canvas/50",
              ),
        )}
      >
        {renderTopNotice?.(column, { scrolledDown, scrollToTop })}

        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem
              key={String(item.id)}
              item={item}
              disabled={isDraggable ? !isDraggable(item) : false}
            >
              {(state) => (
                <RenderSlot render={renderCard} args={[item, state]} />
              )}
            </SortableItem>
          ))}
        </SortableContext>

        {items.length === 0 ? (
          <p
            className={cn(
              "text-ink-faint rounded-lg border border-dashed px-3 py-6 text-center text-meta transition-colors duration-150 ease-linear",
              isOver ? "border-brand text-brand" : "border-line",
            )}
          >
            {isOver ? "Shu yerga tashlang" : "Bo'sh"}
          </p>
        ) : null}

        {renderFooter ? (
          <RenderSlot render={renderFooter} args={[column]} />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Sudraladigan element o'rami.
 *
 * `disabled` — qulflangan kartochka (masalan yetkazilgan buyurtma): ko'rinadi,
 * lekin joyidan qimirlamaydi.
 */
function SortableItem<TItem extends BoardItem>({
  item,
  disabled,
  children,
}: {
  item: TItem;
  disabled: boolean;
  children: (state: CardState) => React.ReactNode;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item.id,
      data: { item },
      disabled,
      // Sekinlashib to'xtaydigan yumshoq egri — overshoot yo'q.
      transition: { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    });

  /*
    Faqat `PointerSensor` ishlatiladi (klaviatura sensori yo'q), shuning
    uchun dnd-kit'ning `attributes` (`role="button"`, `tabIndex`,
    `aria-disabled`) berilmaydi: ular kartochkani "tugma ichida tugma"
    qilardi, qulflanganini esa o'chirilgan tugmaga aylantirardi. Kartochka
    o'zi ochish tugmasini beradi; bu o'ram faqat sichqoncha bilan sudraydi.
  */
  const dragProps = disabled ? {} : listeners;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...dragProps}
      className={cn(
        "kanban-card-virtual",
        disabled ? "cursor-default" : "touch-none",
        isDragging && "z-10",
      )}
    >
      {children(isDragging ? DRAGGING : IDLE)}
    </div>
  );
}

const EMPTY_IDS: ItemId[] = [];

/**
 * Kartochka/sarlavha chizuvchisining memo o'rami.
 *
 * dnd-kit kontekstining qiymati (`collisions`, `over`) sudrash paytida har
 * kursor harakatida yangilanadi va har bir `useSortable`/`useDroppable`
 * qayta chiziladi. Kartochka mazmuni shu zanjirga ulansa yuzlab karta har
 * kadrda qaytadan quriladi — sudrash "qotib" qoladi. O'ram faqat
 * argumentlari (element, holat, son) yoki chizuvchining o'zi o'zgarganda
 * qayta chizadi; dnd-kit o'ramining o'zi arzon qoladi.
 */
function RenderSlotImpl<A extends unknown[]>({
  render,
  args,
}: {
  render: (...args: A) => React.ReactNode;
  args: A;
}) {
  return <>{render(...args)}</>;
}

const RenderSlot = memo(
  RenderSlotImpl,
  (prev, next) =>
    prev.render === next.render &&
    prev.args.length === next.args.length &&
    prev.args.every((value, index) => Object.is(value, next.args[index])),
) as typeof RenderSlotImpl;
