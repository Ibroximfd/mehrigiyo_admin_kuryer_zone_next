import { describe, expect, it } from "vitest";

import { courierFilterParams } from "@/features/couriers/api";
import { buildOrderFilters } from "@/features/orders/api";

import {
  AREA_ZONE_NONE,
  EMPTY_AREA,
  EMPTY_AREA_COUNTS,
  areaChips,
  couriersAreaQuery,
  defaultArea,
  districtAreaOptions,
  mapAreaCounts,
  ordersAreaQuery,
  regionAreaOptions,
  areaFromUrl,
  removeAreaChip,
  toggleAreaDistrict,
  toggleAreaRegion,
  toggleAreaZone,
  zoneAreaOptions,
} from "./area-filter";
import type { AreaFilter } from "./area-filter";
import type { RegionDistricts } from "./types";

const ZONES = [
  { id: 7, name: "Qo'qon", region: "fargona", isActive: true, districtCodes: ["fargona/qoqon_sh", "fargona/uchkoprik"] },
  { id: 8, name: "Rishton", region: "fargona", isActive: true, districtCodes: ["fargona/rishton"] },
  { id: 9, name: "Eski", region: "fargona", isActive: false, districtCodes: ["fargona/eski"] },
  { id: 20, name: "Chilonzor", region: "toshkent_shahar", isActive: true, districtCodes: ["toshkent_shahar/chilonzor"] },
];

const DICTIONARY: RegionDistricts[] = [
  {
    region: "fargona",
    name: "Farg'ona",
    districts: [
      { code: "fargona/qoqon_sh", region: "fargona", nameUz: "Qo'qon shahri", nameRu: "Коканд", nameUzCyrl: null, kind: "city", isActive: true },
      { code: "fargona/uchkoprik", region: "fargona", nameUz: "Uchko'prik", nameRu: null, nameUzCyrl: null, kind: null, isActive: true },
      { code: "fargona/rishton", region: "fargona", nameUz: "Rishton", nameRu: "Риштан", nameUzCyrl: null, kind: null, isActive: true },
      { code: "fargona/eski", region: "fargona", nameUz: "Eski", nameRu: null, nameUzCyrl: null, kind: null, isActive: false },
    ],
  },
  {
    region: "toshkent_shahar",
    name: "Toshkent shahri",
    districts: [
      { code: "toshkent_shahar/chilonzor", region: "toshkent_shahar", nameUz: "Chilonzor", nameRu: "Чиланзар", nameUzCyrl: null, kind: null, isActive: true },
    ],
  },
];

/** Server javobi (backend A1) — `none`: qiymati yo'qlar. */
const COUNTS_JSON = {
  total: 8,
  by_region: { fargona: 5, toshkent_shahar: 1, none: 2 },
  by_zone: { "7": 3, "8": 1, "20": 1, "42": 1, none: 2 },
  by_district: { "fargona/qoqon_sh": 2, "fargona/rishton": 1, "fargona/uchkoprik": 1, none: 3 },
};
const COUNTS = mapAreaCounts(COUNTS_JSON);

describe("server hisobi (`unassigned-counts/`)", () => {
  it("viloyat, zona va tuman xaritalari; `none` saqlanadi", () => {
    expect(COUNTS.total).toBe(8);
    expect(COUNTS.byRegion.get("fargona")).toBe(5);
    expect(COUNTS.byRegion.get(AREA_ZONE_NONE)).toBe(2);
    expect(COUNTS.byZone.get("7")).toBe(3);
    expect(COUNTS.byZone.get(AREA_ZONE_NONE)).toBe(2);
    expect(COUNTS.byDistrict.get("fargona/qoqon_sh")).toBe(2);
    expect(COUNTS.byDistrict.get(AREA_ZONE_NONE)).toBe(3);
  });

  it("`total` bo'lmasa zona yig'indisi; nol va yaroqsiz qiymatlar tushib qoladi", () => {
    const counts = mapAreaCounts({ by_zone: { "7": "2", none: 1, "8": 0, "9": "x" } });
    expect(counts.total).toBe(3);
    expect([...counts.byZone.keys()]).toEqual(["7", "none"]);
    expect(counts.byRegion.size).toBe(0);
    expect(mapAreaCounts(null)).toEqual(EMPTY_AREA_COUNTS);
  });
});

describe("kaskad tanlovlari", () => {
  const counts = COUNTS;

  it("viloyatlar lug'at tartibida, sonlar bilan; `none` viloyat bo'lmaydi", () => {
    const options = regionAreaOptions(DICTIONARY, counts);
    expect(options.map((option) => [option.value, option.count])).toEqual([
      ["fargona", 5],
      ["toshkent_shahar", 1],
    ]);
    expect(regionAreaOptions(DICTIONARY, null)[0]?.count).toBeUndefined();
    // Lug'atda yo'q viloyat hisobda bo'lsa — kodi bilan chiqadi.
    const extra = regionAreaOptions(DICTIONARY, mapAreaCounts({ by_region: { andijon: 2, none: 1 } }));
    expect(extra.map((option) => option.value)).toEqual(["fargona", "toshkent_shahar", "andijon"]);
  });

  it("zonalar: viloyatniki → hisobda bor, ro'yxatda yo'q zona → Hududi noma'lum; nofaol faqat buyurtmali bo'lsa", () => {
    const fargona = zoneAreaOptions(["fargona"], ZONES, counts, "Hududi noma'lum");
    expect(fargona.map((option) => option.value)).toEqual(["7", "8", AREA_ZONE_NONE]);
    // `none` viloyat kesimida yo'q — son ko'rsatilmaydi.
    expect(fargona.map((option) => option.count)).toEqual([3, 1, undefined]);

    const all = zoneAreaOptions([], ZONES, counts, "Hududi noma'lum");
    expect(all.map((option) => option.value)).toEqual(["7", "8", "20", "42", AREA_ZONE_NONE]);
    expect(all.find((option) => option.value === "42")?.label).toBe("#42");
    expect(all.at(-1)?.count).toBe(2);

    // Ikki viloyat — ikkalasining zonalari.
    const two = zoneAreaOptions(["fargona", "toshkent_shahar"], ZONES, counts, "—");
    expect(two.map((option) => option.value)).toEqual(["7", "8", "20", AREA_ZONE_NONE]);

    // Nofaol zona buyurtmali bo'lsa chiqadi.
    const withOld = zoneAreaOptions(["fargona"], ZONES, mapAreaCounts({ by_zone: { "9": 1 } }), "—");
    expect(withOld.map((option) => option.value)).toEqual(["7", "8", "9", AREA_ZONE_NONE]);
  });

  it("tumanlar: zona tanlansa — uning district_codes; aks holda viloyatning faol tumanlari", () => {
    const byZone = districtAreaOptions({ regions: ["fargona"], zones: ["7"] }, ZONES, DICTIONARY, counts, "ru");
    expect(byZone.map((option) => option.value)).toEqual(["fargona/qoqon_sh", "fargona/uchkoprik"]);
    expect(byZone[0]?.label).toBe("Коканд");
    expect(byZone[0]?.count).toBe(2);

    const byRegion = districtAreaOptions({ regions: ["fargona"], zones: [] }, ZONES, DICTIONARY, null, "uz-latn");
    expect(byRegion.map((option) => option.value)).toEqual([
      "fargona/qoqon_sh",
      "fargona/uchkoprik",
      "fargona/rishton",
    ]);

    // Zona kodi lug'atda yo'q — kodi bilan chiqadi, filtr yo'qolmaydi.
    const odd = districtAreaOptions(
      { regions: [], zones: ["9"] },
      [{ ...ZONES[2]!, districtCodes: ["fargona/yangi"] }],
      DICTIONARY,
      null,
      "uz-latn",
    );
    expect(odd.map((option) => option.value)).toEqual(["fargona/yangi"]);

    // Ikki zona — tumanlari birlashadi.
    const both = districtAreaOptions({ regions: [], zones: ["7", "8"] }, ZONES, DICTIONARY, null, "uz-latn");
    expect(both.map((option) => option.value)).toEqual([
      "fargona/qoqon_sh",
      "fargona/uchkoprik",
      "fargona/rishton",
    ]);
  });
});

describe("kaskad o'tishlari (ko'p tanlov)", () => {
  const base: AreaFilter = { regions: ["fargona"], zones: ["7"], districts: ["fargona/qoqon_sh"] };

  it("viloyat qo'shiladi; olib tashlangan viloyatning zona va tumani tushadi", () => {
    expect(toggleAreaRegion(base, "toshkent_shahar", ZONES)).toEqual({
      regions: ["fargona", "toshkent_shahar"],
      zones: ["7"],
      districts: ["fargona/qoqon_sh"],
    });
    const both: AreaFilter = { regions: ["fargona", "toshkent_shahar"], zones: ["7", "20"], districts: ["fargona/qoqon_sh"] };
    expect(toggleAreaRegion(both, "fargona", ZONES)).toEqual({
      regions: ["toshkent_shahar"],
      zones: ["20"],
      districts: [],
    });
    // Oxirgi viloyat olib tashlansa — "hamma viloyat", zona/tuman qoladi.
    expect(toggleAreaRegion(base, "fargona", ZONES)).toEqual({ ...base, regions: [] });
  });

  it("zona qo'shiladi (viloyati ham); `none` yolg'iz; tanlov tashqarisidagi tuman tushadi", () => {
    expect(toggleAreaZone(base, "20", ZONES)).toEqual({
      regions: ["fargona", "toshkent_shahar"],
      zones: ["7", "20"],
      districts: ["fargona/qoqon_sh"],
    });
    expect(toggleAreaZone(EMPTY_AREA, "20", ZONES)).toEqual({ regions: [], zones: ["20"], districts: [] });
    expect(toggleAreaZone(base, "7", ZONES)).toEqual({ ...base, zones: [] });
    expect(toggleAreaZone({ ...base, zones: ["8"] }, "7", ZONES).zones).toEqual(["8", "7"]);
    expect(toggleAreaZone({ ...base, zones: ["7", "8"] }, "7", ZONES)).toEqual({
      regions: ["fargona"],
      zones: ["8"],
      districts: [],
    });
    expect(toggleAreaZone(base, AREA_ZONE_NONE, ZONES)).toEqual({
      regions: ["fargona"],
      zones: [AREA_ZONE_NONE],
      districts: [],
    });
    expect(toggleAreaZone({ ...base, zones: [AREA_ZONE_NONE] }, "8", ZONES).zones).toEqual(["8"]);
  });

  it("tuman qo'shilsa viloyati va egasi zona ham qo'shiladi", () => {
    expect(toggleAreaDistrict(base, "fargona/rishton", ZONES)).toEqual({
      regions: ["fargona"],
      zones: ["7", "8"],
      districts: ["fargona/qoqon_sh", "fargona/rishton"],
    });
    // Zona tanlanmagan — zona qo'shilmaydi (hamma zona).
    expect(toggleAreaDistrict(EMPTY_AREA, "fargona/rishton", ZONES)).toEqual({
      regions: [],
      zones: [],
      districts: ["fargona/rishton"],
    });
    // Tanlangan zona ichida — zona o'zgarmaydi.
    expect(toggleAreaDistrict(base, "fargona/uchkoprik", ZONES).zones).toEqual(["7"]);
    expect(toggleAreaDistrict(base, "fargona/qoqon_sh", ZONES)).toEqual({ ...base, districts: [] });
  });

  it("chiplar har qiymatga bittadan; olib tashlash kaskadga bo'ysunadi", () => {
    const counts = COUNTS;
    const two: AreaFilter = { regions: ["fargona"], zones: ["7", "8"], districts: ["fargona/qoqon_sh"] };
    const chips = areaChips(two, {
      regions: regionAreaOptions(DICTIONARY, counts),
      zones: zoneAreaOptions(["fargona"], ZONES, counts, "Hududi noma'lum"),
      districts: districtAreaOptions(two, ZONES, DICTIONARY, counts, "uz-latn"),
    });
    expect(chips).toEqual([
      { kind: "region", value: "fargona", label: "Farg'ona" },
      { kind: "zone", value: "7", label: "Qo'qon" },
      { kind: "zone", value: "8", label: "Rishton" },
      { kind: "district", value: "fargona/qoqon_sh", label: "Qo'qon shahri" },
    ]);
    expect(removeAreaChip(two, { kind: "zone", value: "7" }, ZONES)).toEqual({ ...two, zones: ["8"] });
    expect(removeAreaChip(two, { kind: "district", value: "fargona/qoqon_sh" }, ZONES).districts).toEqual([]);
    expect(removeAreaChip(two, { kind: "region", value: "fargona" }, ZONES).regions).toEqual([]);
  });

  it("URL dan: takror va bo'sh qiymatlar tashlanadi, `none` yolg'iz qoladi", () => {
    expect(areaFromUrl(["fargona", "fargona", " "], ["7", "none"], null)).toEqual({
      regions: ["fargona"],
      zones: [AREA_ZONE_NONE],
      districts: [],
    });
    expect(areaFromUrl(null, null, null)).toEqual(EMPTY_AREA);
  });
});

describe("sukut hudud", () => {
  it("filial viloyati (buyurtmasi bo'lsa) + eng ko'p buyurtmali zona", () => {
    expect(defaultArea(COUNTS, ZONES, "fargona")).toEqual({
      regions: ["fargona"],
      zones: ["7"],
      districts: [],
    });
  });

  it("filial viloyatida buyurtma yo'q — eng ko'p buyurtmali viloyat (`none` sanalmaydi)", () => {
    expect(defaultArea(COUNTS, ZONES, "andijon").regions).toEqual(["fargona"]);
    expect(defaultArea(COUNTS, ZONES, null).regions).toEqual(["fargona"]);
    const noneHeavy = mapAreaCounts({ by_region: { none: 9, toshkent_shahar: 1 } });
    expect(defaultArea(noneHeavy, ZONES, null).regions).toEqual(["toshkent_shahar"]);
  });

  it("hisob yo'q yoki bo'sh — filial viloyati, zona yo'q", () => {
    expect(defaultArea(null, ZONES, "fargona")).toEqual({ regions: ["fargona"], zones: [], districts: [] });
    expect(defaultArea(EMPTY_AREA_COUNTS, ZONES, null)).toEqual(EMPTY_AREA);
  });

  it("so'ralgan zona (sahifa filtri) ustun; `none` — viloyatsiz savat", () => {
    expect(defaultArea(COUNTS, ZONES, "fargona", "20")).toEqual({
      regions: ["toshkent_shahar"],
      zones: ["20"],
      districts: [],
    });
    expect(defaultArea(COUNTS, ZONES, "fargona", AREA_ZONE_NONE).zones).toEqual([AREA_ZONE_NONE]);
    // Noma'lum zona — e'tiborsiz.
    expect(defaultArea(COUNTS, ZONES, "fargona", "999").zones).toEqual(["7"]);
  });
});

describe("server parametrlari (qo'llanma §5, backend #11)", () => {
  it("buyurtmalar: `?region=a,b` · `?zone=7,8` / `none` · `?district=`", () => {
    expect(
      buildOrderFilters(ordersAreaQuery({ regions: ["fargona"], zones: ["7"], districts: ["fargona/qoqon_sh"] })),
    ).toMatchObject({ region: "fargona", zone: "7", district: "fargona/qoqon_sh" });
    expect(
      buildOrderFilters(ordersAreaQuery({ regions: ["fargona", "toshkent_shahar"], zones: ["7", "20"], districts: [] })),
    ).toMatchObject({ region: "fargona,toshkent_shahar", zone: "7,20" });
    expect(buildOrderFilters(ordersAreaQuery({ regions: ["fargona"], zones: [AREA_ZONE_NONE], districts: [] })))
      .toMatchObject({ region: "fargona", zone: "none" });
    const empty = buildOrderFilters(ordersAreaQuery(EMPTY_AREA));
    expect(empty).not.toHaveProperty("region");
    expect(empty).not.toHaveProperty("zone");
    expect(empty).not.toHaveProperty("district");
    expect(ordersAreaQuery({ regions: [], zones: ["abc"], districts: [] })).toEqual({});
  });

  it("kuryerlar: `?region=a,b&zone=&district=` — hammasi serverda (A6/A7); `none` — zonasiz", () => {
    const zoned = couriersAreaQuery({ regions: ["fargona"], zones: ["7"], districts: ["fargona/qoqon_sh"] });
    expect(zoned).toEqual({ region: "fargona", zoneIds: [7], districts: ["fargona/qoqon_sh"] });
    expect(courierFilterParams({ ...zoned, onShift: null })).toEqual({
      zone: "7",
      region: "fargona",
      district: "fargona/qoqon_sh",
      on_shift: null,
    });
    expect(couriersAreaQuery({ regions: ["fargona", "andijon"], zones: ["7", "8"], districts: [] })).toEqual({
      region: "fargona,andijon",
      zoneIds: [7, 8],
      districts: null,
    });

    expect(couriersAreaQuery({ regions: ["fargona"], zones: [AREA_ZONE_NONE], districts: [] })).toEqual({
      region: "fargona",
      zoneIds: null,
      districts: null,
    });
    expect(couriersAreaQuery({ regions: [], zones: ["abc"], districts: [] }).zoneIds).toBeNull();

    // Bir nechta qiymat vergul bilan; bo'sh ro'yxat — parametr yo'q.
    expect(
      courierFilterParams({ zoneIds: [7, 8], districts: ["fargona/qoqon_sh", "fargona/rishton"] }),
    ).toMatchObject({ zone: "7,8", district: "fargona/qoqon_sh,fargona/rishton" });
    expect(courierFilterParams({ zoneIds: [], districts: [] })).toMatchObject({ zone: null, district: null });
  });
});
