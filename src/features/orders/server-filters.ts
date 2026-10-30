import type { OrdersQuery } from "./api";
import { REGIONS } from "./regions";
import { paymentMethodKeys } from "./types";

/**
 * Buyurtma filtrlari — HAMMASI serverda (2026-10-01 C §11).
 *
 * Doska har ustunni 20 qatorga qirqadi: mijoz tomonidagi filtr "N more"
 * ichidagi mos buyurtmalarni umuman ko'rsatmasdi (§11.3 ogohlantirishi).
 * Shuning uchun pillar va tezkor chiplar shu yerda hujjatdagi parametr
 * nomlariga aylanadi. Mijozda faqat serverda parametri yo'q ikki chip
 * qoladi (`client-filters.ts`): "Yangi" va "Yangi xabar".
 *
 * Sof modul — URL holatidan so'rov qismiga.
 */

/**
 * "Yaratdi" pilli → `created_by_kind`. Server admin va sotuvchini AJRATADI
 * (§11.3), panel esa ularni bitta "Operator" deb ko'rsatadi (javobdagi
 * `created_by.kind` bloki ham ularni birlashtiradi) — ikkala kalit ketadi.
 */
export const CREATOR_FILTERS = [
  { value: "operator", label: "Operator", kinds: ["operator", "admin"] },
  { value: "doctor", label: "Shifokor", kinds: ["doctor"] },
  { value: "client", label: "Mijoz o'zi", kinds: ["client"] },
  { value: "reception", label: "Shovrum", kinds: ["reception"] },
  { value: "sino_ai", label: "Sino AI", kinds: ["sino_ai"] },
] as const;

/** "Ilova" pilli → `has_app` (akkaunt + 90 kunda faol qurilma, §11.3). */
export const APP_FILTERS = [
  { value: "yes", label: "Ilova bor" },
  { value: "no", label: "Ilova yo'q" },
] as const;

/** "Yetk. sana" pilli → `delivery_date` bucketi (Toshkent kuni). */
export const DELIVERY_DATE_FILTERS = [
  { value: "today", label: "Bugun" },
  { value: "tomorrow", label: "Ertaga" },
  { value: "overdue", label: "O'tib ketgan" },
  { value: "none", label: "Sana yo'q" },
] as const;

/** "Taklif" pilli → `suggested` (2026-10-15). */
export const SUGGESTED_FILTERS = [
  { value: "yes", label: "Taklif bor" },
  { value: "none", label: "Taklifsiz" },
] as const;

/** Zona pillidagi maxsus qiymat — "Hududi noma'lum" savati (`zone=none`). */
export const ZONE_NONE = "none";

/** "Onlayn to'langan" chipi: naqd (`cash`, `manual`) bo'lmagan usullar. */
const NON_CASH_METHODS = ["card", "cashback"];

export type ServerFilterState = {
  creator: string | null;
  app: string | null;
  deliveryDate: string | null;
  /** Viloyat kodlari (URL `region`, vergul bilan). */
  regions?: readonly string[];
  quick: string | null;
  /** To'lov holati pilli: `unpaid` · `paid` · `refunded`. */
  paidFilter: string | null;
  methodFilter: string | null;
  courierId: number | null;
  /** Bosh kuryer filtri (URL `chief`): id yoki `none`. */
  chief?: string | null;
  /** Tuman kodlari (URL `district`). */
  districts?: readonly string[];
  /** Zona id lari yoki `none` (URL `zone`). */
  zones?: readonly string[];
  suggested?: string | null;
  /** "Belgi" pilli (URL `flag`): `address-issue` → `?geocode=review`. */
  flag?: string | null;
};

export type ServerFilterParams = Required<
  Pick<
    OrdersQuery,
    | "createdByKinds"
    | "hasApp"
    | "deliveryDate"
    | "regions"
    | "overdue"
    | "paymentStates"
    | "paymentMethods"
    | "courierId"
    | "chief"
    | "districts"
    | "zones"
    | "suggested"
    | "geocode"
  >
>;

const PAYMENT_STATES = new Set(["paid", "unpaid", "with_courier", "refunded"]);

/**
 * URL holatidan server parametrlari. Tezkor chip o'z kalitida pillni
 * BOSADI (chip — o'sha filtrning tez yo'li): masalan "Bugun yetkaziladi"
 * yoqilganda `delivery_date=today` ketadi, pilldagi boshqa bucket emas.
 */
export function serverFilterParams(state: ServerFilterState): ServerFilterParams {
  const creator = CREATOR_FILTERS.find((item) => item.value === state.creator);
  const deliveryDate = DELIVERY_DATE_FILTERS.find((item) => item.value === state.deliveryDate);

  const params: ServerFilterParams = {
    createdByKinds: creator ? [...creator.kinds] : [],
    hasApp: state.app === "yes" ? true : state.app === "no" ? false : null,
    deliveryDate: deliveryDate?.value ?? null,
    // Faqat ENUM kodi — manzil matni ishlamaydi (§11.3).
    regions: [...new Set((state.regions ?? []).filter((code) => REGIONS.some((item) => item.value === code)))],
    overdue: null,
    paymentStates: state.paidFilter && PAYMENT_STATES.has(state.paidFilter) ? [state.paidFilter] : [],
    paymentMethods: paymentMethodKeys(state.methodFilter),
    courierId: state.courierId,
    chief: chiefParam(state.chief),
    districts: [...new Set((state.districts ?? []).map((code) => code.trim()).filter(Boolean))],
    zones: zoneFilterValue(state.zones ?? []),
    suggested:
      state.suggested === "yes" || state.suggested === "none" ? state.suggested : null,
    geocode: state.flag === "address-issue" ? "review" : null,
  };

  switch (state.quick) {
    case "no_courier":
      // Logist zakazni bosh kuryerga beradi (2026-10-30): «Bosh kuryersiz»
      // — hali hech kimga berilmagan (`chief=none`).
      params.chief = "none";
      break;
    case "due_today":
      params.deliveryDate = "today";
      break;
    case "late":
      // `delivery_date=overdue` ning qisqasi — yopilganlar kirmaydi.
      params.overdue = true;
      break;
    case "online_paid":
      params.paymentStates = ["paid"];
      params.paymentMethods = [...NON_CASH_METHODS];
      break;
    default:
      break;
  }

  return params;
}

/** URL `chief` → so'rov: musbat id yoki `none`; boshqasi — filtrsiz. */
export function chiefParam(value: string | null | undefined): number | "none" | null {
  if (value === "none") return "none";
  const id = Number.parseInt(value ?? "", 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Zona pillining URL qiymatlari → so'rov. `none` tanlangan bo'lsa u yolg'iz
 * ketadi ("Hududi noma'lum" boshqa zonalar bilan birlasha olmaydi).
 */
export function zoneFilterValue(values: readonly string[]): number[] | "none" {
  if (values.includes(ZONE_NONE)) return "none";
  return [
    ...new Set(
      values
        .map((value) => Number.parseInt(value, 10))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

/** Zona pillida qiymatni almashtirish: `none` va zonalar bir-birini chiqaradi. */
export function toggleZoneFilter(current: readonly string[], value: string): string[] {
  if (value === ZONE_NONE) return current.includes(ZONE_NONE) ? [] : [ZONE_NONE];
  const base = current.filter((item) => item !== ZONE_NONE);
  return base.includes(value) ? base.filter((item) => item !== value) : [...base, value];
}
