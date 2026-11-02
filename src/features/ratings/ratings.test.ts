import { describe, expect, it } from "vitest";

import { formatRating, hasActiveRatingFilters, mapChiefRatings, ratingSearchParams } from "./types";
import { NO_RATING_FILTERS } from "./use-ratings";

const courier = (id: number) => ({ id, name: `K${id}`, chief_id: 5, region: "fargona" });

describe("reyting: chief/ratings (ILOVA_HOLAT… §7.1, §7.3, §8)", () => {
  const data = mapChiefRatings({
    count: 42,
    next: "?page=2",
    previous: null,
    results: [
      {
        id: 108,
        order: { id: "8d2e", order_number: "MG-241101-0042", filial_id: 1 },
        courier: courier(17),
        stars: 5,
        comment: "Tez va muloyim keldi",
        created_at: "2026-11-01T15:02:11.004000+05:00",
      },
      { id: 109, order: { id: "9a", order_number: "MG-2" }, courier: courier(19), stars: 2, comment: "", created_at: "2026-11-01T16:00:00+05:00" },
    ],
    summary: { avg: 4.31, count: 42, distribution: { "1": 2, "2": 1, "3": 4, "4": 10, "5": 25 }, with_comment: 18, low_count: 3 },
    by_courier: [
      { courier: courier(20), avg: null, count: 0, distribution: {}, score: null },
      { courier: courier(19), avg: 3.9, count: 4, distribution: { "4": 4 }, score: 4.1 },
      { courier: courier(17), avg: 4.8, count: 20, distribution: { "5": 17 }, score: 4.7 },
    ],
    formula: { score: { key: "score", name: "Kuryer reytingi", how: "Bayes", unit: "1–5", direction: "desc", null_when: "baho yo'q" } },
  });

  it("qatorlar: zakaz raqami, kuryer, yulduz; bo'sh izoh — `null`", () => {
    expect(data.rows[0]).toMatchObject({ orderNumber: "MG-241101-0042", stars: 5, comment: "Tez va muloyim keldi", courier: { id: 17, name: "K17" } });
    expect(data.rows[1]?.comment).toBeNull();
    expect(data).toMatchObject({ total: 42, hasMore: true });
  });

  it("jamlanma serverdan; taqsimot raqam kalitlari bilan", () => {
    expect(data.summary).toEqual({ avg: 4.31, count: 42, distribution: { 1: 2, 2: 1, 3: 4, 4: 10, 5: 25 }, withComment: 18, lowCount: 3 });
  });

  it("kuryerlar `score` bo'yicha (desc), `null` — oxirida", () => {
    expect(data.byCourier.map((row) => row.courier.id)).toEqual([17, 19, 20]);
    expect(data.formula).toEqual({ name: "Kuryer reytingi", how: "Bayes", unit: "1–5", direction: "desc", nullWhen: "baho yo'q" });
  });

  it("`direction: asc` — kami yaxshi; formula yo'q — `null`", () => {
    const asc = mapChiefRatings({
      by_courier: [
        { courier: courier(1), score: 4 },
        { courier: courier(2), score: null },
        { courier: courier(3), score: 2 },
      ],
      formula: { score: { name: "X", direction: "asc" } },
    });
    expect(asc.byCourier.map((row) => row.courier.id)).toEqual([3, 1, 2]);
    expect(mapChiefRatings({ results: [] }).formula).toBeNull();
  });

  it("`null` ≠ `0`: baho yo'q — «—», hech qachon «0.0»", () => {
    const empty = mapChiefRatings({ results: [], summary: { avg: null, count: 0 } });
    expect(empty.summary.avg).toBeNull();
    expect(formatRating(empty.summary.avg)).toBe("—");
    expect(formatRating(4.31)).toBe("4.3");
    expect(formatRating(0)).toBe("0.0");
  });

  it("filtrlar so'rovga: vergulli yulduzlar, `has_comment`, 1-sahifa yuborilmaydi", () => {
    expect(ratingSearchParams(NO_RATING_FILTERS)).toEqual({
      date_from: null,
      date_to: null,
      stars: null,
      courier: null,
      region: null,
      has_comment: null,
      page: null,
    });
    const params = ratingSearchParams({ ...NO_RATING_FILTERS, stars: [2, 1], courierId: 17, hasComment: false, dateFrom: "2026-10-01", page: 3 });
    expect(params).toMatchObject({ stars: "1,2", courier: 17, has_comment: "false", date_from: "2026-10-01", page: 3 });
    expect(hasActiveRatingFilters(NO_RATING_FILTERS)).toBe(false);
    expect(hasActiveRatingFilters({ ...NO_RATING_FILTERS, hasComment: true })).toBe(true);
  });
});
