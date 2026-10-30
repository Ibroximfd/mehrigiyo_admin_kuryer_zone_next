import type { LogistOrder } from "./types";

/**
 * Doska ustunlari va ro'yxat tartibi — logist tanlaydi, server qo'llaydi
 * (2026-10-01 C §8).
 *
 * Tartib **serverda**: `?limit=` kesimi tartibdan KEYIN qo'llanadi, ya'ni
 * mijozdagi qayta saralash faqat yuklangan 20 ta ichida ishlardi va
 * "N more" ichidagilar yo'qolardi (§8.5). Shuning uchun server javobi
 * qayta saralanmaydi. Mijoz tomonidagi taqqoslash faqat bitta kartani
 * JOYLASH uchun (WS kartasi, optimistik ko'chirish) — o'sha uch qatlamli
 * qoida bilan: qadalgan → `board_position` → tanlangan kalit → `-id`.
 */
export const ORDER_SORTS = [
  { value: "status", label: "Status bo'yicha (yangi tepada)", ordering: "-status_changed_at" },
  { value: "created", label: "Yaratilgan sana", ordering: "-created_at" },
  { value: "delivery", label: "Yetkazish sanasi", ordering: "delivery_date" },
  { value: "amount", label: "Summa", ordering: "-total_amount" },
] as const;

export type OrderSort = (typeof ORDER_SORTS)[number]["value"];

export const DEFAULT_ORDER_SORT: OrderSort = "status";

export function isOrderSort(value: unknown): value is OrderSort {
  return ORDER_SORTS.some((item) => item.value === value);
}

/**
 * Server qabul qiladigan TO'LIQ oq ro'yxat (§8.1). Noma'lum qiymat `400`
 * bermaydi — jimgina sukutga tushadi, shuning uchun imlo shu yerda
 * tekshiriladi (aks holda panel "tanlangan tartib" deb sukutni ko'rsatardi).
 */
export const ORDERING_FIELDS = [
  "created_at",
  "total_amount",
  "id",
  "status_changed_at",
  "delivery_date",
] as const;

export type OrderingField = (typeof ORDERING_FIELDS)[number];

export function isValidOrdering(value: string | null | undefined): value is string {
  if (!value) return false;
  const field = value.startsWith("-") ? value.slice(1) : value;
  return (ORDERING_FIELDS as readonly string[]).includes(field);
}

/** Tanlovdan `?ordering=` qiymati. */
export function serverOrdering(sort: OrderSort): string {
  return ORDER_SORTS.find((item) => item.value === sort)?.ordering ?? "-status_changed_at";
}

export type PlaceableOrder = Pick<
  LogistOrder,
  "id" | "createdAt" | "pinnedAt" | "statusChangedAt" | "deliveryDate" | "totalAmount"
> &
  Partial<Pick<LogistOrder, "boardPosition">>;

/** `NULLS LAST` — qiymati yo'q qator yo'nalishdan qat'i nazar oxirida (§8.3). */
function compareNullable(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a === b ? 0 : direction * (a - b);
}

function fieldValue(order: PlaceableOrder, field: OrderingField): number | null {
  switch (field) {
    case "created_at":
      return order.createdAt?.getTime() ?? null;
    case "status_changed_at":
      return order.statusChangedAt?.getTime() ?? null;
    case "delivery_date": {
      const time = order.deliveryDate ? Date.parse(order.deliveryDate) : Number.NaN;
      return Number.isFinite(time) ? time : null;
    }
    case "total_amount":
      return order.totalAmount;
    default:
      return null;
  }
}

/**
 * Server tartibining mijozdagi aksi — FAQAT bitta kartani joylash uchun.
 * `ordering` — o'sha so'rovga ketgan qiymat (noto'g'ri bo'lsa server sukuti
 * `-created_at` deb olinadi).
 */
export function compareByOrdering(a: PlaceableOrder, b: PlaceableOrder, ordering: string): number {
  // 1) Qadalgan doim tepada, keyin qadalgani oldinda (§8.5).
  const pinned = compareNullable(a.pinnedAt?.getTime() ?? null, b.pinnedAt?.getTime() ?? null, -1);
  if (pinned) return pinned;

  // 2) Qo'lda sudrab qo'yilgan tartib.
  const ap = a.boardPosition ?? null;
  const bp = b.boardPosition ?? null;
  if (ap !== null && bp !== null && ap !== bp) return ap - bp;

  // 3) Tanlangan kalit; `id` uzluvchidan boshqa ma'no bermaydi.
  const valid = isValidOrdering(ordering) ? ordering : "-created_at";
  const direction = valid.startsWith("-") ? -1 : 1;
  const field = (direction === -1 ? valid.slice(1) : valid) as OrderingField;
  if (field !== "id") {
    // Sana maydonlari NULLS LAST, summa esa hech qachon bo'sh emas.
    const primary = compareNullable(fieldValue(a, field), fieldValue(b, field), direction);
    if (primary) return primary;
  }

  // Barqaror uzluvchi — `-id` (§8.2).
  if (a.id === b.id) return 0;
  const idDirection = field === "id" ? direction : -1;
  return a.id < b.id ? -idDirection : idDirection;
}

/**
 * Kartani tartibdagi o'rniga qo'yadi — qolgan qatorlar server tartibida
 * QOLADI (qayta saralanmaydi).
 *
 * `hasHidden` — ustunning bir qismi yuklanmagan ("N more"). Karta yuklangan
 * oxirgi qatordan ham keyin tushsa, u o'sha yashirin qismga tegishli:
 * oxiriga yopishtirilmaydi (aks holda server tartibiga zid qator paydo
 * bo'lardi) — faqat ustun soni o'zgaradi.
 */
export function insertByOrdering<TOrder extends PlaceableOrder>(
  orders: readonly TOrder[],
  order: TOrder,
  ordering: string,
  hasHidden = false,
): TOrder[] {
  const index = orders.findIndex((item) => compareByOrdering(order, item, ordering) < 0);
  if (index === -1) return hasHidden ? [...orders] : [...orders, order];
  return [...orders.slice(0, index), order, ...orders.slice(index)];
}
