import type { InfiniteData, Query, QueryClient, QueryKey } from "@tanstack/react-query";

import { parseDate } from "@/lib/format";
import {
  asArray,
  asOptionalBool,
  asOptionalInt,
  asOptionalString,
  asString,
  isRecord,
} from "@/lib/parse";
import type { SocketEvent } from "@/lib/reconnecting-socket";

import { cachedDistrictLookup } from "@/features/zones/district-lookup";

import {
  isBoardFullyLoaded,
  isOrdersBoard,
  moveOrderInBoard,
} from "./board";
import type { OrdersBoard } from "./board";
import { mapChangeRequest } from "./change-request";
import { boardOrdering, insertOrderInBoard } from "./ordering";
import {
  applyPaymentStatus,
  isFullOrderPayload,
  mergeOrderSnapshot,
  withDistrictDisplay,
} from "./order-snapshot";
import {
  confirmedByLabel,
  mapAcks,
  mapLogistOrder,
  normalizeStatus,
  UNKNOWN_STATUS,
} from "./types";
import type { LogistOrder, LogistOrderDetail, LogistOrdersPage } from "./types";
import { EMPTY_ZONING, mapSuggestion } from "./zoning";
import type { OrderZoning } from "./zoning";

/**
 * Buyurtmalar bo'yicha real vaqt hodisalari (`FLUTTER_ORDER_PIPELINE_V2`
 * §5.4, §5.7 — `filial_<id>` guruhi).
 *
 * Status bir necha joydan o'zgaradi (CRM, mijoz ilovasi, to'lov webhooki,
 * logistning boshqa tabi) — soket yagona ishonchli signal.
 *
 * Doska keshi joyida to'g'rilanadi: kartochka darhol boshqa ustunga ko'chadi,
 * hisoblagich va summa birga siljiydi. Hodisaning `order` bloki **qisqa
 * karta** — faqat kelgan kalitlar yamaladi (`order-snapshot.ts`).
 *
 * Tarmoqqa chiqish kerak bo'lsa u **birlashtiriladi**: bitta tasdiq uchun
 * backend `order_status_changed`, `order_confirmed` va
 * `order_payment_changed` ni ketma-ket yuboradi — uch marta so'rov emas,
 * bitta.
 */
export function applyOrderEvent(
  queryClient: QueryClient,
  type: string,
  incoming: SocketEvent,
): void {
  // Qisqa kartada tuman nomi yo'q (Q7) — katalog keshidan qo'yiladi.
  const event: SocketEvent = isRecord(incoming.order)
    ? {
        ...incoming,
        order: withDistrictDisplay(incoming.order, cachedDistrictLookup(queryClient)),
      }
    : incoming;
  const orderId = asString(event.order_id);

  if (type === "order_status_changed") {
    const toStatus = normalizeStatus(asString(event.to_status));
    if (orderId && toStatus !== UNKNOWN_STATUS) {
      /*
       * `changed_at` — serverning vaqti (2026-10-01 C §9.1), REST dagi
       * `status_changed_at` bilan AYNAN bir xil. Hodisa kelgan lahza
       * ishlatilmaydi: qayta ulanishda navbatdagi xabarlar birdan "hozir"
       * bo'lib tushardi. Eski deploy (kalitsiz) — zaxira sifatida hozir.
       */
      const changedAt = parseDate(event.changed_at);
      applyStatusChange(
        queryClient,
        orderId,
        toStatus,
        (order) => {
          const merged = mergeOrderSnapshot(order, event.order);
          return changedAt ? { ...merged, statusChangedAt: changedAt } : merged;
        },
        changedAt ?? undefined,
        isRecord(event.order) ? event.order : null,
      );
      return;
    }
  }

  /*
   * Tasdiq (`order_confirmed`, §5.4) — status hodisasiga QO'SHIMCHA: kim
   * tasdiqlaganini aytadi. Onlayn to'lov tanlanganda buyurtma `pending` da
   * qoladi, shuning uchun ustun hodisaning o'z `status` idan olinadi.
   * 2026-10-01 dan hodisada to'liq karta (`order`) va `confirmed_at` bor
   * (§6.4) — karta refetchsiz to'ladi; eski qisqa shakl ham o'qiladi.
   */
  if (type === "order_confirmed" && orderId) {
    const raw = asString(event.status);
    const toStatus = raw ? normalizeStatus(raw) : "confirmed";
    const confirmedAt = parseDate(event.confirmed_at);
    const update = (order: LogistOrder) => {
      const merged = applyPaymentStatus(
        mergeOrderSnapshot(order, event.order),
        asOptionalString(event.payment_status),
        asOptionalString(event.payment_method),
      );
      return confirmedAt ? { ...merged, confirmedAt } : merged;
    };
    if (toStatus === UNKNOWN_STATUS) {
      patchOrder(queryClient, orderId, update);
    } else {
      applyStatusChange(
        queryClient,
        orderId,
        toStatus,
        update,
        undefined,
        isRecord(event.order) ? event.order : null,
      );
    }
    return;
  }

  // To'lov o'qi (§5.7): `from_status`/`to_status` — `payment_status`.
  if (type === "order_payment_changed" && orderId) {
    const update = (order: LogistOrder) =>
      applyPaymentStatus(
        mergeOrderSnapshot(order, event.order),
        asOptionalString(event.to_status),
      );
    const snapshotStatus = isRecord(event.order)
      ? normalizeStatus(asString(event.order.status))
      : UNKNOWN_STATUS;
    if (snapshotStatus !== UNKNOWN_STATUS) {
      applyStatusChange(
        queryClient,
        orderId,
        snapshotStatus,
        update,
        undefined,
        isRecord(event.order) ? event.order : null,
      );
    } else {
      patchOrder(queryClient, orderId, update);
    }
    return;
  }

  // Maydon tahriri — faqat to'liq buyurtma kelsa joyida yamaladi.
  if (type === "order_updated" && orderId && !isFullOrderPayload(event.order)) {
    if (applyCourierRemoved(queryClient, orderId, event.changes)) return;
  }
  if (type === "order_updated" && orderId && isFullOrderPayload(event.order)) {
    const updated = mapLogistOrder(event.order);
    patchOrder(queryClient, orderId, (order) => ({
      ...updated,
      acknowledgedBy: updated.acknowledgedBy ?? order.acknowledgedBy,
    }));
    return;
  }

  if (type === "order_courier_assigned" && orderId) {
    applyCourierAssigned(queryClient, orderId, event);
    return;
  }

  // Eshikdagi o'zgarish so'rovi (`LOGIST_02` §2) — faqat belgi yamaladi.
  if (
    (type === "order_change_requested" || type === "order_change_request_resolved") &&
    orderId
  ) {
    applyChangeRequestEvent(queryClient, type, orderId, event);
    return;
  }

  // Taqsimlash taklifi (2026-10-15) — faqat belgi, tarmoqqa chiqilmaydi.
  if (type === "order_suggestion" && orderId) {
    patchOrderInCaches(queryClient, orderId, (order) =>
      withZoning(order, { suggestion: suggestionFromEvent(event) }),
    );
    return;
  }

  if (type === "order_auto_assigned" && orderId) {
    applyAutoAssigned(queryClient, orderId, event);
    return;
  }

  if (type === "order_zone_mismatch" && orderId) {
    patchOrderInCaches(queryClient, orderId, (order) =>
      withZoning(order, { zoneMatch: false }),
    );
    return;
  }

  // "Oldim" (`order_acknowledged`) — filialdagi hamma logistga: karta
  // "YANGI" belgisidan chiqadi va kim olgani ko'rinadi. Refetch kerak emas.
  if (type === "order_acknowledged" && orderId) {
    const acks = mapAcks(event.acknowledged_by);
    if (acks) {
      patchOrderInCaches(queryClient, orderId, (order) => ({ ...order, acknowledgedBy: acks }));
    }
    return;
  }

  if (type === "order_tags_changed" && orderId) {
    applyTagsChanged(queryClient, orderId, event.tags);
    return;
  }

  /*
   * Yangi buyurtma: hodisada to'liq karta bo'lsa u darhol ustunning eng
   * tepasiga qo'yiladi (tarmoqni kutmasdan). Son, summa va filtrga
   * tushish-tushmasligining haqiqati baribir serverda — pastdagi yangilash
   * uni tasdiqlaydi.
   */
  if (type === "order_created" && isFullOrderPayload(event.order)) {
    const stale = insertCreatedOrder(queryClient, mapLogistOrder(event.order));
    // Karta qo'yilgan doskalar so'ralmaydi (2026-10-01 §6.3 — to'liq karta
    // shu maqsadda keladi); filtrli/qo'yib bo'lmagan doskalar va ro'yxatlar —
    // serverdan.
    scheduleRefresh(queryClient, { boards: stale, lists: true });
    return;
  }

  // Yangi buyurtma, yetkazish urinishi, transfer belgilari — kartochkani
  // mijoz tomonda to'liq yasab bo'lmaydi, tegishli keshlar qayta olinadi.
  scheduleRefresh(queryClient, { allOrders: true });
}

/**
 * Doska filtri hozir yaratilgan buyurtmani albatta o'z ichiga oladimi.
 *
 * Qidiruv, kuryer, kanal, teg, to'lov yoki aniq sana bilan toraytirilgan
 * doskaga karta qo'yilmaydi — u filtrga tushmasligi mumkin va keyingi
 * so'rovda "paydo bo'lib yo'qolgan" bo'lardi. Davr presetlari (`all`,
 * `today`, `month`, `year`) hozirgi vaqtni doim qamraydi.
 */
export function boardAcceptsNewOrder(filters: unknown): boolean {
  if (!isRecord(filters)) return false;
  const blank = (value: unknown) =>
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  return NARROWING_FILTERS.every((key) => blank(filters[key]));
}

const NARROWING_FILTERS = [
  "search",
  "courierId",
  "source",
  "tag",
  "isPaid",
  "paymentMethods",
  "date",
  "dateFrom",
  "dateTo",
  "transfer",
  "statuses",
  // 2026-10-01 C §11 — server filtrlari.
  "createdByKinds",
  "hasApp",
  "deliveryDate",
  "regions",
  "overdue",
  "paymentStates",
  // 2026-10-15 — hudud filtrlari.
  "districts",
  "zones",
  "suggested",
] as const;

/** Kartani qo'yadi; qo'yib bo'lmagan doskalar kalitlari qaytadi (ular qayta so'raladi). */
function insertCreatedOrder(queryClient: QueryClient, order: LogistOrder): QueryKey[] {
  const boards = queryClient.getQueriesData<OrdersBoard<LogistOrder>>({
    queryKey: ["orders", "board"],
  });
  const stale: QueryKey[] = [];
  for (const [key, board] of boards) {
    if (!isOrdersBoard(board)) continue;
    const next =
      order.id && boardAcceptsNewOrder(key[3])
        ? insertOrderInBoard(board, order, boardOrdering(key[3]))
        : null;
    if (next) queryClient.setQueryData(key, next);
    // Takroriy hodisa (karta allaqachon doskada) — so'rov kerak emas.
    else if (!board.columns.some((column) => column.orders.some((item) => item.id === order.id))) {
      stale.push(key);
    }
  }
  return stale;
}

/**
 * Hodisaning qisqa kartasi ko'chirilgan kartochkani to'liq to'ldiradimi.
 *
 * 2026-10-01 C §9.1 dan blokda vaqtlar (`status_changed_at`, `shipped_at`,
 * `delivered_at`), to'lov va tasdiq bor — ko'chirish uchun yetarli, doska
 * qayta so'ralmaydi. Faqat bekor qilishda sabab (`cancel`) kerak; u blokda
 * bo'lmasa o'sha doska fonda olinadi. Blok umuman yo'q (eski deploy) — ham.
 */
function snapshotCovers(toStatus: string, snapshot: Record<string, unknown> | null): boolean {
  if (!snapshot || !("status_changed_at" in snapshot)) return false;
  return toStatus !== "cancelled" || "cancel" in snapshot;
}

function applyStatusChange(
  queryClient: QueryClient,
  orderId: string,
  toStatus: string,
  update: (order: LogistOrder) => LogistOrder,
  /** Statusga kirgan server vaqti (`changed_at`); yo'q bo'lsa — hozir. */
  at?: Date,
  /** Hodisaning `order` bloki — ko'chirishdan keyin so'rov kerakmi. */
  snapshot: Record<string, unknown> | null = null,
): void {
  const boards = queryClient.getQueriesData<OrdersBoard<LogistOrder>>({
    queryKey: ["orders", "board"],
  });

  for (const [key, board] of boards) {
    if (!isOrdersBoard(board)) continue;

    const moved = moveOrderInBoard(board, orderId, toStatus, {
      ordering: boardOrdering(key[3]),
      at,
    });
    if (moved) {
      const echo = moved === board;
      const next = patchColumns(moved, orderId, update);
      if (next !== board) queryClient.setQueryData(key, next);

      /*
       * Kartochka allaqachon shu ustunda — o'z o'zgarishimizning aks-sadosi:
       * PATCH javobi kartani yangilab bo'lgan, tarmoqqa chiqilmaydi.
       * Boshqa joydan kelgan o'zgarish joyida yamaladi; faqat blok
       * yetmasa (bekor sababi, eski deploy) doska fonda qayta olinadi.
       */
      if (!echo && !snapshotCovers(toStatus, snapshot)) {
        scheduleRefresh(queryClient, { boards: [key] });
      }
      continue;
    }

    /*
     * Buyurtma bu doskada yo'q. Ustunlar oxirigacha yuklangan bo'lsa u
     * doskaning filtriga umuman tushmaydi — hech narsa qilmaymiz. Aks holda
     * yuklanmagan qismda yashiringan bo'lishi mumkin, ya'ni son ham,
     * summa ham eskirdi.
     */
    if (!isBoardFullyLoaded(board)) scheduleRefresh(queryClient, { boards: [key] });
  }

  scheduleRefresh(queryClient, { lists: true });
}

/** Ustun ichidagi bitta kartochkani yangilaydi; topilmasa o'sha doska. */
function patchColumns(
  board: OrdersBoard<LogistOrder>,
  orderId: string,
  update: (order: LogistOrder) => LogistOrder,
): OrdersBoard<LogistOrder> {
  let touched = false;
  const columns = board.columns.map((column) => {
    if (!column.orders.some((order) => order.id === orderId)) return column;
    return {
      ...column,
      orders: column.orders.map((order) => {
        if (order.id !== orderId) return order;
        const next = update(order);
        if (next !== order) touched = true;
        return next;
      }),
    };
  });
  return touched ? { ...board, columns } : board;
}

/**
 * Teglar (§4.13) joyida yamaladi — nuqtalar darhol o'zgaradi.
 *
 * Hodisada teglar bo'lmasa (eski backend) hech narsa taxmin qilinmaydi:
 * buyurtma keshi eskirgan deb belgilanadi va o'zi qayta olinadi.
 */
function applyTagsChanged(
  queryClient: QueryClient,
  orderId: string,
  rawTags: unknown,
): void {
  if (!Array.isArray(rawTags)) {
    scheduleRefresh(queryClient, { allOrders: true });
    return;
  }

  const tags = asArray(rawTags)
    .map((item) => asString(item).trim())
    .filter((tag) => tag.length > 0);

  patchOrder(queryClient, orderId, (order) => ({
    ...order,
    tags,
    tagsFromServer: true,
  }));
}

/** Hudud blokini qisman yangilash (eski kartada blok bo'lmasligi mumkin). */
function withZoning(order: LogistOrder, patch: Partial<OrderZoning>): LogistOrder {
  return { ...order, zoning: { ...(order.zoning ?? EMPTY_ZONING), ...patch } };
}

/**
 * `order_suggestion {suggested_courier_id, suggested_courier_name, tier,
 * reason, auto_hold, computed_at}` (backend #14) — `reason: "cleared"`
 * taklif olib tashlanganini bildiradi.
 */
export function suggestionFromEvent(event: SocketEvent): OrderZoning["suggestion"] {
  if (asString(event.reason) === "cleared") return null;
  return mapSuggestion({
    courier_id: event.suggested_courier_id,
    courier_name: event.suggested_courier_name,
    tier: event.tier,
    reason: event.reason,
    computed_at: event.computed_at,
    auto_hold: event.auto_hold,
  });
}

function courierFrom(raw: unknown): LogistOrder["courier"] {
  const courier = isRecord(raw) ? raw : null;
  const courierId = courier ? asOptionalInt(courier.id) : null;
  return courier && courierId !== null
    ? {
        id: courierId,
        fullName: asString(courier.full_name ?? courier.name),
        phone: asString(courier.phone) || null,
      }
    : null;
}

/**
 * Kartadagi kuryer joyida yamaladi — doska qayta yuklanmaydi.
 * 2026-10-15: hodisada `zone_match`, `tier`, `auto` ham bor; biriktirilgan
 * buyurtmada taklif endi kerak emas.
 */
function applyCourierAssigned(
  queryClient: QueryClient,
  orderId: string,
  event: SocketEvent,
): void {
  const courier = courierFrom(event.courier);
  patchOrderInCaches(queryClient, orderId, (order) =>
    withZoning(
      { ...order, courier },
      courier
        ? {
            zoneMatch: asOptionalBool(event.zone_match),
            autoAssigned: asOptionalBool(event.auto) ?? false,
            suggestion: null,
          }
        : { zoneMatch: null, autoAssigned: null },
    ),
  );
  scheduleRefresh(queryClient, { lists: true });
}

/**
 * `order_auto_assigned {order_id, courier_id, order}` — avto-taqsimlash
 * biriktirdi. Kartada ism bo'lmasa (qisqa karta, taklif boshqa kuryerga)
 * keshlar serverdan olinadi.
 */
function applyAutoAssigned(
  queryClient: QueryClient,
  orderId: string,
  event: SocketEvent,
): void {
  const courierId = asOptionalInt(event.courier_id);
  let nameless = false;
  patchOrderInCaches(queryClient, orderId, (order) => {
    const merged = mergeOrderSnapshot(order, event.order);
    let courier = merged.courier;
    if (courierId !== null && courier?.id !== courierId) {
      const suggested = order.zoning?.suggestion;
      const name =
        suggested?.courierId === courierId ? suggested.courierName : "";
      nameless = !name;
      courier = { id: courierId, fullName: name, phone: null };
    }
    return withZoning(
      { ...merged, courier },
      { autoAssigned: true, suggestion: null },
    );
  });
  scheduleRefresh(queryClient, nameless ? { allOrders: true } : { lists: true });
}

/**
 * `order_updated` da `changes.courier {from, to: null}` — kuryer olib
 * tashlandi. Boshqa maydon ham o'zgargan bo'lsa keshlar baribir yangilanadi.
 * Kuryer o'zgarishi bo'lmasa `false` (chaqiruvchi odatiy yo'ldan ketadi).
 */
function applyCourierRemoved(
  queryClient: QueryClient,
  orderId: string,
  rawChanges: unknown,
): boolean {
  if (!isRecord(rawChanges) || !isRecord(rawChanges.courier)) return false;
  const change = rawChanges.courier;
  if (!("to" in change) || change.to !== null) return false;
  patchOrderInCaches(queryClient, orderId, (order) =>
    withZoning(
      { ...order, courier: null },
      { zoneMatch: null, autoAssigned: null },
    ),
  );
  const others = Object.keys(rawChanges).some((key) => key !== "courier");
  scheduleRefresh(queryClient, others ? { allOrders: true } : { lists: true });
  return true;
}

/**
 * `order_change_requested {order_id, request}` — kartaga ochiq so'rov
 * qo'yiladi; `order_change_request_resolved` — belgi tushadi. Qabulda
 * tarkib va summa o'zgaradi: hodisada to'liq buyurtma bo'lsa u qo'yiladi,
 * bo'lmasa ro'yxat va detal fon rejimida qayta so'raladi.
 */
function applyChangeRequestEvent(
  queryClient: QueryClient,
  type: string,
  orderId: string,
  event: SocketEvent,
): void {
  const full = isFullOrderPayload(event.order) ? mapLogistOrder(event.order) : null;
  const request =
    type === "order_change_requested"
      ? (mapChangeRequest(event.request ?? event.change_request) ?? full?.changeRequest ?? null)
      : null;

  patchOrderInCaches(queryClient, orderId, (order) =>
    full
      ? { ...full, changeRequest: request, acknowledgedBy: full.acknowledgedBy ?? order.acknowledgedBy }
      : { ...order, changeRequest: request },
  );
  void queryClient.invalidateQueries({ queryKey: ["orders", "change-requests", orderId] });
  if (type === "order_change_request_resolved") {
    // Qabul summani o'zgartirgan bo'lishi mumkin — detal va tarix yangilansin.
    void queryClient.invalidateQueries({ queryKey: ["orders", "detail", orderId] });
    scheduleRefresh(queryClient, { lists: true });
  }
}

/**
 * Bitta buyurtmani doskadagi nusxalarida joyida yangilaydi; ro'yxatlar va
 * ochiq detal eskirgan deb belgilanadi (fon oynada so'rovsiz).
 */
function patchOrder(
  queryClient: QueryClient,
  orderId: string,
  update: (order: LogistOrder) => LogistOrder,
): void {
  const boards = queryClient.getQueriesData<OrdersBoard<LogistOrder>>({
    queryKey: ["orders", "board"],
  });

  for (const [key, board] of boards) {
    if (!isOrdersBoard(board)) continue;
    const next = patchColumns(board, orderId, update);
    if (next !== board) queryClient.setQueryData(key, next);
  }

  scheduleRefresh(queryClient, { lists: true });
}

/**
 * Kartochkani **refetchsiz** hamma keshda yamaydi: doska, ro'yxat sahifalari
 * va detal. Faqat o'z hodisasi bo'lgan, tarkibni o'zgartirmaydigan belgilar
 * uchun ("Oldim") — status/summa kabi narsalar uchun `patchOrder` ishlatiladi.
 */
export function patchOrderInCaches(
  queryClient: QueryClient,
  orderId: string,
  update: (order: LogistOrder) => LogistOrder,
): void {
  for (const [key, board] of queryClient.getQueriesData<OrdersBoard<LogistOrder>>({
    queryKey: ["orders", "board"],
  })) {
    if (!isOrdersBoard(board)) continue;
    const next = patchColumns(board, orderId, update);
    if (next !== board) queryClient.setQueryData(key, next);
  }

  queryClient.setQueryData<LogistOrderDetail>(["orders", "detail", orderId], (current) =>
    current ? { ...current, order: update(current.order) } : current,
  );

  // Ro'yxat kaliti `["orders", filters]` — shakli bo'yicha taniladi.
  for (const [key, data] of queryClient.getQueriesData<InfiniteData<LogistOrdersPage>>({
    queryKey: ["orders"],
  })) {
    if (!data || !Array.isArray(data.pages)) continue;
    if (!data.pages.every((page) => Array.isArray(page?.orders))) continue;
    let touched = false;
    const pages = data.pages.map((page) => {
      if (!page.orders.some((order) => order.id === orderId)) return page;
      touched = true;
      return {
        ...page,
        orders: page.orders.map((order) => (order.id === orderId ? update(order) : order)),
      };
    });
    if (touched) queryClient.setQueryData(key, { ...data, pages });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Birlashtirilgan yangilash
// ─────────────────────────────────────────────────────────────────────────────

type RefreshRequest = {
  /** Aniq doska kalitlari. */
  boards?: QueryKey[];
  /** Doskadan tashqari buyurtma keshlari: ro'yxat, detal, tarix. */
  lists?: boolean;
  /** Butun `orders` ildizi (doska ham). */
  allOrders?: boolean;
};

type PendingRefresh = {
  boards: Map<string, QueryKey>;
  lists: boolean;
  allOrders: boolean;
  timer: ReturnType<typeof setTimeout>;
};

/** Bir hodisa to'lqini (tasdiq + status + to'lov) shu oynada birlashadi. */
export const REFRESH_COALESCE_MS = 150;

const pending = new WeakMap<QueryClient, PendingRefresh>();

/** Tarkibi keshda o'zgarmaydigan yoki o'z hodisasi bor keshlar. */
function isListLike(query: Query): boolean {
  const segment = query.queryKey[1];
  return (
    segment !== "board" && segment !== "preview" && segment !== "comments"
  );
}

export function scheduleRefresh(
  queryClient: QueryClient,
  request: RefreshRequest,
): void {
  let entry = pending.get(queryClient);
  if (!entry) {
    entry = {
      boards: new Map(),
      lists: false,
      allOrders: false,
      timer: setTimeout(() => flushRefresh(queryClient), REFRESH_COALESCE_MS),
    };
    pending.set(queryClient, entry);
  }
  for (const key of request.boards ?? []) {
    entry.boards.set(JSON.stringify(key), key);
  }
  entry.lists ||= Boolean(request.lists);
  entry.allOrders ||= Boolean(request.allOrders);
}

/**
 * Keshni yangilaydi — lekin ko'rinmayotgan oynada so'rov yubormaydi.
 *
 * Fon oynadagi panel filialdagi har bir hodisada tarmoqqa chiqmasligi kerak:
 * kesh "eskirgan" deb belgilanadi, foydalanuvchi qaytganda React Query uni
 * o'zi yangilaydi (`refetchOnWindowFocus`).
 */
function flushRefresh(queryClient: QueryClient): void {
  const entry = pending.get(queryClient);
  pending.delete(queryClient);
  if (!entry) return;

  const hidden = typeof document !== "undefined" && document.hidden;
  const refetchType = hidden ? "none" : "active";

  if (entry.allOrders) {
    void queryClient.invalidateQueries({ queryKey: ["orders"], refetchType });
    return;
  }
  for (const key of entry.boards.values()) {
    void queryClient.invalidateQueries({ queryKey: key, exact: true, refetchType });
  }
  if (entry.lists) {
    void queryClient.invalidateQueries({
      queryKey: ["orders"],
      predicate: isListLike,
      refetchType,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Kim qilgani
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kim qilgani. Yangi `changed_by_info {type,id,name}` obyekti ustun; eski
 * `changed_by` — satr (ism yoki `null`: webhook/Celery), §5.4 / §9.2.
 * `order_confirmed` da `by` — TUR (`client`…), ism emas.
 */
export function eventActor(payload: SocketEvent): string | null {
  const info = isRecord(payload.changed_by_info) ? payload.changed_by_info : null;
  const name = info ? asString(info.name).trim() : "";
  if (name) return name;
  if (typeof payload.changed_by === "string" && payload.changed_by.trim()) {
    return payload.changed_by.trim();
  }
  if (isRecord(payload.by)) {
    return asString(payload.by.name ?? payload.by.full_name).trim() || null;
  }
  if (typeof payload.by === "string" && payload.by.trim()) {
    return confirmedByLabel(payload.by) || null;
  }
  return null;
}
