import { resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Eshikdagi o'zgarish so'rovi (`LOGIST_02`, 6-reliz, 2026-10-27).
 *
 * Kuryer mijoz oldida tarkibni o'zi o'zgartira olmaydi — so'rov yuboradi,
 * logist bir bosishda qabul qiladi yoki rad etadi. So'rov ochiq ekan kuryer
 * buyurtmani yopa olmaydi (`409 change_request_pending`), ya'ni ochiq so'rov
 * — logistning shoshilinch ishi.
 *
 * Qoidalar (egasi): qo'shilgan mahsulot joriy katalog narxida, chegirmasiz;
 * buyurtmada bir vaqtda bitta ochiq so'rov; faqat ochiq buyurtmada.
 */
export type ChangeRequestKind = "add_item" | "remove_item" | "gift" | "other";

export type ChangeRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type ChangeRequestItem = {
  productId: number | null;
  title: string;
  quantity: number;
  /** Katalog narxi (so'm); `remove_item` da kelmasligi mumkin. */
  unitPrice: number | null;
};

export type ChangeRequest = {
  id: number;
  /** Notanish tur kelsa ham saqlanadi — yorliq `other` dek chiqadi. */
  kind: ChangeRequestKind | string;
  status: ChangeRequestStatus | string;
  items: ChangeRequestItem[];
  note: string | null;
  photoUrl: string | null;
  createdAt: Date | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  decisionNote: string | null;
  courier: { id: number | null; fullName: string } | null;
};

function mapItem(raw: unknown): ChangeRequestItem {
  const json = asRecord(raw);
  const product = asRecord(json.product);
  return {
    productId: asOptionalInt(json.product_id ?? product.id),
    title: asString(json.title ?? product.title ?? json.name),
    quantity: Math.max(1, asInt(json.quantity, 1)),
    unitPrice:
      json.unit_price === null || json.unit_price === undefined
        ? null
        : asNumber(json.unit_price),
  };
}

function personName(raw: unknown): string | null {
  if (!isRecord(raw)) return asOptionalString(raw);
  return asOptionalString(raw.full_name ?? raw.name ?? raw.username);
}

/** Yo'q yoki `null` — so'rov yo'q (`null`), backend xususiyatni bilmasa ham. */
export function mapChangeRequest(raw: unknown): ChangeRequest | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  const courier = asRecord(raw.courier);
  const photo = asOptionalString(raw.photo_url);

  return {
    id,
    kind: asString(raw.kind) || "other",
    status: asString(raw.status) || "pending",
    items: asArray(raw.items).map(mapItem),
    note: asOptionalString(raw.note),
    photoUrl: photo ? resolveMediaUrl(photo) : null,
    createdAt: parseDate(raw.created_at),
    resolvedAt: parseDate(raw.resolved_at),
    resolvedBy: personName(raw.resolved_by),
    decisionNote: asOptionalString(raw.decision_note),
    courier: isRecord(raw.courier)
      ? {
          id: asOptionalInt(courier.id),
          fullName: asString(courier.full_name ?? courier.name),
        }
      : null,
  };
}
