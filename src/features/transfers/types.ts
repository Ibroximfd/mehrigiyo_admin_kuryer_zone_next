import { resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asInt,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Filiallararo ta'minot zakazi (B-oqim) — `BACKEND-LOGIST.md` §7.
 *
 * Sklad harakati YO'Q: bu hujjat oqimi xolos (S3 ochiq savoli hal bo'lgach
 * kengayadi). Shuning uchun itemlarda faqat miqdor bor, narx yo'q.
 */
export type FilialTransfer = {
  id: number;
  number: string;
  status: string;
  fromFilial: FilialRef;
  toFilial: FilialRef;
  itemsCount: number;
  note: string | null;
  createdBy: string | null;
  createdAt: Date | null;
  items: TransferItem[];
  timeline: TransferTimelineEntry[];
  rejectReason: string | null;
};

export type FilialRef = { id: number; name: string };

export type TransferItem = {
  product: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
  quantity: number;
};

export type TransferTimelineEntry = {
  status: string;
  by: string | null;
  at: Date | null;
};

export type TransfersPage = {
  transfers: FilialTransfer[];
  totalCount: number;
  hasNextPage: boolean;
};

export type TransferDirection = "incoming" | "outgoing";

/**
 * Transfer holatlari — ranglar mavzu tokenlariga bog'langan (§9 dizayn).
 *
 * `color` matn uchun (to'q, AA), `mark` belgi uchun (yorqin) — buyurtma
 * statuslari bilan bir xil qurilma, izohi `orders/types.ts` da.
 */
export const TRANSFER_STATUSES = [
  {
    value: "requested",
    label: "So'ralgan",
    color: "var(--transfer-requested)",
    mark: "var(--transfer-requested-mark)",
  },
  {
    value: "accepted",
    label: "Qabul qilingan",
    color: "var(--transfer-accepted)",
    mark: "var(--transfer-accepted-mark)",
  },
  {
    value: "preparing",
    label: "Tayyorlanmoqda",
    color: "var(--transfer-preparing)",
    mark: "var(--transfer-preparing-mark)",
  },
  {
    value: "in_transit",
    label: "Yo'lda",
    color: "var(--transfer-in-transit)",
    mark: "var(--transfer-in-transit-mark)",
  },
  {
    value: "received",
    label: "Qabul qilindi",
    color: "var(--transfer-received)",
    mark: "var(--transfer-received-mark)",
  },
  {
    value: "rejected",
    label: "Rad etilgan",
    color: "var(--transfer-rejected)",
    mark: "var(--transfer-rejected-mark)",
  },
  {
    value: "cancelled",
    label: "Bekor qilingan",
    color: "var(--transfer-cancelled)",
    mark: "var(--transfer-cancelled-mark)",
  },
] as const;

export function transferStatusInfo(status: string) {
  return (
    TRANSFER_STATUSES.find((item) => item.value === status) ?? {
      value: status,
      label: status || "—",
      color: "var(--ink-muted)",
      mark: "var(--ink-faint)",
    }
  );
}

/** Yakuniy holatlar — bulardan keyin hech narsa o'zgarmaydi. */
export function isTransferFinal(status: string): boolean {
  return (
    status === "received" || status === "rejected" || status === "cancelled"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function mapFilialRef(raw: unknown): FilialRef {
  const json = asRecord(raw);
  return { id: asInt(json.id), name: asString(json.name) };
}

function mapTransferItem(raw: unknown): TransferItem {
  const json = asRecord(raw);
  const product = asRecord(json.product);
  const image = asOptionalString(product.image ?? product.photo);

  return {
    product: {
      id: asInt(product.id),
      name: asString(product.name ?? product.title),
      imageUrl: image ? resolveMediaUrl(image) : null,
    },
    quantity: asInt(json.quantity, 1),
  };
}

export function mapFilialTransfer(raw: unknown): FilialTransfer {
  const json = asRecord(raw);
  const items = asArray(json.items).map(mapTransferItem);

  return {
    id: asInt(json.id),
    number: asString(json.number) || `TRF-${asInt(json.id)}`,
    status: asString(json.status),
    fromFilial: mapFilialRef(json.from_filial),
    toFilial: mapFilialRef(json.to_filial),
    itemsCount: asInt(json.items_count, items.length),
    note: asOptionalString(json.note),
    createdBy: asOptionalString(json.created_by),
    createdAt: parseDate(json.created_at),
    items,
    timeline: asArray(json.timeline).map((entry) => {
      const item = asRecord(entry);
      return {
        status: asString(item.status),
        by: asOptionalString(item.by),
        at: parseDate(item.at),
      };
    }),
    rejectReason: asOptionalString(json.reject_reason),
  };
}

/** Filiallar ro'yxati (o'z filialisiz) — zakaz nishonini tanlash uchun. */
export function mapFilials(raw: unknown): FilialRef[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw)
      ? asArray(raw.results ?? raw.filials)
      : [];
  return list
    .map((item) => {
      const json = asRecord(item);
      const id = asOptionalInt(json.id);
      return id === null ? null : { id, name: asString(json.name) };
    })
    .filter((item): item is FilialRef => item !== null);
}
