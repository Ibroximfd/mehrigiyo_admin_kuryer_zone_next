import { api, ApiError, type QueryValue } from "@/lib/api-client";
import {
  isEndpointMissing,
  isKnownMissing,
  markEndpointMissing,
} from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { buildDateParams, type DateFilter } from "@/lib/list-filters";
import { asPage } from "@/lib/paginate";
import {
  asArray,
  asOptionalNumber,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";
import { useAuthStore } from "@/stores/auth-store";

import { BOARD_LIMIT, mapOrdersBoard } from "./board";
import { isValidOrdering } from "./order-sort";
import { DEFAULT_ORDERING } from "./ordering";
import { WARNING_ZONE_MISMATCH, countWarning, patchWarningCodes } from "./assign-warnings";
import { isStatusOnlyPatch, serializeOrderPatch, withoutPaymentKeys } from "./order-patch";
import type { LogistOrderPatch } from "./order-patch";
import { mapChangeRequestList } from "./change-request";
import type { ChangeRequest } from "./change-request";
import { mapTimeline } from "./timeline";
import type { TimelineItem } from "./timeline";
import type { OrdersBoard } from "./board";
import {
  LOGIST_STATUSES,
  mapAcks,
  mapLogistOrder,
  mapOrderAudit,
  mapPersonRef,
  normalizeStatus,
  UNKNOWN_STATUS,
  type DeliveryAttemptReason,
  type LogistOrder,
  type LogistOrderDetail,
  type LogistOrdersPage,
  type OrderAck,
  type PersonRef,
} from "./types";

/**
 * Logist buyurtma so'rovlari — `BACKEND-LOGIST.md` §3 kontrakti.
 *
 * Backend bosqichma-bosqich chiqadi, shuning uchun har bir o'qish yo'li
 * zaxiraga ega (LOGIST-PLAN §13.5):
 *
 *   doska:   logist board → status-bo'yicha parallel ro'yxatlar
 *   ro'yxat: logist list  → admin list (admin akkauntda) → my-orders
 *
 * Endpoint yo'qligi bir marta aniqlangach sessiya davomida eslab qolinadi
 * (`api-availability.ts`) — har renderda 404 ga urilmaymiz. Yozuv amallari
 * (PATCH, bulk, attempt) zaxirasiz: kontrakt endpointi bo'lmasa xato
 * `endpoint_missing` kodi bilan ko'tariladi va UI yumshoq xabar ko'rsatadi.
 */

const MISSING_BOARD = "logist-orders-board";
const MISSING_LIST = "logist-orders-list";

/** Backend chiqarmagan funksiya uchun bir xil ko'rinishdagi xato. */
function notReadyError(): ApiError {
  return new ApiError(
    "Bu amal uchun backend hali chiqmagan — logist endpointlari kutilmoqda",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

function isAdminUser(): boolean {
  return useAuthStore.getState().user?.isAdmin ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtrlar
// ─────────────────────────────────────────────────────────────────────────────

export type OrdersQuery = DateFilter & {
  /**
   * `?ordering=` — oq ro'yxatdan (2026-10-01 C §8.1): `created_at`,
   * `total_amount`, `id`, `status_changed_at`, `delivery_date` (minus bilan).
   * Imlosi xato qiymat yuborilmaydi — server uni jimgina sukutga tushirardi.
   */
  ordering?: string | null;
  /** Mashina statuslari, masalan `['confirmed', 'shipping']` */
  statuses?: string[];
  /** Raqam / telefon / manzil bo'yicha. */
  search?: string | null;
  /**
   * Kuryer bo'yicha filtr. `"none"` — kuryeri YO'Q buyurtmalar
   * (2026-10-01 C §11.3; `0` bu emas — u bo'sh natija beradi).
   */
  courierId?: number | "none" | null;
  /**
   * Bosh kuryer: id yoki `"none"` — bosh kuryerga berilmagan (backend
   * 2026-10-30 javoblari §2, `?chief=`).
   */
  chief?: number | "none" | null;
  /** «Jarayonda»: `true` — faqat jarayondagilar, `false` — ularsiz (`?in_review=`). */
  inReview?: boolean | null;
  /** Doska: faqat shu ustunlar yuklanadi (`?columns=shipping,review`). */
  columns?: string[];
  /** Kanal: mehrigiyo / doctor_ali / sino_ai / operator. */
  source?: string | null;
  /**
   * Teg bo'yicha filtr (§4.13). Server qo'llab-quvvatlasa butun to'plam
   * bo'yicha filtrlaydi; qo'llamasa ro'yxat yuklangan qatorlar ustida
   * qo'shimcha ravishda klientda ham suziladi.
   */
  tag?: string | null;
  /**
   * Kiruvchi o'tkazish takliflari (A-oqim, §4.8 / S6 qarori):
   * `transfer=incoming` — boshqa filial bizga taklif qilgan buyurtmalar.
   * Ular hali bizning filialimizga tegishli emas, shuning uchun oddiy
   * ro'yxat va doskaga tushmaydi.
   */
  transfer?: "incoming" | null;
  /**
   * To'lov holati bo'yicha (backend §3.1). `null` — filtrsiz.
   *
   * Server qat'iy o'qiydi: `true/1/yes` yoki `false/0/no`; boshqa qiymat
   * jimgina e'tiborsiz qoladi (`status` filtridagidek, `400` emas).
   */
  isPaid?: boolean | null;
  /**
   * To'lov turlari — vergul bilan yuboriladi (`payment_method=cash,manual`).
   * Noto'g'ri kalitlarni server o'zi tashlaydi.
   */
  paymentMethods?: string[];
  /**
   * To'lov holati (§11.2): `paid` · `unpaid` · `refunded`. `unpaid` dan
   * qaytarilganlar server tomonda chiqarib tashlangan (§11.3).
   */
  paymentStates?: string[];
  /** Kim yaratgan (§11.3): `operator`, `admin`, `doctor`, `client`, `reception`, `sino_ai`. */
  createdByKinds?: string[];
  /** Mijozda ishlaydigan ilova bormi (§11.3); `null` — filtrsiz. */
  hasApp?: boolean | null;
  /** Yetkazish sanasi bucketi: `today` · `tomorrow` · `overdue` · `none`. */
  deliveryDate?: string | null;
  /** Viloyat ENUM kodlari (manzil matni emas). */
  regions?: string[];
  /** Muddati o'tganlar (`delivery_date=overdue` bilan bir xil shart). */
  overdue?: boolean | null;
  /** Tuman kodlari (`fargona/qoqon_sh`) — `?district=a,b`. */
  districts?: string[];
  /**
   * Zonalar: id lar (`?zone=7,8`) yoki `"none"` — "Hududi noma'lum"
   * savati (`?zone=none`).
   */
  zones?: number[] | "none";
  /** `yes` — taklifi bor; `none` — taklifsiz (`?suggested=`). */
  suggested?: "yes" | "none" | null;
  /** `review` — manzili aniqlashtirish kerak (`?geocode=review`, JAVOBLAR_2 B4). */
  geocode?: "review" | null;
  page?: number;
  pageSize?: number;
};

/** `delivery_date` bucketlari — boshqa qiymat yuborilmaydi (§11.2). */
const DELIVERY_DATE_BUCKETS = new Set(["today", "tomorrow", "overdue", "none"]);

/** Bo'sh bo'lmagan, takrorsiz qiymatlar — vergul bilan. */
function csv(values: readonly string[] | undefined): string | null {
  const clean = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  return clean.length ? clean.join(",") : null;
}

/**
 * Ro'yxat ham, doska ham qo'llaydigan filtrlar.
 *
 * Sana qoidalari `lib/list-filters.ts` da — CRM bilan bir xil:
 * `date` > `date_from`/`date_to` > `period`.
 */
export function buildOrderFilters(
  query: OrdersQuery,
): Record<string, QueryValue> {
  const {
    search,
    ordering,
    courierId,
    chief,
    inReview,
    source,
    transfer,
    tag,
    isPaid,
    paymentMethods,
    paymentStates,
    createdByKinds,
    hasApp,
    deliveryDate,
    regions,
    overdue,
    districts,
    zones,
    suggested,
    geocode,
  } = query;

  const params: Record<string, QueryValue> = { ...buildDateParams(query) };

  if (search?.trim()) params.search = search.trim();
  // Tartib serverda (§8) — mijoz javobni qayta saralamaydi.
  params.ordering = isValidOrdering(ordering) ? ordering : DEFAULT_ORDERING;
  if (courierId === "none") params.courier = "none";
  else if (courierId) params.courier = courierId;
  if (chief === "none") params.chief = "none";
  else if (chief) params.chief = chief;
  if (typeof inReview === "boolean") params.in_review = inReview ? "1" : "0";
  if (source?.trim()) params.source = source.trim();
  if (transfer) params.transfer = transfer;
  // `?tags=` bo'sh yuborilsa javob BO'SH ro'yxat (§11.3) — faqat qiymat bilan.
  if (tag?.trim()) params.tags = tag.trim();
  // Satr sifatida — server `true`/`false` kalit so'zlarini kutadi.
  if (typeof isPaid === "boolean") params.is_paid = isPaid ? "true" : "false";
  const methods = csv(paymentMethods);
  if (methods) params.payment_method = methods;
  const states = csv(paymentStates);
  if (states) params.payment_state = states;
  const creators = csv(createdByKinds);
  if (creators) params.created_by_kind = creators;
  if (typeof hasApp === "boolean") params.has_app = hasApp ? "true" : "false";
  if (deliveryDate && DELIVERY_DATE_BUCKETS.has(deliveryDate)) {
    params.delivery_date = deliveryDate;
  }
  const regionKeys = csv(regions);
  if (regionKeys) params.region = regionKeys;
  if (typeof overdue === "boolean") params.overdue = overdue ? "true" : "false";
  const districtKeys = csv(districts);
  if (districtKeys) params.district = districtKeys;
  const zoneParam = zonesParam(zones);
  if (zoneParam) params.zone = zoneParam;
  if (suggested === "yes" || suggested === "none") params.suggested = suggested;
  if (geocode === "review") params.geocode = "review";

  return params;
}

/** `?zone=` qiymati: `none` yoki takrorsiz musbat id lar. */
export function zonesParam(zones: OrdersQuery["zones"]): string | null {
  if (zones === "none") return "none";
  const ids = [...new Set((zones ?? []).filter((id) => Number.isInteger(id) && id > 0))];
  return ids.length ? ids.join(",") : null;
}

/** Sahifalangan ro'yxat uchun so'rov parametrlari. */
export function buildOrdersQuery(
  query: OrdersQuery,
): Record<string, QueryValue> {
  const { statuses = [], page = 1, pageSize = 20 } = query;

  const params: Record<string, QueryValue> = {
    ...buildOrderFilters(query),
    page,
    page_size: pageSize,
  };

  // Status tanlanmagan bo'lsa ham `pending` so'ralmaydi — logist faqat
  // tasdiqlangandan keyingi bosqichlarni ko'radi (2026-10-29).
  const canonical = canonicalStatuses(statuses);
  params.status = (canonical.length ? canonical : LOGIST_STATUSES.map((status) => status.value)).join(",");

  return params;
}

/**
 * Filtrdagi statuslar — faqat kanonik beshtasi. Eski URL/xatcho'pdagi
 * `confirming`/`paid`/`preparing` serverga ketsa `400 status_deprecated`
 * (2026-10-01 §2.3) va butun ro'yxat yiqiladi — ular o'rinbosariga
 * o'giriladi, notanishi tashlanadi.
 */
export function canonicalStatuses(statuses: readonly string[]): string[] {
  const result: string[] = [];
  for (const raw of statuses) {
    const status = normalizeStatus(raw);
    if (status === UNKNOWN_STATUS || status === "pending") continue;
    if (!result.includes(status)) result.push(status);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish: ro'yxat
// ─────────────────────────────────────────────────────────────────────────────

function toOrdersPage(raw: unknown): LogistOrdersPage {
  const page = asPage(raw);
  const orders = page.items.map(mapLogistOrder);

  const meta = asRecord(raw);

  return {
    orders,
    totalCount: page.total ?? orders.length,
    hasNextPage: page.hasMore,
    // Konvertsiz javobda (massiv) summa ham bo'lmaydi.
    totalAmount: asOptionalNumber(meta.total_amount),
    totalPayableAmount: asOptionalNumber(meta.total_payable_amount),
    totalUnpaidAmount: asOptionalNumber(meta.total_unpaid_amount),
  };
}

/** Zaxira tartibi bilan ro'yxat endpointini tanlaydi. */
function listEndpoint(): string {
  if (!isKnownMissing(MISSING_LIST)) return ENDPOINTS.logistOrders;
  return isAdminUser() ? ENDPOINTS.adminOrders : ENDPOINTS.myOrders;
}

/** Bo'sh sahifa — zaxira yo'l javob bera olmaydigan so'rovlar uchun. */
const EMPTY_PAGE: LogistOrdersPage = {
  orders: [],
  totalCount: 0,
  hasNextPage: false,
  totalAmount: null,
  totalPayableAmount: null,
  totalUnpaidAmount: null,
};

export async function fetchOrders(
  query: OrdersQuery = {},
  signal?: AbortSignal,
): Promise<LogistOrdersPage> {
  const path = listEndpoint();

  /*
   * `transfer=incoming` — faqat logist endpointi tushunadigan filtr (§4.8).
   * Zaxira yo'l (admin/my-orders) uni e'tiborsiz qoldiradi va **butun**
   * ro'yxatni qaytaradi, ya'ni har bir buyurtma "kiruvchi taklif" bo'lib
   * ko'rinardi. Shuning uchun bunday holatda javob bo'sh: takliflar yo'q.
   */
  if (query.transfer && path !== ENDPOINTS.logistOrders) return EMPTY_PAGE;

  try {
    const raw = await api.get<unknown>(path, {
      searchParams: buildOrdersQuery(query),
      signal,
      fallbackError: "Buyurtmalarni yuklashda xatolik",
    });
    return toOrdersPage(raw);
  } catch (error) {
    // Logist endpointi hali yo'q — belgilab, zaxira bilan qaytaramiz.
    if (path === ENDPOINTS.logistOrders && isEndpointMissing(error)) {
      markEndpointMissing(MISSING_LIST);
      return fetchOrders(query, signal);
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish: doska
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Doskani status-bo'yicha parallel ro'yxatlar bilan yig'ish — ikki holatda:
 * board endpointi yo'q (eski deploy) yoki u `5xx` bilan yiqildi
 * (2026-10-01 C §15.2: bitta mijozsiz buyurtma butun javobni yiqitadi).
 * Ustunlar mustaqil: yiqilgani bo'sh qoladi va `failedStatuses` da
 * aytiladi, qolganlari chiziladi. Hammasi yiqilsa — xato.
 */
async function fetchBoardByColumns(
  query: OrdersQuery,
  signal?: AbortSignal,
): Promise<OrdersBoard<LogistOrder>> {
  const results = await Promise.allSettled(
    LOGIST_STATUSES.map((status) =>
      fetchOrders({ ...query, statuses: [status.value], pageSize: BOARD_LIMIT }, signal),
    ),
  );

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length === results.length) throw (failed[0] as PromiseRejectedResult).reason;

  const failedStatuses: string[] = [];
  const columns = LOGIST_STATUSES.map((status, index) => {
    const result = results[index];
    if (result.status === "rejected") failedStatuses.push(status.value);
    const page = result.status === "fulfilled" ? result.value : EMPTY_PAGE;
    return {
      status: status.value as string,
      label: status.label as string,
      color: status.color as string,
      mark: status.mark as string,
      count: page.totalCount,
      totalAmount: page.totalPayableAmount ?? page.totalAmount,
      // Server tartibida (`ordering` so'rovda) — qayta saralanmaydi.
      orders: page.orders,
    };
  });

  return failedStatuses.length ? { columns, failedStatuses } : { columns };
}

/** `5xx` — server ichki xatosi (§15.2), endpoint yo'qligi emas. */
function isServerError(error: unknown): boolean {
  return error instanceof ApiError && (error.status ?? 0) >= 500;
}

export async function fetchOrdersBoard(
  query: OrdersQuery = {},
  signal?: AbortSignal,
): Promise<OrdersBoard<LogistOrder>> {
  // Logist doskasi hali yo'q, lekin admin doskasi bor bo'lishi mumkin.
  if (isKnownMissing(MISSING_BOARD)) {
    if (isAdminUser()) {
      try {
        const raw = await api.get<unknown>(ENDPOINTS.adminOrdersBoard, {
          searchParams: { ...buildOrderFilters(query), limit: BOARD_LIMIT },
          signal,
          fallbackError: "Doskani yuklashda xatolik",
        });
        return mapOrdersBoard(raw, mapLogistOrder);
      } catch (error) {
        if (!isEndpointMissing(error)) throw error;
      }
    }
    return fetchBoardByColumns(query, signal);
  }

  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistOrdersBoard, {
      // Yashirilgan ustunlar so'ralmaydi (backend 2026-10-30 §1, `?columns=`).
      searchParams: { ...buildOrderFilters(query), limit: BOARD_LIMIT, columns: csv(query.columns) },
      signal,
      fallbackError: "Doskani yuklashda xatolik",
    });
    return mapOrdersBoard(raw, mapLogistOrder);
  } catch (error) {
    if (isEndpointMissing(error)) {
      markEndpointMissing(MISSING_BOARD);
      return fetchOrdersBoard(query, signal);
    }
    // Ma'lum backend xatosi (§15.2) — ekran bo'sh qolmasin: ustunma-ustun.
    if (isServerError(error) && !signal?.aborted) {
      return fetchBoardByColumns(query, signal);
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish: detal
// ─────────────────────────────────────────────────────────────────────────────

/** Javob `{success, order, audit}` — yagona shaklga keltiramiz. */
function toDetail(raw: unknown): LogistOrderDetail {
  const json = asRecord(raw);
  return {
    order: mapLogistOrder(isRecord(json.order) ? json.order : raw),
    audit: asArray(json.audit).map(mapOrderAudit),
  };
}

export async function fetchOrderDetail(
  id: string,
  signal?: AbortSignal,
): Promise<LogistOrderDetail> {
  const primary = !isKnownMissing(MISSING_LIST);
  const path = primary
    ? ENDPOINTS.logistOrderDetail(id)
    : isAdminUser()
      ? ENDPOINTS.adminOrderDetail(id)
      : ENDPOINTS.operatorOrderDetail(id);

  try {
    const raw = await api.get<unknown>(path, {
      signal,
      fallbackError: "Buyurtmani yuklashda xatolik",
    });
    return toDetail(raw);
  } catch (error) {
    if (primary && isEndpointMissing(error)) {
      markEndpointMissing(MISSING_LIST);
      return fetchOrderDetail(id, signal);
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Yozish: status / kuryer / yetkazish maydonlari (§3 PATCH)
// ─────────────────────────────────────────────────────────────────────────────

export type { LogistOrderPatch } from "./order-patch";

export async function updateOrder(
  id: string,
  patch: LogistOrderPatch,
): Promise<LogistOrder> {
  return (await updateOrderWithWarning(id, patch)).order;
}

/**
 * PATCH natijasi + serverning bloklamaydigan ogohlantirishlari (backend A2):
 * `warnings: ["courier_off_shift", "zone_mismatch"]`; eski `warning` —
 * birinchisi. Biriktirish baribir bajarilgan.
 */
export type OrderPatchResult = {
  order: LogistOrder;
  /** Birinchi ogohlantirish (eski maydon); yo'q bo'lsa `null`. */
  warning: string | null;
  warnings: string[];
};

/**
 * Yakunlangan (`delivered`/`cancelled`) zakazda kuryerga yozilgan manzil
 * sonini o'zgartirish (2026-10-30 §2.3b) — «atkaz, lekin uyiga borgan».
 * So'nggi qaror ustun; sana — yakunlash kuni.
 */
export async function changeOrderAddresses(
  id: string,
  courierAddresses: number,
  note: string,
): Promise<LogistOrder> {
  const raw = await api.post<unknown>(ENDPOINTS.logistOrderAddresses(id), {
    json: { courier_addresses: courierAddresses, ...(note ? { note } : {}) },
    fallbackError: "Manzil sonini o'zgartirishda xatolik",
  });
  return toDetail(raw).order;
}

export async function updateOrderWithWarning(
  id: string,
  patch: LogistOrderPatch,
): Promise<OrderPatchResult> {
  const json = withoutPaymentKeys(serializeOrderPatch(patch));

  if (!isKnownMissing(MISSING_LIST)) {
    try {
      const raw = await api.patch<unknown>(ENDPOINTS.logistOrderDetail(id), {
        json,
        fallbackError: "Buyurtmani yangilashda xatolik",
      });
      const warnings = patchWarningCodes(asRecord(raw));
      return { order: toDetail(raw).order, warning: warnings[0] ?? null, warnings };
    } catch (error) {
      if (!isEndpointMissing(error)) throw error;
      markEndpointMissing(MISSING_LIST);
    }
  }

  /*
   * Zaxira: admin PATCH faqat statusni tushunadi (sabab maydonlari
   * jimgina tushib qoladi — eski backend ularni bilmaydi). Yetkazish
   * maydonlari eski backendda yo'q — ular so'ralgan bo'lsa yumshoq "hali
   * chiqmagan" xatosi qaytariladi (UI feature-flag sifatida ishlatadi).
   */
  if (!isAdminUser() || !isStatusOnlyPatch(json)) throw notReadyError();

  const raw = await api.patch<unknown>(ENDPOINTS.adminOrderDetail(id), {
    json: { status: patch.status },
    fallbackError: "Statusni o'zgartirishda xatolik",
  });
  return { order: toDetail(raw).order, warning: null, warnings: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Yozish: ommaviy amallar (§5.1)
// ─────────────────────────────────────────────────────────────────────────────

export type BulkAction =
  | { action: "assign_courier"; courierId: number }
  /** Bosh kuryerga berish (backend 2026-10-30 §2): `confirmed` → `shipping`. */
  | { action: "assign_chief"; chiefCourierId: number }
  | {
      action: "set_status";
      status: string;
      /** `pending → confirmed` uchun majburiy — butun to'plamga BITTA (§5.1). */
      confirmReason?: string;
      note?: string;
    };

export type BulkResult = {
  applied: string[];
  failed: Array<{ id: string; code: string }>;
  /**
   * Qo'llangan, lekin ogohlantirishli buyurtmalar (backend #16, A2):
   * `zone_mismatch` — kuryer buyurtma zonasidan emas, `courier_off_shift` —
   * kuryer smenada emas. Har ogohlantirish alohida qator.
   */
  warnings: Array<{ id: string; warning: string }>;
};

/** `POST orders/bulk/` javobi — `{applied, failed, warnings}`. */
export function mapBulkResult(raw: unknown): BulkResult {
  const record = asRecord(raw);
  return {
    applied: asArray(record.applied).map((value) => asString(value)),
    failed: asArray(record.failed).map((item) => {
      const failure = asRecord(item);
      return { id: asString(failure.id), code: asString(failure.code) };
    }),
    warnings: asArray(record.warnings).map((item) => {
      const warning = asRecord(item);
      return { id: asString(warning.id), warning: asString(warning.warning) };
    }),
  };
}

/** Kuryer zonasi mos kelmagan buyurtmalar soni. */
export function zoneMismatchCount(result: Pick<BulkResult, "warnings">): number {
  return countWarning(result.warnings, WARNING_ZONE_MISMATCH);
}

/** Bir so'rovdagi chegara — kontrakt (§4.5.1) 100 ta bilan cheklaydi. */
const BULK_CHUNK = 100;

async function bulkChunk(
  orderIds: string[],
  action: BulkAction,
): Promise<BulkResult> {
  const json: Record<string, unknown> = {
    order_ids: orderIds,
    action: action.action,
  };
  if (action.action === "assign_courier") json.courier_id = action.courierId;
  if (action.action === "assign_chief") json.chief_courier_id = action.chiefCourierId;
  if (action.action === "set_status") {
    json.status = action.status;
    if (action.confirmReason) json.confirm_reason = action.confirmReason;
    if (action.note) json.note = action.note;
  }

  try {
    const raw = await api.post<unknown>(ENDPOINTS.logistOrdersBulk, {
      json,
      fallbackError: "Ommaviy amalda xatolik",
    });
    return mapBulkResult(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/**
 * Ommaviy amal (§4.5.1) — qisman muvaffaqiyat modeli bilan.
 *
 * Tanlov 100 tadan oshsa so'rov **ketma-ket** bo'laklarga bo'linadi:
 * server chegarasi shu (aks holda butun amal rad etiladi), parallel
 * yuborish esa bitta filialda 100+ yozuvni bir vaqtda qulflab, backendni
 * bekorga qiynaydi. Natijalar bitta javobga birlashtiriladi — chaqiruvchi
 * bo'laklarni umuman bilmaydi.
 */
export async function bulkOrders(
  orderIds: string[],
  action: BulkAction,
): Promise<BulkResult> {
  if (orderIds.length <= BULK_CHUNK) return bulkChunk(orderIds, action);

  const result: BulkResult = { applied: [], failed: [], warnings: [] };
  for (let index = 0; index < orderIds.length; index += BULK_CHUNK) {
    const chunk = await bulkChunk(
      orderIds.slice(index, index + BULK_CHUNK),
      action,
    );
    result.applied.push(...chunk.applied);
    result.failed.push(...chunk.failed);
    result.warnings.push(...chunk.warnings);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yozish: "yetkazib bo'lmadi" (§5.3)
// ─────────────────────────────────────────────────────────────────────────────

export async function createDeliveryAttempt(
  orderId: string,
  input: { reason: DeliveryAttemptReason; note?: string | null },
): Promise<void> {
  try {
    await api.post(ENDPOINTS.logistDeliveryAttempts(orderId), {
      json: { reason: input.reason, note: input.note ?? "" },
      fallbackError: "Urinishni belgilashda xatolik",
    });
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Yozish: buyurtmani boshqa filialga o'tkazish (A-oqim, §8)
// ─────────────────────────────────────────────────────────────────────────────

export async function requestOrderTransfer(
  orderId: string,
  input: { toFilialId: number; reason: string },
): Promise<void> {
  try {
    await api.post(ENDPOINTS.logistOrderTransfer(orderId), {
      json: { to_filial_id: input.toFilialId, reason: input.reason },
      fallbackError: "O'tkazish so'rovida xatolik",
    });
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

export async function acceptOrderTransfer(orderId: string): Promise<void> {
  try {
    await api.post(ENDPOINTS.logistOrderTransferAccept(orderId), {
      fallbackError: "Qabul qilishda xatolik",
    });
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

export async function rejectOrderTransfer(
  orderId: string,
  reason: string,
): Promise<void> {
  try {
    await api.post(ENDPOINTS.logistOrderTransferReject(orderId), {
      json: { reason },
      fallbackError: "Rad etishda xatolik",
    });
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish: tarix lentasi (`03` §5.2)
// ─────────────────────────────────────────────────────────────────────────────

const MISSING_TIMELINE = "logist-order-timeline";

/**
 * Buyurtma tarixi. Endpoint hali yo'q bo'lsa `null` — chaqiruvchi lentani
 * audit, izohlar va urinishlardan o'zi yig'adi (`buildFallbackTimeline`).
 */
export async function fetchOrderTimeline(
  orderId: string,
  signal?: AbortSignal,
): Promise<TimelineItem[] | null> {
  if (isKnownMissing(MISSING_TIMELINE)) return null;
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistOrderTimeline(orderId), {
      searchParams: { limit: 100 },
      signal,
      fallbackError: "Tarixni yuklashda xatolik",
    });
    return mapTimeline(raw);
  } catch (error) {
    if (isEndpointMissing(error)) {
      markEndpointMissing(MISSING_TIMELINE);
      return null;
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Narx preview (`POST /operator/orders/preview/`) — pul serverda hisoblanadi
// ─────────────────────────────────────────────────────────────────────────────

const MISSING_PREVIEW = "orders-preview";

export type OrderPreview = { totalAmount: number; payableAmount: number };

/**
 * Tahrir oynasidagi tarkib uchun server narxi. Endpoint yo'q bo'lsa `null`:
 * UI "summa saqlangach serverda hisoblanadi" deb yozadi — klient pulni
 * o'zi hisoblamaydi.
 */
export async function previewOrderItems(
  items: Array<{ productId: number; quantity: number; isGift: boolean }>,
  signal?: AbortSignal,
): Promise<OrderPreview | null> {
  if (isKnownMissing(MISSING_PREVIEW) || items.length === 0) return null;
  try {
    const raw = await api.post<unknown>(ENDPOINTS.orderPreview, {
      json: {
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          is_gift: item.isGift,
        })),
      },
      signal,
      fallbackError: "Narxni hisoblashda xatolik",
    });
    const json = asRecord(raw);
    const total = asOptionalNumber(json.total_amount);
    if (total === null) return null;
    return {
      totalAmount: total,
      payableAmount: asOptionalNumber(json.payable_amount) ?? total,
    };
  } catch (error) {
    if (isEndpointMissing(error)) {
      markEndpointMissing(MISSING_PREVIEW);
      return null;
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// "Oldim" belgisi va filial operatorlari (backend taklifi — `backend_logist.md`)
// ─────────────────────────────────────────────────────────────────────────────

const MISSING_ACK = "logist-order-ack";
const MISSING_OPERATORS = "logist-operators";

/**
 * Buyurtmani "oldim" deb belgilaydi — filialdagi boshqa logistlar ham
 * ko'radi (WS `order_acknowledged`). Backend hali chiqmagan bo'lsa `null`:
 * chaqiruvchi belgini shu qurilmada saqlaydi (zaxira).
 */
export async function acknowledgeOrder(id: string): Promise<OrderAck[] | null> {
  if (isKnownMissing(MISSING_ACK)) return null;
  try {
    const raw = await api.post<unknown>(ENDPOINTS.logistOrderAck(id), {
      json: {},
      fallbackError: "Belgilab bo'lmadi",
    });
    const record = asRecord(raw);
    return (
      mapAcks(record.acknowledged_by) ??
      mapAcks(asRecord(record.order).acknowledged_by) ??
      []
    );
  } catch (error) {
    if (isEndpointMissing(error)) {
      markEndpointMissing(MISSING_ACK);
      return null;
    }
    throw error;
  }
}

/**
 * Filialdagi sotuvchi operatorlar (komissiya egasini tanlash uchun).
 * Endpoint yo'q yoki ruxsat bo'lmasa `null` — forma buyurtmadagi
 * nomzodlar va qo'lda ID bilan ishlaydi.
 */
export async function fetchBranchOperators(
  signal?: AbortSignal,
): Promise<PersonRef[] | null> {
  if (isKnownMissing(MISSING_OPERATORS)) return null;
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistOperators, {
      signal,
      fallbackError: "Operatorlarni yuklashda xatolik",
    });
    // `{results: [{id, full_name, phone, role, is_active}]}` (2026-10-01 §5.6) —
    // faqat o'z filialining aktiv sotuvchilari; `operator_id` tekshiruvi ham shu ro'yxatdan.
    const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
    return list
      .filter((item) => !isRecord(item) || item.is_active !== false)
      .map(mapPersonRef)
      .filter((person): person is PersonRef => person !== null && person.id !== null);
  } catch (error) {
    if (isEndpointMissing(error) || (error instanceof ApiError && error.status === 403)) {
      markEndpointMissing(MISSING_OPERATORS);
      return null;
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Eshikdagi o'zgarish so'rovlari (`LOGIST_02` §2)
// ─────────────────────────────────────────────────────────────────────────────

/** Buyurtmaning hamma so'rovi — ochig'i birinchi. Endpoint yo'q — bo'sh. */
export async function fetchChangeRequests(
  orderId: string,
  signal?: AbortSignal,
): Promise<ChangeRequest[]> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistOrderChangeRequests(orderId), {
      signal,
      fallbackError: "So'rovlarni yuklashda xatolik",
    });
    return mapChangeRequestList(raw);
  } catch (error) {
    if (isEndpointMissing(error)) return [];
    throw error;
  }
}

/**
 * Qabul — buyurtma server tomonda tahrirlanadi (narx, komissiya, sovg'a),
 * `version` oshadi. Javob — yangilangan `<LogistOrder>` (+ `change_request`).
 *
 * `operatorId` — ilova buyurtmasida komissiya egasi: berilmasa lid egasi
 * olinadi, u ham bo'lmasa `400 operator_required` (so'rov ochiq qoladi).
 */
export async function acceptChangeRequest(
  orderId: string,
  requestId: number,
  input: { note?: string; operatorId?: number | null },
): Promise<LogistOrder> {
  const json: Record<string, unknown> = {};
  if (input.note?.trim()) json.note = input.note.trim();
  if (input.operatorId) json.operator_id = input.operatorId;
  const raw = await api.post<unknown>(
    ENDPOINTS.logistOrderChangeRequestAccept(orderId, requestId),
    { json, fallbackError: "So'rovni qabul qilishda xatolik" },
  );
  return toDetail(raw).order;
}

/** Rad etish — sabab ixtiyoriy, kuryerga push bilan boradi. */
export async function rejectChangeRequest(
  orderId: string,
  requestId: number,
  note: string,
): Promise<void> {
  await api.post(ENDPOINTS.logistOrderChangeRequestReject(orderId, requestId), {
    json: note.trim() ? { note: note.trim() } : {},
    fallbackError: "So'rovni rad etishda xatolik",
  });
}
