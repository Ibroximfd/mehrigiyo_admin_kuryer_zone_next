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

export const CHANGE_REQUEST_KIND_LABELS: Record<ChangeRequestKind, string> = {
  add_item: "Mahsulot qo'shish",
  remove_item: "Mahsulotni olib tashlash",
  gift: "Sovg'a",
  other: "Boshqa o'zgarish",
};

const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending: "Javob kutmoqda",
  accepted: "Qabul qilindi",
  rejected: "Rad etildi",
  cancelled: "Kuryer bekor qildi",
};

export function changeRequestKindLabel(kind: string): string {
  return (
    CHANGE_REQUEST_KIND_LABELS[kind as ChangeRequestKind] ??
    CHANGE_REQUEST_KIND_LABELS.other
  );
}

export function changeRequestStatusLabel(status: string): string {
  return STATUS_LABELS[status as ChangeRequestStatus] ?? status;
}

/** Logist javobini kutayotgan so'rov — kartadagi belgi shundan. */
export function isOpenChangeRequest(
  request: Pick<ChangeRequest, "status"> | null | undefined,
): request is ChangeRequest {
  return request?.status === "pending";
}

/**
 * `add_item` / `gift` so'rovining qo'shimcha summasi (katalog narxi ×
 * miqdor). Sovg'a pulsiz — `0`. Narxi kelmagan qator hisobga kirmaydi:
 * yakuniy summani baribir server hisoblaydi, bu faqat taxmin.
 */
export function changeRequestDelta(request: ChangeRequest): number | null {
  if (request.kind === "gift") return 0;
  if (request.kind !== "add_item" && request.kind !== "remove_item") return null;
  const priced = request.items.filter((item) => item.unitPrice !== null);
  if (priced.length === 0) return null;
  const sum = priced.reduce(
    (total, item) => total + (item.unitPrice ?? 0) * item.quantity,
    0,
  );
  return request.kind === "remove_item" ? -sum : sum;
}

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

/** `GET …/change-requests/` → `{results: [...]}` (ochig'i birinchi). */
export function mapChangeRequestList(raw: unknown): ChangeRequest[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  return list
    .map(mapChangeRequest)
    .filter((request): request is ChangeRequest => request !== null);
}
