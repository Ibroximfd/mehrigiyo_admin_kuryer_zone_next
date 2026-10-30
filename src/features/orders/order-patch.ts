import type { DeliveryWindow } from "./types";

/**
 * Logist PATCH tanasi (`PATCH /operator/logist/orders/{id}/`, `03` §1.3).
 *
 * Faqat **berilgan** kalitlar yuboriladi: `undefined` — "tegilmagan",
 * `null` — "tozalansin". Shu farq tufayli tahrir oynasi faqat o'zgargan
 * maydonlarni jo'natadi va backend tarixga aynan shularni yozadi.
 */
export type OrderItemPatch = {
  /** Mavjud qator id si — backend qatorni yangilaydi, yangisini yaratmaydi. */
  lineId?: string | null;
  productId: number | null;
  quantity: number;
  isGift: boolean;
};

export type LogistOrderPatch = {
  status?: string;
  /** `→ cancelled` uchun majburiy (`02` §2.5, xodimlar to'plami). */
  cancelReason?: string;
  cancelNote?: string | null;
  /** Orqaga qaytarish / tiklash uchun majburiy (`02` §2.3). */
  revertReason?: string;
  /** `pending → confirmed` (logist mijoz tasdig'ini chetlab o'tadi) — sabab. */
  confirmReason?: string;
  /**
   * Yakunlashda kuryerga yoziladigan manzil soni (`courier_addresses`,
   * 2026-10-29): yetkazildi — sukut 1, atkaz — 0, logist 0…9 qiladi.
   */
  courierAddresses?: number;
  /** Status o'zgarishiga erkin izoh — tarixga `note` bo'lib tushadi. */
  note?: string | null;
  courierId?: number | null;
  /** Bosh kuryerga berish (`chief_courier_id`, §C 1.2); `null` — olib qo'yish. */
  chiefCourierId?: number | null;
  deliveryScheduledAt?: string | null;
  deliveryWindow?: DeliveryWindow | null;
  logistNote?: string | null;
  /** To'liq ro'yxat qayta yoziladi (§4.13). */
  tags?: string[];

  // ── Tahrir oynasi (`05` §6, `02` §2.4 — logist har bosqichda) ───────────
  clientName?: string;
  orderedForPhone?: string | null;
  region?: string | null;
  /**
   * Tuman kodi (`fargona/qoqon_sh`) yoki `null`. Zona serverda qayta
   * hisoblanadi; noma'lum kod — `400 validation_error`.
   */
  district?: string | null;
  /** Mahalla / qishloq — erkin matn ≤120 (`HUDUD_3` §1); `null` — tozalash. */
  locality?: string | null;
  deliveryDate?: string | null;
  addressText?: string | null;
  items?: OrderItemPatch[];
  boxCount?: number | null;
  extraProductNote?: string | null;
  giftComment?: string | null;
  paymentMethod?: string | null;
  /**
   * Komissiya egasi — faqat tavsiya orqali kelgan buyurtmaning tarkibi
   * o'zgarganda (`commission-operator.ts`). Logist mas'ulni almashtirmaydi.
   */
  operatorId?: number;
  /** Tarix uchun sabab — `TimelineEvent(order.updated).reason`. */
  changeReason?: string;
};

/** Kalit → backend nomi. Tartib — tarixdagi ko'rinish tartibi. */
const FIELD_MAP: Array<[keyof LogistOrderPatch, string]> = [
  ["status", "status"],
  ["cancelReason", "cancel_reason"],
  ["revertReason", "revert_reason"],
  ["confirmReason", "confirm_reason"],
  ["courierAddresses", "courier_addresses"],
  ["courierId", "courier_id"],
  ["chiefCourierId", "chief_courier_id"],
  ["deliveryScheduledAt", "delivery_scheduled_at"],
  ["deliveryWindow", "delivery_window"],
  ["logistNote", "logist_note"],
  ["clientName", "client_name"],
  ["orderedForPhone", "ordered_for_phone"],
  ["region", "region"],
  ["district", "district"],
  ["locality", "locality"],
  ["deliveryDate", "delivery_date"],
  // Logist shartnomasi: `delivery_address_text` (`HUDUD_JAVOBLAR_4` §5) —
  // `address_text` rad etiladi (`field_not_allowed`); u faqat kuryer endpointida.
  ["addressText", "delivery_address_text"],
  ["boxCount", "box_count"],
  ["extraProductNote", "extra_product_note"],
  ["giftComment", "gift_comment"],
  ["paymentMethod", "payment_method"],
  ["operatorId", "operator_id"],
  ["changeReason", "change_reason"],
];

/** Bo'sh satr ham "tozalash" hisoblanadigan izoh kalitlari. */
const BLANKABLE = new Set<keyof LogistOrderPatch>(["cancelNote", "note"]);

export function serializeOrderPatch(
  patch: LogistOrderPatch,
): Record<string, unknown> {
  const json: Record<string, unknown> = {};

  for (const [key, wire] of FIELD_MAP) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === undefined) continue;
    // Status/sabab kalitlari bo'sh satr bilan yuborilmaydi.
    if (
      (key === "status" ||
        key === "cancelReason" ||
        key === "revertReason" ||
        key === "confirmReason" ||
        key === "changeReason") &&
      !value
    ) {
      continue;
    }
    json[wire] = value;
  }

  for (const key of BLANKABLE) {
    if (key in patch) json[key === "cancelNote" ? "cancel_note" : "note"] = patch[key] ?? "";
  }

  if (patch.tags) json.tags = patch.tags;
  if (patch.items) {
    json.items = patch.items.map((item) => ({
      ...(item.lineId ? { id: item.lineId } : {}),
      product_id: item.productId,
      quantity: item.quantity,
      is_gift: item.isGift,
    }));
  }

  return json;
}

/**
 * Pul kalitlari — status o'tishida HECH QACHON yuborilmaydi (`00` 2-qaror:
 * to'lov statusdan mustaqil). Faqat tahrir oynasi usulni o'zgartiradi.
 */
const PAYMENT_KEYS = ["payment_method", "payment_status", "payment_type", "is_paid"] as const;

/** Status o'tishi tanasi: pul kalitlari bo'lsa olib tashlanadi (himoya). */
export function withoutPaymentKeys(
  json: Record<string, unknown>,
): Record<string, unknown> {
  if (!("status" in json)) return json;
  const next = { ...json };
  for (const key of PAYMENT_KEYS) delete next[key];
  return next;
}

/** Status oilasidagi kalitlar — eski (admin) zaxira PATCH faqat shularni biladi. */
const STATUS_FAMILY = new Set([
  "status",
  "confirm_reason",
  "cancel_reason",
  "cancel_note",
  "revert_reason",
  "courier_addresses",
  "note",
]);

export function isStatusOnlyPatch(json: Record<string, unknown>): boolean {
  return Object.keys(json).every((key) => STATUS_FAMILY.has(key));
}
