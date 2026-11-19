import { describe, expect, it } from "vitest";

import type { ItemRef } from "@/lib/item-ref";

import { buildCurrentStock, linesFromCurrent, linesFromSklad, toneOf } from "./current-stock";
import { buildDaySheet } from "./day-sheet";
import { monthRange, resolveDay, resolveRange, weekRange } from "./period";
import { buildRangeSheet, regionOptions } from "./range-sheet";
import { mapSkladSheet } from "./types";

const PRODUCTS = [
  { id: 6, name_uz: "Tea (ipak choy)", count_unit: "piece", pieces_per_box: 1 },
  { id: 25, name_uz: "Sustav", count_unit: "piece", pieces_per_box: 1 },
  { id: 9, name_uz: "Oregado Box", count_unit: "piece", pieces_per_box: 1 },
  { id: 7, name_uz: "Rayhon", count_unit: "piece", pieces_per_box: 1 },
];

const cells = (values: Record<string, number>) => Object.fromEntries(Object.entries(values).map(([id, qty]) => [id, { qty, pieces: 0 }]));
const flow = (values: Record<string, number>, amount: number) => ({ items: cells(values), amount });

describe("hozirgi qoldiq (§1.1)", () => {
  it("server `current`: hamma son serverdan, «Jami» qatori — `total`; minimaldan kam — sariq, ≤ 0 — qizil", () => {
    const sheet = mapSkladSheet({
      products: PRODUCTS,
      current: {
        store: cells({ "6": 52, "9": 6, "7": 180 }),
        couriers: cells({ "6": 24, "9": 4, "7": 73 }),
        total: cells({ "6": 76, "9": 10, "7": 253 }),
        min: { "6": 30, "25": 10, "9": 10, "7": 100 },
      },
    });
    const model = buildCurrentStock(linesFromCurrent(sheet.products, sheet.current!));
    const [store, couriers, total] = model.rows;
    expect(model.columns.map((column) => column.name)).toEqual(["Tea (ipak choy)", "Sustav", "Oregado Box", "Rayhon"]);
    expect(store?.cells.map((cell) => [cell.text, cell.tone])).toEqual([
      ["52", "plain"],
      ["0", "danger"],
      ["6", "warn"],
      ["180", "plain"],
    ]);
    // Kuryerlar qatori rangsiz, nol — bo'sh.
    expect(couriers?.cells.map((cell) => [cell.text, cell.tone])).toEqual([
      ["24", "plain"],
      ["", "plain"],
      ["4", "plain"],
      ["73", "plain"],
    ]);
    expect(total?.cells.map((cell) => cell.text)).toEqual(["76", "0", "10", "253"]);
    expect(total?.cells.map((cell) => cell.tone)).toEqual(["plain", "danger", "plain", "plain"]);
    expect(model).toMatchObject({ storeTotal: 238, couriersTotal: 101, lowCount: 2 });
  });

  it("zaxira — sahifa yuklagan sklad qoldig'i: «Jami» = ombor + kuryerlar, minimum sklad birligidan ekranga", () => {
    const boxedKremi: ItemRef = { id: 34, name: "Kremi", image: null, unitLabel: "karobka", countsInDona: true, stockFactor: 3 };
    const tea: ItemRef = { id: 6, name: "Tea", image: null, unitLabel: "dona", countsInDona: false, stockFactor: 1 };
    const model = buildCurrentStock(
      linesFromSklad([
        { item: boxedKremi, inSklad: 4, withCouriers: 2, minQuantity: 5 },
        { item: tea, inSklad: 40, withCouriers: 0, minQuantity: 0 },
      ]),
    );
    // Kremi skladda karobkada — ekranda donada (hujjat 84): 12 + 6 = 18, minimum 15 dona.
    expect(model.columns).toEqual([
      { id: 34, name: "Kremi", unit: "" },
      { id: 6, name: "Tea", unit: "" },
    ]);
    expect(model.rows[0]?.cells.map((cell) => [cell.text, cell.tone])).toEqual([
      ["12", "warn"],
      ["40", "plain"],
    ]);
    expect(model.rows[2]?.cells.map((cell) => cell.text)).toEqual(["18", "40"]);
    expect(model.lowCount).toBe(1);
  });

  it("rang qoidasi", () => {
    expect(toneOf(-2, null)).toBe("danger");
    expect(toneOf(0, 10)).toBe("danger");
    expect(toneOf(9, 10)).toBe("warn");
    expect(toneOf(10, 10)).toBe("plain");
    expect(toneOf(3, null)).toBe("plain");
  });
});

describe("kunlik jadval qatorlari (§1, egasi sheet'i 17.11)", () => {
  const sheet = mapSkladSheet({
    date_from: "2026-11-17",
    date_to: "2026-11-17",
    products: PRODUCTS,
    opening: flow({ "6": 76, "9": 19, "7": 1036 }, 442_590_000),
    from_company: flow({}, 0),
    rows: [
      { region: "fargona", region_name: "Farg'ona", courier: { id: 31, full_name: "Bahtiyor aka" }, sold: flow({ "6": 20, "7": 206 }, 93_595_000), gift: flow({}, 0) },
      { region: "andijon", region_name: "Andijon", courier: null, sold: flow({ "7": 374 }, 138_680_000), gift: flow({}, 0) },
    ],
    sold: flow({ "6": 54, "7": 783 }, 303_195_000),
    gift: flow({}, 0),
    to_company: flow({}, 0),
    other: flow({}, 0),
    closing: flow({ "6": 22, "7": 253 }, 139_395_000),
  });

  it("tartib: kun boshi → korxonadan → hudud × kuryer (sotuv, sovg'a) → jami → korxonaga → ertangi kun boshi", () => {
    const model = buildDaySheet(sheet, "2026-11-17");
    expect(model.head.map((line) => (line.kind === "total" ? line.label : ""))).toEqual(["Kun boshiga qoldiq", "+ Korxonadan keldi"]);
    expect(model.couriers.map((line) => (line.kind === "courier" ? [line.regionName, line.courierName, line.flowLabel, line.blockStart] : []))).toEqual([
      ["Farg'ona", "Bahtiyor aka", "sotuv", true],
      ["Farg'ona", "Bahtiyor aka", "sovg'a", false],
      ["Andijon", null, "sotuv", true],
      ["Andijon", null, "sovg'a", false],
    ]);
    expect(model.tail.map((line) => (line.kind === "total" ? line.label : ""))).toEqual([
      "JAMI · sotuv",
      "JAMI · sovg'a",
      "− Korxonaga qaytdi",
      "18.11 kun boshiga qoldiq",
    ]);
    expect(model.hasAdjustment).toBe(false);
    // Qoldiq qatorlari nolni ko'rsatadi, harakatlar — bo'sh.
    expect([...model.head, ...model.tail].map((line) => (line.kind === "total" ? line.zero : ""))).toEqual(["show", "blank", "blank", "blank", "blank", "show"]);
  });

  it("«Tuzatish» — faqat `other` noldan farqli bo'lsa, ishorali", () => {
    const withOther = buildDaySheet({ ...sheet, other: { items: { "7": { qty: -2, pieces: 0 } }, amount: -400_000 } }, "2026-11-17");
    const other = withOther.tail.find((line) => line.key === "other");
    expect(withOther.hasAdjustment).toBe(true);
    expect(other).toMatchObject({ kind: "total", label: "Tuzatish", tone: "warn", signed: true });
    // Yo'q blok — tuzatish bor-yo'qligi noma'lum, qator chiqmaydi.
    expect(buildDaySheet({ ...sheet, other: null }, "2026-11-17").hasAdjustment).toBe(false);
  });

  it("hujjat 92: «Chiqim» — alohida qator korxonaga qaytdidan keyin, ogohlantirishsiz", () => {
    const withWriteOff = buildDaySheet({ ...sheet, writeOff: { items: { "7": { qty: 3, pieces: 0 } }, amount: 600_000 } }, "2026-11-17");
    expect(withWriteOff.tail.map((line) => (line.kind === "total" ? line.key : ""))).toEqual(["sold", "gift", "to-company", "write-off", "closing"]);
    expect(withWriteOff.tail.find((line) => line.key === "write-off")).toMatchObject({ label: "− Chiqim (spisaniye)", tone: "danger", signed: false });
    expect(withWriteOff.hasAdjustment).toBe(false);
    // Eski server (blok yo'q) yoki nol — qator chiqmaydi.
    expect(buildDaySheet({ ...sheet, writeOff: null }, "2026-11-17").tail.some((line) => line.key === "write-off")).toBe(false);
    expect(buildDaySheet(sheet, "2026-11-17").tail.some((line) => line.key === "write-off")).toBe(false);
  });

  it("oy chegarasida ertangi kun yorlig'i — so'ralgan kundan", () => {
    expect(buildDaySheet(mapSkladSheet({}), "2026-11-30").tail.at(-1)).toMatchObject({ label: "01.12 kun boshiga qoldiq", flow: null });
  });
});

describe("sanadan sanagacha (§1.5)", () => {
  it("kunlar `days[]` va `address_rows[]` birlashmasi, tartib bilan; yo'q blok — `null`", () => {
    const model = buildRangeSheet(
      mapSkladSheet({
        sold: flow({ "7": 87 }, 127_640_000),
        gift: flow({ "7": 32 }, 26_200_000),
        days: [
          { date: "2026-11-10", sold: flow({ "7": 87 }, 26_500_000), gift: flow({ "7": 32 }, 6_400_000) },
          { date: "2026-11-09", sold: flow({ "7": 48 }, 25_075_000), gift: flow({ "7": 22 }, 4_400_000) },
        ],
        address_rows: [
          { date: "2026-11-09", addresses: 40, refused_addresses: 2, rate: 51_000, fee: 2_150_000 },
          { date: "2026-11-11", addresses: 27, refused_addresses: 0, rate: 50_000, fee: null },
        ],
      }),
    );
    expect(model.days.map((day) => [day.date, day.sold?.amount ?? null, day.address?.fee ?? null])).toEqual([
      ["2026-11-09", 25_075_000, 2_150_000],
      ["2026-11-10", 26_500_000, null],
      ["2026-11-11", null, null],
    ]);
    expect(model.days[1]?.address).toBeNull();
    expect(model.totals.sold?.amount).toBe(127_640_000);
    expect(model.totals).toMatchObject({ addresses: 67, refusedAddresses: 2 });
  });

  it("birorta kunda son kelmagan yoki qator yo'q — jami `null` (to'liq bo'lmagan jami chiqmaydi)", () => {
    const partial = buildRangeSheet(mapSkladSheet({ address_rows: [{ date: "2026-11-09", addresses: 40 }] }));
    expect(partial.totals).toMatchObject({ addresses: 40, refusedAddresses: null, sold: null, gift: null });
    expect(buildRangeSheet(mapSkladSheet({})).totals).toMatchObject({ addresses: null, refusedAddresses: null });
  });

  it("hudud tanlovi: sklad viloyatlari + javobdagilar (server nomi ustun) + tanlangan", () => {
    const rows = mapSkladSheet({ rows: [{ region: "fargona", region_name: "Farg'ona" }] }).rows;
    expect(
      regionOptions(rows, [
        { value: "fargona", label: "Farg'ona viloyati" },
        { value: "namangan", label: "Namangan viloyati" },
      ], "jizzax"),
    ).toEqual([
      { value: "fargona", label: "Farg'ona" },
      { value: "namangan", label: "Namangan viloyati" },
      { value: "jizzax", label: "jizzax" },
    ]);
  });
});

describe("davr", () => {
  const today = "2026-11-18";

  it("kun: URLdagi o'tgan kun; bo'sh, buzuq yoki kelajak — bugun", () => {
    expect(resolveDay("2026-11-17", today)).toBe("2026-11-17");
    expect(resolveDay(null, today)).toBe(today);
    expect(resolveDay("17.11.2026", today)).toBe(today);
    expect(resolveDay("2026-11-30", today)).toBe(today);
  });

  it("oraliq: sukut — shu hafta; `to` yo'q — bugungacha; teskari — almashadi; 93 kundan uzuni qisqaradi", () => {
    expect(weekRange(today)).toEqual({ dateFrom: "2026-11-16", dateTo: today });
    expect(monthRange(today)).toEqual({ dateFrom: "2026-11-01", dateTo: today });
    expect(resolveRange({ from: null, to: null }, today)).toEqual(weekRange(today));
    expect(resolveRange({ from: "2026-11-09", to: "2026-11-14" }, today)).toEqual({ dateFrom: "2026-11-09", dateTo: "2026-11-14" });
    expect(resolveRange({ from: "2026-11-09", to: null }, today)).toEqual({ dateFrom: "2026-11-09", dateTo: today });
    expect(resolveRange({ from: "2026-11-14", to: "2026-11-09" }, today)).toEqual({ dateFrom: "2026-11-09", dateTo: "2026-11-14" });
    expect(resolveRange({ from: "2026-11-09", to: "2026-12-30" }, today)).toEqual({ dateFrom: "2026-11-09", dateTo: today });
    expect(resolveRange({ from: "2026-01-01", to: "2026-11-14" }, today)).toEqual({ dateFrom: "2026-08-14", dateTo: "2026-11-14" });
  });
});
