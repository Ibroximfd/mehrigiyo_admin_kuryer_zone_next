import { formatSom, formatTime, parseDate } from "@/lib/format";
import {
  asArray,
  asNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

import { asTier, tierLabel } from "@/features/couriers/candidates";

import {
  addressChangeReasonLabel,
  addressChangedTitle,
  asAddressChangedBy,
} from "./address";
import type { OrderComment } from "./comments";
import { creatorKindLabel } from "./creator";
import { cancelReasonLabel, revertReasonLabel } from "./reasons";
import {
  attemptReasonLabel,
  confirmationChannelLabel,
  describeChange,
  paymentMethodLabel,
} from "./types";
import type { LogistOrder, OrderAuditEntry, OrderChanges } from "./types";

/**
 * Buyurtma tarixi lentasi (`02_DOMAIN_MODEL` §6, `03_BACKEND` §5.2).
 *
 * Asosiy manba — `GET /operator/logist/orders/{id}/timeline/`. Endpoint hali
 * yo'q bo'lsa lenta mavjud bo'laklardan yig'iladi: audit-jurnal, izohlar,
 * yetkazish urinishlari va buyurtmaning o'zidagi "yaratildi / tasdiqlandi"
 * maydonlari (`buildFallbackTimeline`). UI ikkala manbani farqlamaydi.
 */

export type TimelineCategory = "change" | "comment" | "call" | "system";

export type TimelineIcon =
  | "edit"
  | "status"
  | "ok"
  | "create"
  | "push"
  | "call"
  | "note"
  | "truck"
  | "attempt"
  | "payment"
  | "map";

export type TimelineTone = "brand" | "ok" | "warn" | "danger" | "muted";

export type TimelineDiff = {
  key: string;
  label: string;
  from: string;
  to: string;
  /**
   * Tuman diffi nomsiz kelgan bo'lsa (`district_display` yo'q) — xom kodlar.
   * `resolveTimelineDistricts` ularni `/meta/regions/` keshi bo'yicha nomga
   * almashtiradi; topilmasa kod qoladi. Nom kelgan tomon — `null`.
   */
  codes?: { from: string | null; to: string | null };
};

export type TimelineItem = {
  id: string;
  kind: string;
  category: TimelineCategory;
  icon: TimelineIcon;
  tone: TimelineTone;
  title: string;
  who: string | null;
  at: Date | null;
  text: string | null;
  diffs: TimelineDiff[];
  /** O'zgarish sababi — diff bloki ostida alohida qator. */
  reason: string | null;
  /** `payment.door_opened` — eshikda ochilgan onlayn to'lov (§2.4b). */
  door?: DoorPaymentOpen;
};

/** Eshikda onlayn to'lov niyati: kim orqali va qachongacha. */
export type DoorPaymentOpen = { provider: string; expiresAt: Date | null };

export const TIMELINE_FILTERS = [
  { value: "all", label: "Barchasi" },
  { value: "changes", label: "O'zgarishlar" },
  { value: "comments", label: "Izohlar" },
] as const;

export type TimelineFilter = (typeof TIMELINE_FILTERS)[number]["value"];

export function filterTimeline(
  items: TimelineItem[],
  filter: TimelineFilter,
): TimelineItem[] {
  if (filter === "changes") return items.filter((item) => item.category === "change");
  if (filter === "comments") return items.filter((item) => item.category === "comment");
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

/** Sabab/izoh kalitlari diff emas — ular "Sabab" qatoriga chiqadi. */
const REASON_KEYS = new Set([
  "cancel_reason",
  "cancel_note",
  "revert_reason",
  "change_reason",
  "note",
  "reason",
]);

const ACTOR_LABELS: Record<string, string> = {
  logist: "Logist",
  courier: "Kuryer",
  client: "Mijoz",
  system: "Tizim",
};

function actorLabel(type: string | null, name: string | null): string | null {
  const kind = type ? (ACTOR_LABELS[type] ?? creatorKindLabel(type)) : "";
  // Tizim nomi bilan kelsa (masalan "Avto taqsimlash") — o'sha nom.
  if (type === "system") return name || "Tizim";
  if (kind && name) return `${kind} · ${name}`;
  return name || kind || null;
}

/** Diff qiymati: satr, son, massiv (mahsulotlar) yoki obyekt. */
export function stringifyChangeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((item) => {
      if (!isRecord(item)) return asString(item);
      const name = asString(item.name ?? item.medicine_name ?? item.title);
      const quantity = asNumber(item.quantity, 0);
      return quantity > 0 && name ? `${name} ×${quantity}` : name;
    });
    const text = parts.filter(Boolean).join(", ");
    return text || null;
  }
  if (isRecord(value)) {
    return asOptionalString(value.name ?? value.full_name ?? value.label) ?? JSON.stringify(value);
  }
  return null;
}

function reasonText(changes: Record<string, { from: string | null; to: string | null }>): string | null {
  const parts: string[] = [];
  const cancel = changes.cancel_reason?.to;
  if (cancel) parts.push(cancelReasonLabel(cancel));
  const revert = changes.revert_reason?.to;
  if (revert) parts.push(revertReasonLabel(revert));
  for (const key of ["change_reason", "reason", "cancel_note", "note"]) {
    const value = changes[key]?.to;
    if (value) parts.push(value);
  }
  return parts.length ? parts.join(" · ") : null;
}

function toDiffs(changes: OrderChanges): TimelineDiff[] {
  return Object.entries(changes)
    .filter(([key]) => !REASON_KEYS.has(key))
    .map(([key, change]) => ({ key, ...describeChange(key, change) }));
}

/** Xom `changes` obyekti → `{key: {from, to}}` (massivlar matnga aylanadi). */
function mapRawChanges(raw: unknown): OrderChanges {
  const changes: OrderChanges = {};
  for (const [key, value] of Object.entries(asRecord(raw))) {
    if (!isRecord(value)) continue;
    changes[key] = {
      from: stringifyChangeValue(value.from),
      to: stringifyChangeValue(value.to),
    };
  }
  return changes;
}

function statusTone(status: string | null): TimelineTone {
  if (status === "cancelled") return "danger";
  if (status === "delivered") return "ok";
  if (status === "shipping") return "brand";
  return "muted";
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend TimelineEvent → UI
// ─────────────────────────────────────────────────────────────────────────────

type KindMeta = {
  title: string;
  category: TimelineCategory;
  icon: TimelineIcon;
  tone: TimelineTone;
};

const KIND_META: Record<string, KindMeta> = {
  "order.created": { title: "Buyurtma yaratildi", category: "system", icon: "create", tone: "brand" },
  "order.updated": { title: "Buyurtma tahrirlandi", category: "change", icon: "edit", tone: "brand" },
  "order.status_changed": { title: "Status o'zgardi", category: "change", icon: "status", tone: "muted" },
  "order.confirmed_by_client": { title: "Mijoz tasdiqladi", category: "system", icon: "ok", tone: "ok" },
  "order.confirmation_reminder_sent": { title: "Tasdiq eslatmasi yuborildi", category: "system", icon: "push", tone: "warn" },
  "order.delivery_rescheduled": { title: "Yetkazish sanasi ko'chirildi", category: "change", icon: "edit", tone: "brand" },
  "order.courier_assigned": { title: "Kuryer biriktirildi", category: "change", icon: "truck", tone: "brand" },
  "order.delivery_attempt": { title: "Yetkazib bo'lmadi", category: "system", icon: "attempt", tone: "warn" },
  "order.returned": { title: "Qaytarildi", category: "change", icon: "status", tone: "danger" },
  // Sarlavha `payload.by` ga qarab (`addressChangedTitle`), bu — zaxira.
  "order.address_changed": { title: "Manzil o'zgartirildi", category: "change", icon: "map", tone: "warn" },
  "payment.method_selected": { title: "To'lov usuli tanlandi", category: "system", icon: "payment", tone: "muted" },
  "payment.paid": { title: "To'lov tushdi", category: "system", icon: "payment", tone: "ok" },
  "payment.failed": { title: "To'lov o'tmadi", category: "system", icon: "payment", tone: "danger" },
  "payment.refunded": { title: "To'lov qaytarildi", category: "system", icon: "payment", tone: "muted" },
  "payment.door_opened": { title: "Eshikda onlayn to'lov ochildi", category: "system", icon: "payment", tone: "warn" },
  "payment.door_closed": { title: "Onlayn to'lov yopildi — naqdga qaytdi", category: "system", icon: "payment", tone: "muted" },
  "comment.added": { title: "Izoh", category: "comment", icon: "note", tone: "muted" },
  "comment.edited": { title: "Izoh tahrirlandi", category: "comment", icon: "note", tone: "muted" },
  "notification.sent": { title: "Push yuborildi", category: "system", icon: "push", tone: "warn" },
};

const DOOR_CLOSE_REASONS: Record<string, string> = {
  expired: "15 daqiqada to'lanmadi",
  cancelled: "Kuryer yopdi",
  provider_cancelled: "Mijoz to'lov oynasida bekor qildi",
};

/** `payme_merchant` → "Payme": server nomi bo'lsa — o'sha. */
function providerName(payload: Record<string, unknown>): string {
  const display = asOptionalString(payload.provider_display);
  if (display) return display;
  const code = asString(payload.provider).toLowerCase();
  if (code.startsWith("payme")) return "Payme";
  if (code.startsWith("click")) return "Click";
  return code;
}

function amountText(payload: Record<string, unknown>): string {
  const amount = asNumber(payload.amount, 0);
  return amount > 0 ? formatSom(amount) : "";
}

function doorPaymentText(kind: string, payload: Record<string, unknown>): string | null {
  if (kind === "payment.door_opened") {
    const until = parseDate(payload.expires_at);
    return (
      [
        providerName(payload),
        amountText(payload),
        until ? `${formatTime(until)} gacha` : "",
      ]
        .filter(Boolean)
        .join(" · ") || null
    );
  }
  if (kind === "payment.door_closed") {
    const reasonCode = asString(payload.reason);
    return (
      [
        DOOR_CLOSE_REASONS[reasonCode] ?? reasonCode,
        asOptionalString(payload.note),
      ]
        .filter(Boolean)
        .join(" · ") || null
    );
  }
  // `payment.paid` eshikda (`door: true`) — kuryerdan naqd emas, onlayn.
  return (
    ["Eshikda onlayn", providerName(payload), amountText(payload)]
      .filter(Boolean)
      .join(" · ") || null
  );
}

function callTitle(kind: string, payload: Record<string, unknown>): string {
  const direction = asString(payload.direction) === "in" ? "Kiruvchi" : "Chiquvchi";
  const seconds = asNumber(payload.duration_sec, 0);
  const duration =
    seconds > 0 ? ` · ${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "";
  if (kind === "call.missed") return `O'tkazib yuborilgan qo'ng'iroq`;
  return `${direction} qo'ng'iroq${duration}`;
}

function eventText(kind: string, payload: Record<string, unknown>): string | null {
  if (
    kind === "payment.door_opened" ||
    kind === "payment.door_closed" ||
    (kind === "payment.paid" && payload.door === true)
  ) {
    return doorPaymentText(kind, payload);
  }
  switch (kind) {
    case "order.confirmed_by_client": {
      const method = paymentMethodLabel(asOptionalString(payload.payment_method));
      const channel = confirmationChannelLabel(asOptionalString(payload.channel));
      return [channel, method ? `to'lov: ${method}` : ""].filter(Boolean).join(" · ") || null;
    }
    case "order.courier_assigned":
      return courierAssignedText(payload);
    case "order.delivery_attempt": {
      const reason = attemptReasonLabel(asString(payload.reason));
      const note = asOptionalString(payload.note);
      return note ? `${reason} · ${note}` : reason;
    }
    case "comment.added":
    case "comment.edited":
      // Shartnomada `text`; server boshqa nom bilan yuborsa ham matn yo'qolmasin.
      return asOptionalString(
        payload.text ?? payload.body ?? payload.content ?? payload.message ?? payload.comment,
      );
    case "order.created": {
      const number = asOptionalString(payload.order_number);
      return number ? `#${number}` : null;
    }
    default:
      return asOptionalString(payload.text ?? payload.note);
  }
}

/**
 * `order.courier_assigned` — yangi shakl `{courier_id, courier_name,
 * zone_match, tier, auto}`; eski shakl `{courier: {full_name}}`.
 * Matn: "Aziz · asosiy zona · zona mos emas".
 */
function courierAssignedText(payload: Record<string, unknown>): string | null {
  const courier = asRecord(payload.courier);
  const name = asOptionalString(
    payload.courier_name ?? courier.full_name ?? courier.name ?? payload.courier,
  );
  const tier = tierLabel(asTier(payload.tier));
  const mismatch = payload.zone_match === false ? "zona mos emas" : "";
  return [name, tier, mismatch].filter(Boolean).join(" · ") || null;
}

/** Biriktirish avtomatik bo'lganmi (`payload.auto`). */
function isAutoAssignment(kind: string, payload: Record<string, unknown>): boolean {
  return kind === "order.courier_assigned" && payload.auto === true;
}

/** Kuryer olib tashlangan biriktirish hodisasi (`courier_id: null`). */
function isCourierRemoval(kind: string, payload: Record<string, unknown>): boolean {
  return (
    kind === "order.courier_assigned" &&
    "courier_id" in payload &&
    payload.courier_id === null &&
    !isRecord(payload.courier)
  );
}

function statusChangeParts(payload: Record<string, unknown>): {
  diffs: TimelineDiff[];
  reason: string | null;
} {
  const from = asOptionalString(payload.from);
  const to = asOptionalString(payload.to);
  const described = describeChange("status", { from, to });
  const reasonKey = asOptionalString(payload.reason);
  const reasonLabel =
    reasonKey && to === "cancelled"
      ? cancelReasonLabel(reasonKey)
      : reasonKey
        ? revertReasonLabel(reasonKey)
        : "";
  const note = asOptionalString(payload.note);
  return {
    diffs: [{ key: "status", ...described }],
    reason: [reasonLabel, note].filter(Boolean).join(" · ") || null,
  };
}

/** `before`/`after` dagi manzil maydonlari — faqat o'zgarganlari diff bo'ladi. */
const ADDRESS_KEYS = ["address_text", "locality", "district"] as const;

/** `changed[]` da nuqta o'zgarishini bildiruvchi nomlar. */
const POINT_KEYS = ["lat", "lng", "point", "coordinates", "location"] as const;

function coordinateText(point: Record<string, unknown>): string | null {
  const lat = asOptionalString(point.lat);
  const lng = asOptionalString(point.lng);
  return lat && lng ? `${lat}, ${lng}` : null;
}

/**
 * Tuman diffi: `district_display` (server `X-Lang` bo'yicha) ustun; u
 * bo'lmasa kod chiqadi va `codes` da saqlanadi — keyin katalogdan nomlanadi.
 */
function districtDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): TimelineDiff {
  const fromCode = asOptionalString(before.district);
  const toCode = asOptionalString(after.district);
  const fromName = asOptionalString(before.district_display);
  const toName = asOptionalString(after.district_display);
  const diff: TimelineDiff = {
    key: "district",
    ...describeChange("district", {
      from: fromCode ? (fromName ?? fromCode) : null,
      to: toCode ? (toName ?? toCode) : null,
    }),
  };
  const codes = {
    from: fromCode && !fromName ? fromCode : null,
    to: toCode && !toName ? toCode : null,
  };
  return codes.from || codes.to ? { ...diff, codes } : diff;
}

/** `payload.changed[]` — bo'lsa diff shu maydonlar bilan cheklanadi. */
function changedFields(payload: Record<string, unknown>): Set<string> | null {
  const list = asArray(payload.changed)
    .map((item) => asOptionalString(item))
    .filter((item): item is string => item !== null);
  return list.length ? new Set(list) : null;
}

/**
 * `order.address_changed` (`HUDUD_3` §2, javob Q4/Q9): tanasi `payload`
 * ichida — `{by, courier{id,name}, reason, comment, before, after,
 * changed[]}`; `before/after` = `{address_text, locality, district,
 * district_display, lat, lng}`. Diff — `changed[]` dagi (bo'lmasa —
 * qiymati farq qilgan) maydonlar; `lat`+`lng` bitta "Koordinata" qatori.
 */
function addressChangeParts(payload: Record<string, unknown>): {
  diffs: TimelineDiff[];
  reason: string | null;
} {
  const before = asRecord(payload.before);
  const after = asRecord(payload.after);
  const picked = changedFields(payload);
  const diffs: TimelineDiff[] = [];
  for (const key of ADDRESS_KEYS) {
    if (picked && !picked.has(key)) continue;
    const from = asOptionalString(before[key]);
    const to = asOptionalString(after[key]);
    if (from === to) continue;
    diffs.push(
      key === "district" ? districtDiff(before, after) : { key, ...describeChange(key, { from, to }) },
    );
  }
  const pointPicked = !picked || POINT_KEYS.some((key) => picked.has(key));
  const fromPoint = coordinateText(before);
  const toPoint = coordinateText(after);
  if (pointPicked && fromPoint !== toPoint) {
    diffs.push({
      key: "coordinates",
      ...describeChange("coordinates", { from: fromPoint, to: toPoint }),
    });
  }
  const reason = addressChangeReasonLabel(asOptionalString(payload.reason));
  const comment = asOptionalString(payload.comment);
  return { diffs, reason: [reason, comment].filter(Boolean).join(" · ") || null };
}

/**
 * Nomsiz kelgan tuman diffi (`codes`) — katalog bo'yicha nomlanadi.
 * O'zgarish bo'lmasa o'sha massiv qaytadi (memo buzilmasin).
 */
export function resolveTimelineDistricts(
  items: TimelineItem[],
  nameOf: (code: string) => string | null,
): TimelineItem[] {
  let touched = false;
  const next = items.map((item) => {
    if (!item.diffs.some((diff) => diff.codes)) return item;
    touched = true;
    return {
      ...item,
      diffs: item.diffs.map((diff) => {
        if (!diff.codes) return diff;
        const from = diff.codes.from ? nameOf(diff.codes.from) : null;
        const to = diff.codes.to ? nameOf(diff.codes.to) : null;
        return { ...diff, from: from ?? diff.from, to: to ?? diff.to };
      }),
    };
  });
  return touched ? next : items;
}

/** Kim o'zgartirgani: `actor` bo'lmasa `payload.by` + `payload.courier.name`. */
function addressChangeWho(payload: Record<string, unknown>): string | null {
  const by = asAddressChangedBy(payload.by);
  const courier = asRecord(payload.courier);
  const name = asOptionalString(courier.name ?? courier.full_name);
  return actorLabel(by, by === "courier" ? name : null);
}

export function mapTimelineEvent(raw: unknown, index = 0): TimelineItem {
  const json = asRecord(raw);
  const kind = asString(json.kind);
  const payload = asRecord(json.payload);
  const actor = asRecord(json.actor);
  const at = parseDate(json.created_at);

  const isCall = kind.startsWith("call.");
  const meta: KindMeta = KIND_META[kind] ?? {
    title: kind || "Hodisa",
    category: isCall ? "call" : "system",
    icon: isCall ? "call" : "note",
    tone: isCall ? "ok" : "muted",
  };

  let diffs: TimelineDiff[] = [];
  let reason: string | null = null;
  if (kind === "order.status_changed") {
    ({ diffs, reason } = statusChangeParts(payload));
  } else if (kind === "order.address_changed") {
    ({ diffs, reason } = addressChangeParts(payload));
  } else if (isRecord(payload.changes)) {
    const changes = mapRawChanges(payload.changes);
    diffs = toDiffs(changes);
    reason = reasonText(changes) ?? asOptionalString(payload.reason);
  } else if (kind === "order.delivery_rescheduled") {
    diffs = [
      {
        key: "delivery_date",
        ...describeChange("delivery_date", {
          from: asOptionalString(payload.from_date),
          to: asOptionalString(payload.to_date),
        }),
      },
    ];
  }

  return {
    id: asString(json.id) || `${kind}-${at?.getTime() ?? 0}-${index}`,
    kind,
    category: meta.category,
    icon: meta.icon,
    tone:
      kind === "order.status_changed"
        ? statusTone(asOptionalString(payload.to))
        : kind === "order.courier_assigned" && payload.zone_match === false
          ? "warn"
          : meta.tone,
    title: isCall
      ? callTitle(kind, payload)
      : kind === "order.address_changed"
        ? addressChangedTitle(asAddressChangedBy(payload.by))
        : isCourierRemoval(kind, payload)
          ? "Kuryer olib tashlandi"
          : isAutoAssignment(kind, payload)
            ? "Avto biriktirildi"
            : meta.title,
    who:
      actorLabel(asOptionalString(actor.type), asOptionalString(actor.name)) ??
      (kind === "order.address_changed" ? addressChangeWho(payload) : null),
    at,
    text: eventText(kind, payload),
    diffs,
    reason,
    ...(kind === "payment.door_opened"
      ? {
          door: {
            provider: providerName(payload),
            expiresAt: parseDate(payload.expires_at),
          },
        }
      : {}),
  };
}

/**
 * Hozir kutilayotgan eshikdagi onlayn to'lov (§2.4b): oxirgi
 * `payment.door_opened` dan keyin `payment.paid` / `payment.door_closed`
 * kelmagan va muddati o'tmagan bo'lsa — o'sha; aks holda `null`.
 */
export function pendingDoorPayment(
  items: TimelineItem[],
  now: Date = new Date(),
): DoorPaymentOpen | null {
  let open: { door: DoorPaymentOpen; at: number } | null = null;
  let closedAt = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const at = item.at?.getTime() ?? 0;
    if (item.kind === "payment.door_opened" && item.door) {
      if (!open || at >= open.at) open = { door: item.door, at };
    } else if (item.kind === "payment.paid" || item.kind === "payment.door_closed") {
      closedAt = Math.max(closedAt, at);
    }
  }
  if (!open || closedAt >= open.at) return null;
  const until = open.door.expiresAt;
  if (until && until.getTime() <= now.getTime()) return null;
  return open.door;
}

export function mapTimeline(raw: unknown): TimelineItem[] {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.results);
  return sortTimeline(list.map(mapTimelineEvent));
}

// ─────────────────────────────────────────────────────────────────────────────
// Zaxira: mavjud bo'laklardan lenta yig'ish
// ─────────────────────────────────────────────────────────────────────────────

/** Eng yangisi tepada; sanasizlar oxirida. */
export function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort(
    (a, b) => (b.at?.getTime() ?? -Infinity) - (a.at?.getTime() ?? -Infinity),
  );
}

function auditItem(entry: OrderAuditEntry): TimelineItem {
  const statusChange = entry.changes.status;
  return {
    id: `audit-${entry.id}`,
    kind: entry.action || "order.updated",
    category: "change",
    icon: statusChange ? "status" : entry.action === "courier_assigned" ? "truck" : "edit",
    tone: statusChange ? statusTone(statusChange.to) : "brand",
    title: entry.actionDisplay || "Buyurtma tahrirlandi",
    who: entry.onBehalfOf
      ? `${entry.admin ?? "—"} · ${entry.onBehalfOf} nomidan`
      : entry.admin,
    at: entry.createdAt,
    text: null,
    diffs: toDiffs(entry.changes),
    reason: reasonText(entry.changes),
  };
}

function commentItem(comment: OrderComment): TimelineItem {
  return {
    id: `comment-${comment.id}`,
    kind: "comment.added",
    category: "comment",
    icon: "note",
    tone: "muted",
    title: "Izoh",
    who: comment.author || null,
    at: comment.createdAt,
    text: comment.text,
    diffs: [],
    reason: null,
  };
}

function createdItem(order: LogistOrder): TimelineItem | null {
  if (!order.createdAt) return null;
  const creator = order.createdBy;
  const who = creator
    ? creator.kind === "client"
      ? creatorKindLabel(creator.kind)
      : actorLabel(creator.kind, creator.name)
    : null;
  const items = order.items
    .map((item) => `${item.name} ×${item.quantity}`)
    .join(", ");
  return {
    id: `created-${order.id}`,
    kind: "order.created",
    category: "system",
    icon: "create",
    tone: "brand",
    title: "Buyurtma yaratildi",
    who,
    at: order.createdAt,
    text: items || null,
    diffs: [],
    reason: null,
  };
}

function confirmedItem(order: LogistOrder): TimelineItem | null {
  const confirmation = order.confirmation;
  const at = confirmation?.confirmedAt ?? order.confirmedAt;
  if (!at) return null;
  const byClient = confirmation?.confirmedBy === "client";
  return {
    id: `confirmed-${order.id}`,
    kind: "order.confirmed",
    category: "system",
    icon: "ok",
    tone: "ok",
    title: byClient ? "Mijoz tasdiqladi" : "Buyurtma tasdiqlandi",
    who: byClient
      ? order.client.fullName || "Mijoz"
      : actorLabel(confirmation?.confirmedBy ?? null, confirmation?.confirmer?.name || null),
    at,
    text: confirmationChannelLabel(confirmation?.channel) || null,
    diffs: [],
    reason: null,
  };
}

function attemptItems(order: LogistOrder): TimelineItem[] {
  return order.deliveryAttempts.map((attempt) => ({
    id: `attempt-${attempt.id}`,
    kind: "order.delivery_attempt",
    category: "system",
    icon: "attempt",
    tone: "warn",
    title: "Yetkazib bo'lmadi",
    who: attempt.createdBy,
    at: attempt.createdAt,
    text: attempt.note
      ? `${attemptReasonLabel(attempt.reason)} · ${attempt.note}`
      : attemptReasonLabel(attempt.reason),
    diffs: [],
    reason: null,
  }));
}

/**
 * Timeline endpointi yo'q paytdagi lenta: bir buyurtma bo'yicha barcha
 * ma'lum hodisalar bitta xronologiyada. Tartib — eng yangisi tepada.
 */
export function buildFallbackTimeline({
  order,
  audit,
  comments,
}: {
  order: LogistOrder;
  audit: OrderAuditEntry[];
  comments: OrderComment[];
}): TimelineItem[] {
  const items: TimelineItem[] = [
    ...audit.map(auditItem),
    ...comments.map(commentItem),
    ...attemptItems(order),
  ];
  const created = createdItem(order);
  if (created) items.push(created);
  const confirmed = confirmedItem(order);
  if (confirmed) items.push(confirmed);
  return sortTimeline(items);
}
