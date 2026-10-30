import { QUICK_FILTERS } from "./client-filters";
import { regionLabel } from "./regions";
import { APP_FILTERS, CREATOR_FILTERS, DELIVERY_DATE_FILTERS, SUGGESTED_FILTERS, ZONE_NONE } from "./server-filters";
import { ORDER_TAGS } from "./tags";
import { DEFAULT_ORDER_PERIOD, LOGIST_STATUSES, ORDER_PERIODS, PAYMENT_METHOD_FILTERS, PAYMENT_STATE_FILTERS } from "./types";

/**
 * Tanlangan filtrlar — o'chiriladigan chiplar qatori uchun (Bitrix filtridagi
 * «tanlangan» qatori kabi). Har chip bitta guruh: `key` bo'yicha komponent
 * shu guruhni tozalaydi. Viloyatlar har biri alohida chip (ko'p tanlov).
 */
export type ActiveFilterKey =
  | "status"
  | "period"
  | "courier"
  | "chief"
  | "creator"
  | "payment"
  | "app"
  | "deliveryDate"
  | "region"
  | "zone"
  | "district"
  | "suggested"
  | "tag"
  | "flag"
  | "source"
  | "quick";

export type ActiveFilterChip = { key: ActiveFilterKey; value?: string; label: string };

export type ActiveFilterState = {
  statuses: readonly string[];
  period: string;
  dateFrom: string | null;
  dateTo: string | null;
  courierId: number | null;
  chief: string | null;
  creator: string | null;
  paidFilter: string | null;
  methodFilter: string | null;
  app: string | null;
  deliveryDate: string | null;
  regions: readonly string[];
  zones: readonly string[];
  districts: readonly string[];
  suggested: string | null;
  tagFilter: string | null;
  flagFilter: string | null;
  source: string | null;
  /** Tezkor preset (Yangi, Kechikkan…) — endi «Filtrlar» ichida, shu yerda chip. */
  quick?: string | null;
};

const FLAG_LABELS: Record<string, string> = {
  "no-address": "Manzilsiz",
  "address-issue": "Manzil muammosi",
  duplicate: "Dublikat",
};

function labelOf(list: ReadonlyArray<{ value: string; label: string }>, value: string): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

function dateText(from: string | null, to: string | null): string {
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from ? `${from} dan` : `${to} gacha`;
}

export function activeFilterChips(
  state: ActiveFilterState,
  lookups: { courierName?: (id: number) => string | null; chiefName?: (id: number) => string | null } = {},
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (state.statuses.length) {
    chips.push({ key: "status", label: `Status: ${state.statuses.map((value) => labelOf(LOGIST_STATUSES, value)).join(", ")}` });
  }
  if (state.dateFrom || state.dateTo) chips.push({ key: "period", label: `Davr: ${dateText(state.dateFrom, state.dateTo)}` });
  else if (state.period !== DEFAULT_ORDER_PERIOD) chips.push({ key: "period", label: `Davr: ${labelOf(ORDER_PERIODS, state.period)}` });
  if (state.courierId !== null) {
    chips.push({ key: "courier", label: `Kuryer: ${lookups.courierName?.(state.courierId) ?? `#${state.courierId}`}` });
  }
  if (state.chief === "none") chips.push({ key: "chief", label: "Bosh kuryersiz" });
  else if (state.chief) {
    const id = Number(state.chief);
    chips.push({ key: "chief", label: `Bosh kuryer: ${lookups.chiefName?.(id) ?? `#${state.chief}`}` });
  }
  if (state.creator) chips.push({ key: "creator", label: `Yaratdi: ${labelOf(CREATOR_FILTERS, state.creator)}` });
  const payment = [
    state.paidFilter ? labelOf(PAYMENT_STATE_FILTERS, state.paidFilter) : null,
    state.methodFilter ? labelOf(PAYMENT_METHOD_FILTERS, state.methodFilter) : null,
  ].filter(Boolean);
  if (payment.length) chips.push({ key: "payment", label: `To'lov: ${payment.join(" · ")}` });
  if (state.app) chips.push({ key: "app", label: labelOf(APP_FILTERS, state.app) });
  if (state.deliveryDate) chips.push({ key: "deliveryDate", label: `Yetkazish: ${labelOf(DELIVERY_DATE_FILTERS, state.deliveryDate)}` });
  for (const region of state.regions) chips.push({ key: "region", value: region, label: regionLabel(region) || region });
  if (state.zones.length) {
    chips.push({
      key: "zone",
      label: state.zones.includes(ZONE_NONE) ? "Hududi noma'lum" : `Zona: ${state.zones.length} ta`,
    });
  }
  if (state.districts.length) chips.push({ key: "district", label: `Tuman: ${state.districts.length} ta` });
  if (state.suggested) chips.push({ key: "suggested", label: labelOf(SUGGESTED_FILTERS, state.suggested) });
  if (state.tagFilter) chips.push({ key: "tag", label: `Teg: ${labelOf(ORDER_TAGS, state.tagFilter)}` });
  if (state.flagFilter) chips.push({ key: "flag", label: FLAG_LABELS[state.flagFilter] ?? state.flagFilter });
  if (state.source) chips.push({ key: "source", label: `Manba: ${state.source}` });
  if (state.quick) chips.unshift({ key: "quick", label: labelOf(QUICK_FILTERS, state.quick) });
  return chips;
}
