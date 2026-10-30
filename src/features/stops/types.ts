import { parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Manzil — birlashtirilgan yetkazish birligi (backendda `stop`,
 * `LOGIST_03`, 7-reliz; UI da 2026-10-29 dan «Manzillar»).
 *
 * Bir mijoz bir manzilga ikki zakaz bersa kuryer **bir marta** boradi.
 * Buyurtmalar birlashtirilmaydi (to'lov, komissiya, tarix — har birida),
 * faqat yetkazish birligi bitta. Qoida: bir kuryer + bir kun + bir manzil
 * (≤ 50 m), hammasi ochiq. Kuryer haqi to'xtash bo'yicha: 1 manzil = 1 to'lov.
 */
export type StopStatus = "open" | "delivered" | "cancelled";

export const STOP_STATUS_FILTERS = [
  { value: "open", label: "Ochiq" },
  { value: "delivered", label: "Yetkazilgan" },
  { value: "cancelled", label: "Tarqatilgan" },
  { value: "all", label: "Hammasi" },
] as const;

export type StopStatusFilter = (typeof STOP_STATUS_FILTERS)[number]["value"];

export type StopCourier = { id: number | null; fullName: string };

export type DeliveryStop = {
  id: number;
  status: StopStatus | string;
  /** `YYYY-MM-DD`. */
  date: string;
  addressText: string;
  lat: number | null;
  lng: number | null;
  courier: StopCourier | null;
  orderIds: string[];
  orderNumbers: string[];
  ordersCount: number;
  openCount: number;
  payableTotal: number;
  deliveredAt: Date | null;
};

/**
 * Taklif nimaga asoslangan (2026-10-29): `phone_address` — manzil ham,
 * mijoz telefoni ham bir xil (asosiy, ogohlantirish bilan); `address` —
 * eski qoida (bir kuryer + bir kun + bir manzil).
 */
export type SuggestionMatch = "phone_address" | "address";

/** Avto-taklif: birlashtirsa bo'ladigan guruh (hali manzil emas). */
export type StopSuggestion = {
  courier: StopCourier | null;
  date: string;
  addressText: string;
  orderIds: string[];
  orderNumbers: string[];
  match: SuggestionMatch;
  clientName: string | null;
  clientPhone: string | null;
  /**
   * Zakazlar bitta kuryerda emas (yoki kuryersiz) — birlashtirishdan oldin
   * logist bitta kuryer biriktiradi. Server `couriers_differ: true` beradi.
   */
  couriersDiffer: boolean;
};

/** Taklifni darhol birlashtirib bo'lmasa — sababi; bo'lsa `null`. */
export function suggestionBlocker(suggestion: Pick<StopSuggestion, "couriersDiffer" | "courier">): string | null {
  if (suggestion.couriersDiffer) return "Zakazlar har xil kuryerda — avval bitta kuryer biriktiring";
  if (suggestion.courier === null) return "Zakazlarga avval kuryer biriktiring";
  return null;
}

export type PayRateEntry = {
  perStop: number;
  effectiveFrom: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: Date | null;
};

export type PayRate = {
  /** So'm / to'xtash; belgilanmagan — `0` (hisob chiqmaydi, hech narsa buzilmaydi). */
  perStop: number;
  /** Faqat bosh filial logisti tahrirlaydi (`403 main_filial_only`). */
  canEdit: boolean;
  history: PayRateEntry[];
};

const STOP_STATUS_LABELS: Record<StopStatus, string> = {
  open: "Ochiq",
  delivered: "Yetkazilgan",
  cancelled: "Tarqatilgan",
};

export function stopStatusLabel(status: string): string {
  return STOP_STATUS_LABELS[status as StopStatus] ?? status;
}

/**
 * Kuryer to'xtashni yopdi, lekin band buyurtma (ochiq o'zgarish so'rovi
 * yoki jonli onlayn to'lov) o'tkazib yuborildi — to'xtash `open` qoladi,
 * qolgani alohida `deliver/` bilan yopiladi (`LOGIST_03` §0, v2).
 * Qaytaradi: nechtasi yopilgan / nechtasi qolgan; qisman bo'lmasa `null`.
 */
export function partialStopProgress(
  stop: Pick<DeliveryStop, "status" | "ordersCount" | "openCount">,
): { closed: number; left: number } | null {
  if (stop.status !== "open") return null;
  const closed = stop.ordersCount - stop.openCount;
  if (closed <= 0 || stop.openCount <= 0) return null;
  return { closed, left: stop.openCount };
}

/** Guruh kaliti — bir taklif ikki marta "birlashtirilmasin" (tugma qulfi). */
export function suggestionKey(suggestion: Pick<StopSuggestion, "orderIds">): string {
  return [...suggestion.orderIds].sort().join("|");
}

function mapCourier(raw: unknown): StopCourier | null {
  if (!isRecord(raw)) {
    const id = asOptionalInt(raw);
    return id === null ? null : { id, fullName: "" };
  }
  return {
    id: asOptionalInt(raw.id),
    fullName: asString(raw.full_name ?? raw.name),
  };
}

function strings(raw: unknown): string[] {
  return asArray(raw).map((item) => asString(item)).filter(Boolean);
}

export function mapStop(raw: unknown): DeliveryStop | null {
  const json = asRecord(raw);
  const id = asOptionalInt(json.id);
  if (id === null) return null;
  const orderIds = strings(json.order_ids);
  return {
    id,
    status: asString(json.status) || "open",
    date: asString(json.date),
    addressText: asString(json.address_text),
    lat: asOptionalNumber(json.lat),
    lng: asOptionalNumber(json.lng),
    // Kuryer obyekt (`courier`) yoki faqat id (`courier_id`) bo'lib keladi.
    courier: mapCourier(json.courier ?? json.courier_id),
    orderIds,
    orderNumbers: strings(json.order_numbers),
    ordersCount: asInt(json.orders_count, orderIds.length),
    openCount: asInt(json.open_count),
    payableTotal: asNumber(json.payable_total),
    deliveredAt: parseDate(json.delivered_at),
  };
}

/** `GET logist/stops/` — massiv yoki `{results}`. */
export function mapStopList(raw: unknown): DeliveryStop[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  return list.map(mapStop).filter((stop): stop is DeliveryStop => stop !== null);
}

/** `POST logist/stops/` → `{stop}` (yoki to'xtashning o'zi). */
export function mapCreatedStop(raw: unknown): DeliveryStop | null {
  const json = asRecord(raw);
  return mapStop(isRecord(json.stop) ? json.stop : raw);
}

/** Telefon+manzil mosligi oldinda — logist avval o'shalarni ko'radi. */
export function mapSuggestions(raw: unknown): StopSuggestion[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results ?? asRecord(raw).suggestions);
  return list
    .map((item) => {
      const json = asRecord(item);
      const client = asRecord(json.client);
      const match: SuggestionMatch = asString(json.match) === "phone_address" ? "phone_address" : "address";
      return {
        courier: mapCourier(json.courier ?? json.courier_id),
        date: asString(json.date),
        addressText: asString(json.address_text),
        orderIds: strings(json.order_ids),
        orderNumbers: strings(json.order_numbers),
        match,
        clientName: asOptionalString(client.full_name ?? json.client_name),
        clientPhone: asOptionalString(client.phone ?? json.client_phone),
        couriersDiffer: asBool(json.couriers_differ),
      };
    })
    .filter((suggestion) => suggestion.orderIds.length >= 2)
    .sort((a, b) => Number(b.match === "phone_address") - Number(a.match === "phone_address"));
}

/** `POST logist/stops/auto/` → `{created[], count}`. */
export function mapAutoResult(raw: unknown): { count: number; created: DeliveryStop[] } {
  const json = asRecord(raw);
  const created = mapStopList(json.created);
  return { count: asInt(json.count, created.length), created };
}

export function mapPayRate(raw: unknown): PayRate {
  const json = asRecord(raw);
  return {
    perStop: asNumber(json.per_stop),
    canEdit: asBool(json.can_edit),
    history: asArray(json.history).map((item) => {
      const entry = asRecord(item);
      const by = entry.created_by;
      return {
        perStop: asNumber(entry.per_stop),
        effectiveFrom: asOptionalString(entry.effective_from),
        note: asOptionalString(entry.note),
        createdBy: isRecord(by)
          ? asOptionalString(by.full_name ?? by.name)
          : asOptionalString(by),
        createdAt: parseDate(entry.created_at),
      };
    }),
  };
}
