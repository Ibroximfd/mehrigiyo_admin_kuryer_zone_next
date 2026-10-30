import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { normalizeStatus } from "@/features/orders/types";
import { asOptionalInt, asString, isRecord } from "@/lib/parse";
import type { SocketEvent } from "@/lib/reconnecting-socket";
import { queryKeys } from "@/lib/query-keys";

import { fetchLeadDetail } from "./api";
import { applyOrderStatus, patchOrderInBoard, placeLead, removeLead } from "./board-ops";
import { asLeadStage, deliveryColumnOf, mapCourier } from "./types";
import type { LeadDetail, LeadStage, PipelineBoard } from "./types";

/**
 * Bitrix oqimi real vaqti (`LOGIST_01` §5). Butun doska qayta so'ralmaydi:
 *
 *   `lead_stage_changed` — karta chiqqan bo'limdan darhol olinadi (tarmoqsiz);
 *     kirgan bo'limga shu lid `leads/{id}/` dan olinib ustun tepasiga qo'yiladi.
 *   `order_status_changed` — Dostavkada shu buyurtma turgan karta yamaladi
 *     (ustun = eng yangi ochiq buyurtma); kuryer hodisalari — kartadagi kuryer.
 *
 * Tarmoqqa chiqadigan ishlar **yig'iladi** (`FLUSH_MS`): bir to'lqindagi
 * o'nta hodisa — bitta tur so'rov. Ketayotgan so'rov bekor qilinmaydi
 * (`cancelRefetch: false`) — tez-tez hodisada so'rovlar bir-birini
 * bo'g'ib, ma'lumot hech qachon yetib kelmay qolmasin. Yashirin oynada
 * tarmoqqa chiqilmaydi: doskalar faqat eskirgan deb belgilanadi va logist
 * qaytganda (`refetchOnWindowFocus`) bir marta yangilanadi.
 *
 * Filtrlangan doskaga (qidiruv) kelgan kartani mijoz tomonda filtrdan
 * o'tkazib bo'lmaydi — o'sha doska fon rejimida yangilanadi.
 */

/** Hodisalar to'lqini shu oynada bitta ishga yig'iladi. */
export const FLUSH_MS = 300;
/** To'lqinda shundan ko'p lid kirsa — har biri emas, doskaning o'zi bir marta. */
export const BURST_LIMIT = 12;
/** Bir vaqtda ochiladigan lid so'rovlari. */
const DETAIL_CONCURRENCY = 4;

type BoardEntry = [QueryKey, PipelineBoard];
type Stage = "delivery" | "base";

type Pending = {
  inserts: Map<number, Stage>;
  refreshLeadDetails: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

const pendingByClient = new WeakMap<QueryClient, Pending>();

function pendingOf(queryClient: QueryClient): Pending {
  let pending = pendingByClient.get(queryClient);
  if (!pending) {
    pending = { inserts: new Map(), refreshLeadDetails: false, timer: null };
    pendingByClient.set(queryClient, pending);
  }
  return pending;
}

function isPipelineBoard(value: unknown): value is PipelineBoard {
  return isRecord(value) && Array.isArray(value.columns) && typeof value.stage === "string";
}

function boardsOf(queryClient: QueryClient, stage: Stage): BoardEntry[] {
  const entries: BoardEntry[] = [];
  for (const [key, board] of queryClient.getQueriesData<PipelineBoard>({
    queryKey: ["pipeline", stage],
  })) {
    if (isPipelineBoard(board)) entries.push([key, board]);
  }
  return entries;
}

function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

/** Bitta doskani fon rejimida yangilash — ketayotgan so'rov kesilmaydi. */
function refreshBoard(queryClient: QueryClient, key: QueryKey): void {
  void queryClient.invalidateQueries(
    {
      queryKey: key,
      exact: true,
      // Yashirin oynada so'rov yo'q — faqat eskirgan belgisi.
      refetchType: isDocumentHidden() ? "none" : "active",
    },
    { cancelRefetch: false },
  );
}

/** Kalitdagi filtr bo'sh — kelgan kartani joyiga qo'yish xavfsiz. */
export function isUnfilteredKey(key: QueryKey): boolean {
  const filters = key[2];
  if (!isRecord(filters)) return true;
  return Object.values(filters).every(
    (value) => value === null || value === undefined || value === "",
  );
}

/** Lid qaysi ustunga tushadi: Dostavkada buyurtma holati, Bazada status id. */
export function columnKeyFor(stage: LeadStage, detail: LeadDetail): string | null {
  if (stage === "delivery") {
    return deliveryColumnOf(detail.lead.orders) ?? detail.lead.deliveryColumn;
  }
  if (stage === "base") {
    return detail.lead.statusId === null ? null : String(detail.lead.statusId);
  }
  return null;
}

function schedule(queryClient: QueryClient): void {
  const pending = pendingOf(queryClient);
  if (pending.timer !== null) return;
  pending.timer = setTimeout(() => {
    pending.timer = null;
    void flush(queryClient);
  }, FLUSH_MS);
}

export function applyLeadStageEvent(queryClient: QueryClient, payload: SocketEvent): void {
  const leadId = asOptionalInt(payload.lead_id);
  if (leadId === null) return;
  const from = asLeadStage(payload.from_stage);
  const to = asLeadStage(payload.to_stage);
  const pending = pendingOf(queryClient);

  // Chiqish — darhol, tarmoqsiz.
  for (const stage of ["delivery", "base"] as const) {
    if (from !== stage) continue;
    for (const [key, board] of boardsOf(queryClient, stage)) {
      const next = removeLead(board, leadId);
      if (next !== board) queryClient.setQueryData(key, next);
    }
  }

  if (to === "delivery" || to === "base") pending.inserts.set(leadId, to);
  else pending.inserts.delete(leadId);
  pending.refreshLeadDetails = true;
  schedule(queryClient);
}

/** Buyurtma hodisasi — Dostavka kartasi joyida yamaladi (tarmoqsiz). */
export function applyPipelineOrderEvent(
  queryClient: QueryClient,
  type: string,
  payload: SocketEvent,
): void {
  const orderId = asString(payload.order_id);
  if (!orderId) return;

  if (type === "order_status_changed") {
    const raw = asString(payload.to_status ?? payload.status);
    if (raw) {
      const status = normalizeStatus(raw);
      for (const [key, board] of boardsOf(queryClient, "delivery")) {
        const next = applyOrderStatus(board, orderId, status);
        if (next !== board) queryClient.setQueryData(key, next);
      }
    }
  }

  // Kuryer bloki hodisada bo'lsa (`CRM_02` §1) — kartadagi kuryer va bosqich.
  const card = isRecord(payload.order) ? payload.order : null;
  const rawCourier =
    "courier" in payload ? payload.courier : card && "courier" in card ? card.courier : undefined;
  if (rawCourier !== undefined) {
    const courier = mapCourier(rawCourier);
    for (const [key, board] of boardsOf(queryClient, "delivery")) {
      const next = patchOrderInBoard(board, orderId, (order) => ({ ...order, courier }));
      if (next !== board) queryClient.setQueryData(key, next);
    }
  }

  pendingOf(queryClient).refreshLeadDetails = true;
  schedule(queryClient);
}

async function flush(queryClient: QueryClient): Promise<void> {
  const pending = pendingOf(queryClient);
  const inserts = [...pending.inserts];
  const refreshDetails = pending.refreshLeadDetails;
  pending.inserts.clear();
  pending.refreshLeadDetails = false;

  if (refreshDetails && !isDocumentHidden()) {
    // Faqat ochiq lid detali (sheet) — yopiqlari keyin ochilganda so'raladi.
    void queryClient.invalidateQueries(
      { queryKey: ["pipeline", "lead"], refetchType: "active" },
      { cancelRefetch: false },
    );
  }
  if (inserts.length === 0) return;

  for (const stage of ["delivery", "base"] as const) {
    const leadIds = inserts.filter(([, target]) => target === stage).map(([id]) => id);
    if (leadIds.length > 0) await insertLeads(queryClient, stage, leadIds);
  }
}

async function insertLeads(queryClient: QueryClient, stage: Stage, leadIds: number[]): Promise<void> {
  const entries = boardsOf(queryClient, stage);
  if (entries.length === 0) return;

  const plain = entries.filter(([key]) => isUnfilteredKey(key));
  for (const [key] of entries) {
    if (!isUnfilteredKey(key)) refreshBoard(queryClient, key);
  }
  if (plain.length === 0) return;

  // Yashirin oyna yoki to'lqin (import, ommaviy amal) — doska bir marta.
  if (isDocumentHidden() || leadIds.length > BURST_LIMIT) {
    for (const [key] of plain) refreshBoard(queryClient, key);
    return;
  }

  const details = await fetchDetails(queryClient, leadIds);
  for (const [key] of plain) {
    const cached = queryClient.getQueryData<PipelineBoard>(key);
    if (!isPipelineBoard(cached)) continue;
    let board: PipelineBoard = cached;
    let missed = false;
    for (const leadId of leadIds) {
      const detail = details.get(leadId);
      const columnKey = detail ? columnKeyFor(stage, detail) : null;
      const next = detail && columnKey ? placeLead(board, { ...detail.lead, stage }, columnKey) : null;
      if (next) board = next;
      else missed = true;
    }
    queryClient.setQueryData(key, board);
    // Kartani joylab bo'lmadi (ruxsat, yangi ustun) — o'sha doska fon rejimida.
    if (missed) refreshBoard(queryClient, key);
  }
}

/** Lid detallari — cheklangan parallel; xato bo'lgani `Map` da bo'lmaydi. */
async function fetchDetails(queryClient: QueryClient, leadIds: number[]): Promise<Map<number, LeadDetail>> {
  const result = new Map<number, LeadDetail>();
  const queue = [...leadIds];
  const worker = async () => {
    for (let leadId = queue.shift(); leadId !== undefined; leadId = queue.shift()) {
      const id = leadId;
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.leadDetail(id),
          queryFn: ({ signal }) => fetchLeadDetail(id, signal),
          staleTime: 0,
          retry: 1,
        });
        result.set(id, detail);
      } catch {
        // Bu lid joylanmaydi — doska fon rejimida to'g'rilanadi.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, leadIds.length) }, worker));
  return result;
}
