import { parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asOptionalBool,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

import { mapChangeRequest } from "@/features/orders/change-request";
import type { ChangeRequest } from "@/features/orders/change-request";
import { deliveryStageLabel, mapDeliveryStage } from "@/features/orders/delivery-proof";
import type { DeliveryStage } from "@/features/orders/delivery-proof";
import { normalizeStatus, toDateKey } from "@/features/orders/types";
import type { DeliveryWindow } from "@/features/orders/types";

/**
 * Bitrix oqimi (`LOGIST_01`, 2026-10-27): bitta mijoz = bitta lid kartasi,
 * uch bo'lim — `leads → delivery → base`. Logist faqat Dostavka va Bazani
 * ko'radi (Baza — faqat o'qish), Lidlar yopiq.
 *
 * Dostavka kartasining ustuni — **eng yangi ochiq buyurtmasi** holati;
 * kartada lidning hamma ochiq buyurtmasi (`delivery.orders[]`, eng yangisi
 * birinchi) — mijozning Toshkent va Andijondagi ikki zakazi bitta kartada,
 * har biri o'z holati va kuryeri bilan.
 *
 * Hamma maydon yumshoq o'qiladi: yo'q blok — `null`, UI yiqilmaydi.
 */
export type LeadStage = "leads" | "delivery" | "base";

export const DELIVERY_PAGE_SIZE = 50;

export function asLeadStage(value: unknown): LeadStage | null {
  const stage = asString(value);
  return stage === "leads" || stage === "delivery" || stage === "base"
    ? stage
    : null;
}

/** Kuryer `phone` ham keladi (REJA_04 §1) — "qayerda qoldi" qo'ng'irog'i uchun. */
export type PipelinePerson = { id: number | null; fullName: string; phone: string | null };

/** Kuryer + ilovadagi bosqichi (`CRM_02` §1: `delivery_stage`, `…_display`). */
export type PipelineCourier = PipelinePerson & {
  stage: DeliveryStage | null;
  /** Server yorlig'i bo'lmasa — mahalliy (`deliveryStageLabel`). */
  stageLabel: string | null;
};

/** Kartadagi buyurtma — qisqa shakl (doska `delivery.orders[]`, detal `orders[]`). */
export type PipelineOrder = {
  id: string;
  orderNumber: string;
  /** 5 ta qat'iy statusdan biri (`normalizeStatus`). */
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  totalAmount: number;
  payableAmount: number;
  /** To'lov faktlari — holat chipi `paymentView` dan (taxminsiz). */
  isPaid: boolean | null;
  paidAt: Date | null;
  itemsCount: number;
  createdAt: Date | null;
  /** Joriy holatga o'tgan payt — "ustunda qancha turgani"; bermasa `null`. */
  statusChangedAt: Date | null;
  deliveryDate: string | null;
  deliveryWindow: DeliveryWindow | null;
  /** Qisqa manzil: tuman · mahalla (yoki viloyat); bermasa `null`. */
  addressShort: string | null;
  courier: PipelineCourier | null;
  /** Detalda keladi (`logist/orders/*` shakli); doskada yo'q — `null`. */
  changeRequest: ChangeRequest | null;
  stopId: number | null;
};

export type PipelineLead = {
  id: number;
  fullName: string;
  phone: string;
  stage: LeadStage | null;
  /** Lid statusi (Baza ustuni) — id va nomi. */
  statusId: number | null;
  statusName: string | null;
  assignedTo: PipelinePerson | null;
  region: string | null;
  /** Lid bo'yicha ochiq buyurtmalar summasi (backend bersa). */
  ordersAmount: number | null;
  /** Dostavka ustuni (eng yangi ochiq buyurtma holati); Bazada — `null`. */
  deliveryColumn: string | null;
  /**
   * Hammasi yetkazilgan lid Bazaga o'tadigan payt (`lead.handover_at`,
   * B4: 24 soat). Server bermasa `null` — karta «Yetkazildi» da turadi,
   * vaqt ko'rsatilmaydi.
   */
  handoverAt: Date | null;
  openOrdersCount: number;
  orders: PipelineOrder[];
  updatedAt: Date | null;
  statusChangedAt: Date | null;
};

/** Ustun — Dostavkada buyurtma statusi, Bazada lid statusi (id). */
export type PipelineColumn = {
  /** Barqaror kalit: Dostavkada `status`, Bazada `status_id` satr ko'rinishida. */
  key: string;
  label: string;
  /** Baza ustunining rangi (backend `color`); Dostavkada status rangi UI da. */
  color: string | null;
  /** Ustundagi JAMI karta — "yana N ta" shundan. */
  total: number;
  leads: PipelineLead[];
};

export type PipelineBoard = {
  stage: "delivery" | "base";
  totalLeads: number;
  /** Baza logistga faqat o'qish uchun (`read_only: true`). */
  readOnly: boolean;
  columns: PipelineColumn[];
};

export type LeadDetail = {
  lead: PipelineLead;
  note: string | null;
  source: string | null;
  createdAt: Date | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapperlar
// ─────────────────────────────────────────────────────────────────────────────

function mapPerson(raw: unknown): PipelinePerson | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.full_name ?? raw.name ?? raw.username);
  const id = asOptionalInt(raw.id);
  if (id === null && !name) return null;
  return { id, fullName: name, phone: asOptionalString(raw.phone) };
}

export function mapCourier(raw: unknown): PipelineCourier | null {
  const person = mapPerson(raw);
  if (!person) return null;
  const json = asRecord(raw);
  const stage = mapDeliveryStage(json.delivery_stage);
  return {
    ...person,
    stage,
    stageLabel:
      asOptionalString(json.delivery_stage_display) ?? (stage ? deliveryStageLabel(stage) : null),
  };
}

function asWindow(raw: unknown): DeliveryWindow | null {
  const value = asOptionalString(raw);
  return value === "morning" || value === "afternoon" || value === "evening" ? value : null;
}

/** Tuman · mahalla; ikkalasi yo'q bo'lsa viloyat; hech biri — `null`. */
function shortAddress(json: Record<string, unknown>): string | null {
  const delivery = asRecord(json.delivery);
  const zoning = asRecord(json.zoning);
  const district = asOptionalString(
    json.district_display ?? zoning.district_display ?? delivery.district_display,
  );
  const locality = asOptionalString(json.locality ?? delivery.locality);
  const parts = [district, locality].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return asOptionalString(json.region_display ?? delivery.region_display ?? json.region);
}

export function mapPipelineOrder(raw: unknown): PipelineOrder | null {
  const json = asRecord(raw);
  const id = asString(json.id);
  if (!id) return null;
  const payment = asRecord(json.payment);
  const totalAmount = asNumber(json.total_amount);
  return {
    id,
    orderNumber: asString(json.order_number),
    status: normalizeStatus(asString(json.status)),
    paymentStatus: asOptionalString(json.payment_status ?? payment.status),
    paymentMethod: asOptionalString(json.payment_method ?? payment.method),
    totalAmount,
    payableAmount: asOptionalNumber(json.payable_amount) ?? totalAmount,
    isPaid: asOptionalBool(json.is_paid ?? payment.is_paid),
    paidAt: parseDate(json.paid_at ?? payment.paid_at),
    itemsCount: asInt(json.items_count ?? json.item_count, asArray(json.items).length),
    createdAt: parseDate(json.created_at),
    statusChangedAt: parseDate(json.status_changed_at),
    deliveryDate: toDateKey(json.delivery_date),
    // `delivery.window` (2026-10-28) ustun, eski kalitlar — zaxira.
    deliveryWindow: asWindow(
      asRecord(json.delivery).window ?? json.delivery_window ?? asRecord(json.delivery).delivery_window,
    ),
    addressShort: shortAddress(json),
    courier: mapCourier(json.courier),
    changeRequest: mapChangeRequest(json.change_request),
    stopId: asOptionalInt(json.stop_id),
  };
}

function mapOrders(raw: unknown): PipelineOrder[] {
  return asArray(raw)
    .map(mapPipelineOrder)
    .filter((order): order is PipelineOrder => order !== null);
}

export function mapPipelineLead(raw: unknown): PipelineLead | null {
  const json = asRecord(raw);
  const id = asOptionalInt(json.id);
  if (id === null) return null;
  const status = json.status;
  const delivery = asRecord(json.delivery);
  // Doskada buyurtmalar `delivery.orders` da, detalda — `orders` da.
  const orders = mapOrders(isRecord(json.delivery) ? delivery.orders : json.orders);

  return {
    id,
    fullName: asString(json.full_name),
    phone: asString(json.phone),
    stage: asLeadStage(json.stage),
    statusId: isRecord(status) ? asOptionalInt(status.id) : asOptionalInt(status),
    statusName:
      asOptionalString(json.status_name) ??
      (isRecord(status) ? asOptionalString(status.name) : null),
    assignedTo: mapPerson(json.assigned_to),
    region: asOptionalString(json.region),
    ordersAmount: asOptionalNumber(json.orders_amount),
    deliveryColumn: asOptionalString(delivery.column),
    handoverAt: parseDate(json.handover_at ?? delivery.handover_at),
    openOrdersCount: asInt(
      delivery.open_orders_count,
      orders.filter((order) => isOpenStatus(order.status)).length,
    ),
    orders,
    updatedAt: parseDate(json.updated_at),
    statusChangedAt: parseDate(json.status_changed_at),
  };
}

function mapLeads(raw: unknown): PipelineLead[] {
  return asArray(raw)
    .map(mapPipelineLead)
    .filter((lead): lead is PipelineLead => lead !== null);
}

/**
 * `GET logist/delivery/board/` → `{columns: [{status, label, lead_count, leads}]}`.
 * Oxirida doim «Yetkazildi» ustuni: hammasi yetkazilgan lid 24 soat shu
 * yerda turib Bazaga o'tadi (B4). Server ustunni bermasa — bo'sh ustun,
 * real vaqtda yetkazilgan karta baribir shu yerga tushadi.
 */
export function mapDeliveryBoard(raw: unknown): PipelineBoard {
  const json = asRecord(raw);
  const columns = asArray(json.columns).map((item) => {
      const column = asRecord(item);
      const leads = mapLeads(column.leads);
      return {
        key: normalizeStatus(asString(column.status)),
        label: asString(column.label),
        color: asOptionalString(column.color),
        total: asInt(column.lead_count, leads.length),
        leads,
      };
    });
  return {
    stage: "delivery",
    totalLeads: asInt(json.total_leads),
    readOnly: asBool(json.read_only),
    columns: columns.some((column) => column.key === DELIVERED_COLUMN)
      ? columns
      : [...columns, { key: DELIVERED_COLUMN, label: "", color: null, total: 0, leads: [] }],
  };
}

/**
 * `GET logist/base/kanban/` — `admin/kanban/` shakli: `statuses[]` →
 * `leads[]`, ustunlar faqat `post_sale`. Logistga `read_only: true`
 * (kelmasa ham faqat o'qish deb qabul qilinadi — tahrir yo'li yopiq).
 */
export function mapBaseBoard(raw: unknown): PipelineBoard {
  const json = asRecord(raw);
  return {
    stage: "base",
    totalLeads: asInt(json.total_leads),
    readOnly: asBool(json.read_only, true),
    columns: asArray(json.statuses)
      .map((item) => {
        const column = asRecord(item);
        const leads = mapLeads(column.leads);
        return {
          key: String(asInt(column.id)),
          label: asString(column.name ?? column.label),
          color: asOptionalString(column.color),
          total: asInt(column.lead_count, leads.length),
          leads,
        };
      })
      .filter((column) => column.key !== "0"),
  };
}

/**
 * Ustun davomi javobi (`{lead_count, has_more, leads[]}` yoki DRF
 * `{count, results}`) — `appendColumnPage` tushunadigan bitta ustunli
 * doska shakliga keltiriladi.
 */
export function mapColumnPage(
  stage: PipelineBoard["stage"],
  columnKey: string,
  raw: unknown,
): PipelineBoard {
  const json = asRecord(raw);
  const leads = mapLeads(Array.isArray(raw) ? raw : (json.leads ?? json.results));
  const total = asOptionalInt(json.lead_count ?? json.count);
  return {
    stage,
    totalLeads: total ?? leads.length,
    readOnly: true,
    columns: [{ key: columnKey, label: "", color: null, total: total ?? leads.length, leads }],
  };
}

/** `GET leads/{id}/` — lid + uning buyurtmalari (logist uchun isbot). */
export function mapLeadDetail(raw: unknown): LeadDetail | null {
  const json = isRecord(asRecord(raw).lead) ? asRecord(asRecord(raw).lead) : asRecord(raw);
  const lead = mapPipelineLead(json);
  if (!lead) return null;
  return {
    lead,
    note: asOptionalString(json.note),
    source: asOptionalString(json.source),
    createdAt: parseDate(json.created_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Qoidalar
// ─────────────────────────────────────────────────────────────────────────────

const OPEN_STATUSES = new Set(["pending", "confirmed", "shipping"]);

/** Dostavkaning oxirgi ustuni — hammasi yetkazilgan, Bazaga o'tishni kutyapti. */
export const DELIVERED_COLUMN = "delivered";

export function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

/**
 * Dostavka ustuni — eng yangi ochiq buyurtma holati (`LOGIST_01` §3).
 * Ochiq buyurtma qolmasa: biror zakaz yetkazilgan — «Yetkazildi» (24
 * soat, keyin server `lead_stage_changed`/`lead_handover` bilan Bazaga
 * oladi); hammasi bekor — `null`, karta Dostavkadan chiqadi (Lidlarga).
 */
export function deliveryColumnOf(orders: readonly PipelineOrder[]): string | null {
  const open = orders.filter((order) => isOpenStatus(order.status));
  if (open.length === 0) {
    return orders.some((order) => order.status === "delivered") ? DELIVERED_COLUMN : null;
  }
  const newest = open.reduce((best, order) =>
    (order.createdAt?.getTime() ?? 0) > (best.createdAt?.getTime() ?? 0) ? order : best,
  );
  return newest.status;
}
