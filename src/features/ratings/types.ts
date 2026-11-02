import { parseDate } from "@/lib/format";
import { asPage } from "@/lib/paginate";
import { asArray, asInt, asOptionalNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Kuryer baholari (`ILOVA_HOLAT_VA_KURYER_REYTINGI` §7.1, §7.3–7.5, §8):
 * `GET chief/ratings/` — faqat o'z kuryerlari (joriy boshlig'i = men).
 * Hisob-kitob serverda: `summary` va `by_courier` BUTUN filtrlangan to'plamdan,
 * sahifadan emas. Mijoz ismi/telefoni yo'q — faqat zakaz raqami.
 * ⚠️ `null` ≠ `0`: baho yo'q → «—», hech qachon «0.0».
 */

export const STARS = [5, 4, 3, 2, 1] as const;
export type Star = (typeof STARS)[number];

/** Yulduz taqsimoti: `{"1": 2, …, "5": 25}`. */
export type StarDistribution = Record<Star, number>;

export type RatedCourier = { id: number; name: string; region: string | null };

export type RatingRow = {
  id: number;
  orderNumber: string;
  courier: RatedCourier | null;
  stars: number;
  comment: string | null;
  createdAt: Date | null;
};

export type RatingSummary = {
  /** `null` — davrda bitta ham baho yo'q. */
  avg: number | null;
  count: number;
  distribution: StarDistribution;
  withComment: number;
  lowCount: number;
};

export type CourierRating = {
  courier: RatedCourier;
  avg: number | null;
  count: number;
  distribution: StarDistribution;
  /** Bayes tuzatilgan reyting (§7.4); baho olmagan kuryerda `null`. */
  score: number | null;
};

/** Server formulasi (§7.3): ustun nomi, izoh, yo'nalish. Javobda bo'lmasa `null`. */
export type RatingFormula = {
  name: string;
  how: string | null;
  unit: string | null;
  /** `desc` — ko'p yaxshi, `asc` — kam yaxshi. */
  direction: "asc" | "desc";
  nullWhen: string | null;
};

export type ChiefRatings = {
  rows: RatingRow[];
  total: number | null;
  hasMore: boolean;
  summary: RatingSummary;
  byCourier: CourierRating[];
  formula: RatingFormula | null;
};

function mapDistribution(raw: unknown): StarDistribution {
  const json = asRecord(raw);
  return { 1: asInt(json["1"]), 2: asInt(json["2"]), 3: asInt(json["3"]), 4: asInt(json["4"]), 5: asInt(json["5"]) };
}

function mapCourier(raw: unknown): RatedCourier | null {
  if (!isRecord(raw)) return null;
  return { id: asInt(raw.id), name: asString(raw.name ?? raw.full_name), region: asOptionalString(raw.region) };
}

export function mapRatingRow(raw: unknown): RatingRow {
  const json = asRecord(raw);
  const order = asRecord(json.order);
  return {
    id: asInt(json.id),
    orderNumber: asString(order.order_number ?? order.number ?? order.id),
    courier: mapCourier(json.courier),
    stars: asInt(json.stars),
    comment: asOptionalString(json.comment),
    createdAt: parseDate(json.created_at),
  };
}

function mapFormula(raw: unknown): RatingFormula | null {
  const score = asRecord(asRecord(raw).score);
  const name = asOptionalString(score.name);
  if (!name) return null;
  return {
    name,
    how: asOptionalString(score.how),
    unit: asOptionalString(score.unit),
    direction: score.direction === "asc" ? "asc" : "desc",
    nullWhen: asOptionalString(score.null_when),
  };
}

/**
 * Kuryerlar reyting bo'yicha: formula yo'nalishiga qarab, `null` qatorlar doim oxirida
 * (§7.5 — reyting boshida «ma'lumot yo'q» turmasin). Teng bo'lsa — baho soni ko'pi oldin.
 */
export function sortCourierRatings(rows: readonly CourierRating[], direction: "asc" | "desc"): CourierRating[] {
  const value = (row: CourierRating) => row.score ?? row.avg;
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null || right === null) return left === right ? b.count - a.count : left === null ? 1 : -1;
    if (left !== right) return direction === "asc" ? left - right : right - left;
    return b.count - a.count;
  });
}

export function mapChiefRatings(raw: unknown): ChiefRatings {
  const json = asRecord(raw);
  const page = asPage(raw);
  const summary = asRecord(json.summary);
  const formula = mapFormula(json.formula);
  const byCourier = asArray(json.by_courier).flatMap((entry) => {
    const row = asRecord(entry);
    const courier = mapCourier(row.courier);
    if (!courier) return [];
    return [
      {
        courier,
        avg: asOptionalNumber(row.avg ?? row.rating_avg),
        count: asInt(row.count ?? row.ratings_count),
        distribution: mapDistribution(row.distribution),
        score: asOptionalNumber(row.score),
      },
    ];
  });
  return {
    rows: page.items.map(mapRatingRow),
    total: page.total,
    hasMore: page.hasMore,
    summary: {
      avg: asOptionalNumber(summary.avg),
      count: asInt(summary.count),
      distribution: mapDistribution(summary.distribution),
      withComment: asInt(summary.with_comment),
      lowCount: asInt(summary.low_count),
    },
    byCourier: sortCourierRatings(byCourier, formula?.direction ?? "desc"),
    formula,
  };
}

/** Reyting qiymati: bitta kasr, `null` → «—». */
export function formatRating(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

// ── Filtrlar (URLda, §7.1) ───────────────────────────────────────────────────

export type RatingFilters = {
  dateFrom: string | null;
  dateTo: string | null;
  /** Bir nechta yulduz — vergul bilan. */
  stars: number[];
  courierId: number | null;
  region: string | null;
  hasComment: boolean | null;
  page: number;
};

export function ratingSearchParams(filters: RatingFilters): Record<string, string | number | null> {
  return {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    stars: filters.stars.length ? [...filters.stars].sort().join(",") : null,
    courier: filters.courierId,
    region: filters.region,
    has_comment: filters.hasComment === null ? null : String(filters.hasComment),
    page: filters.page > 1 ? filters.page : null,
  };
}

export function hasActiveRatingFilters(filters: RatingFilters): boolean {
  return Boolean(
    filters.dateFrom || filters.dateTo || filters.stars.length || filters.courierId !== null || filters.region || filters.hasComment !== null,
  );
}
