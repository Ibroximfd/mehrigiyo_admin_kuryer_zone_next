/**
 * Zakazlar tartibi — serverda (`ordering`, 60-javob, prodda 6/6 tekshirilgan).
 * Server sukuti `created_at` bo'lgani uchun tartib HAR DOIM aniq yuboriladi.
 */
export const ORDER_SORTS = ["arrived_asc", "arrived_desc", "amount_desc", "amount_asc"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

/** Sukut — kelgan vaqti bo'yicha eski birinchi: navbat bilan taqsimlanadi. */
export const DEFAULT_ORDER_SORT: OrderSort = "arrived_asc";

export const ORDER_SORT_LABELS: Record<OrderSort, string> = {
  arrived_asc: "Kelgan vaqti: eski birinchi",
  arrived_desc: "Kelgan vaqti: yangi birinchi",
  amount_desc: "Summa: katta birinchi",
  amount_asc: "Summa: kichik birinchi",
};

/** Serverga yuboriladigan `ordering`. */
export const SERVER_ORDERING: Record<OrderSort, string> = {
  arrived_asc: "shipped_at",
  arrived_desc: "-shipped_at",
  amount_desc: "-payable_amount",
  amount_asc: "payable_amount",
};

/** `any` — tanlangan mahsulotlardan biri bor; `all` — hammasi birga bor. */
export type ProductMatch = "any" | "all";

/**
 * Tuman bo'yicha tez ro'yxatlar (60-javob): `no_zone` → `has_zone=false`,
 * qolganlari → `district_state=…`. Bir vaqtda bittasi.
 */
export const DISTRICT_FILTERS = ["no_zone", "guess", "missing", "auto"] as const;
export type DistrictFilter = (typeof DISTRICT_FILTERS)[number];

export const DISTRICT_FILTER_LABELS: Record<DistrictFilter, string> = {
  no_zone: "Zonasi yo'q",
  guess: "Tuman mos kelmadi",
  missing: "Tuman aniqlanmadi",
  auto: "Tuman avto aniqlangan",
};
