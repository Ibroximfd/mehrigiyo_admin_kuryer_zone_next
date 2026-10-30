import { describe, expect, it } from "vitest";

import { activeFilterChips } from "./active-filters";
import type { ActiveFilterState } from "./active-filters";

const EMPTY: ActiveFilterState = {
  statuses: [],
  period: "all",
  dateFrom: null,
  dateTo: null,
  courierId: null,
  chief: null,
  creator: null,
  paidFilter: null,
  methodFilter: null,
  app: null,
  deliveryDate: null,
  regions: [],
  zones: [],
  districts: [],
  suggested: null,
  tagFilter: null,
  flagFilter: null,
  source: null,
};

describe("tanlangan filtrlar chiplari", () => {
  it("bo'sh holat — chip yo'q", () => {
    expect(activeFilterChips(EMPTY)).toEqual([]);
  });

  it("guruhlar o'qiladigan yozuv bilan; viloyatlar alohida", () => {
    const chips = activeFilterChips(
      {
        ...EMPTY,
        period: "today",
        paidFilter: "unpaid",
        methodFilter: "cash",
        regions: ["fargona", "andijon"],
        zones: ["7", "8"],
        courierId: 4,
        deliveryDate: "tomorrow",
      },
      { courierName: (id) => (id === 4 ? "Jasur" : null) },
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      "Davr: Bugun",
      "Kuryer: Jasur",
      "To'lov: To'lanmagan · Naqd",
      "Yetkazish: Ertaga",
      "Farg'ona viloyati",
      "Andijon viloyati",
      "Zona: 2 ta",
    ]);
    expect(chips.filter((chip) => chip.key === "region").map((chip) => chip.value)).toEqual(["fargona", "andijon"]);
  });

  it("aniq sana davr presetidan ustun; «Hududi noma'lum»", () => {
    const chips = activeFilterChips({ ...EMPTY, period: "month", dateFrom: "2026-10-01", dateTo: "2026-10-30", zones: ["none"] });
    expect(chips.map((chip) => chip.label)).toEqual(["Davr: 2026-10-01 – 2026-10-30", "Hududi noma'lum"]);
  });
});

describe("tezkor preset — tanlangan filtrlar qatorida birinchi", () => {
  it("«Kechikkan» chip bo'lib chiqadi", () => {
    const chips = activeFilterChips({ ...EMPTY, quick: "late", source: "app" });
    expect(chips[0]).toEqual({ key: "quick", label: "Kechikkan" });
  });
});

