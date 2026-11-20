import { describe, expect, it } from "vitest";

import type { ItemRef } from "@/lib/item-ref";

import { buildCurrentStock, linesFromCurrent, linesFromSklad, toneOf } from "./current-stock";
import { buildDaySheet, stockDrift } from "./day-sheet";
import { resolveDay } from "./period";
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
    const [total, couriers, store] = model.rows;
    // Tartib: Jami · Kuryerlarda · Omborda (egasi, 2026-11-19).
    expect(model.rows.map((row) => row.key)).toEqual(["total", "couriers", "store"]);
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
    expect(model.rows[2]?.cells.map((cell) => [cell.text, cell.tone])).toEqual([
      ["12", "warn"],
      ["40", "plain"],
    ]);
    expect(model.rows[0]?.cells.map((cell) => cell.text)).toEqual(["18", "40"]);
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

describe("bugun: kunlik harakat = hozirgi qoldiq (egasi, 2026-11-20; 97 §3)", () => {
  const current = (total: Record<string, number>, pending: Record<string, number> = {}) => ({
    store: cells({}),
    couriers: cells({}),
    total: cells(total),
    pending: cells(pending),
    min: {},
  });
  const count = (cell: { qty: number } | undefined) => cell?.qty ?? 0;

  it("logist tasdiqlamagan sotuv — alohida qatorlar, oxirida hozirgi qoldiq (tasdiqlanmagani ayirilgan)", () => {
    const sheet = mapSkladSheet({
      products: PRODUCTS,
      closing: flow({ "7": 1117 }, 0),
      sold_pending: flow({ "7": 3 }, 600_000),
      gift_pending: flow({ "7": 1 }, 0),
      current: current({ "7": 1113 }, { "7": 4 }),
    });
    const tail = buildDaySheet(sheet, "2026-11-20", true).tail;
    expect(tail.slice(-4).map((line) => line.key)).toEqual(["closing", "sold-pending", "gift-pending", "now"]);
    expect(tail.at(-1)).toMatchObject({ label: "Hozirgi qoldiq (tasdiqlanmagani ayirilgan)", flow: { items: { "7": { qty: 1113, pieces: 0 } }, amount: null } });
    // O'tgan kunda «hozir» qatori yo'q — u faqat bugunga tegishli.
    expect(buildDaySheet(sheet, "2026-11-19", false).tail.some((line) => line.key === "now")).toBe(false);
    // Tasdiqlanmagan bor — solishtirilmaydi (farq shu qatorlarda ko'rinadi).
    expect(stockDrift(sheet, count)).toEqual([]);
  });

  it("tasdiqlanmagan yo'q: kun oxiri ≠ hozirgi Jami — farq ochiq ko'rsatiladi; teng bo'lsa — jim", () => {
    const drift = stockDrift(mapSkladSheet({ products: PRODUCTS, closing: flow({ "7": 1117, "6": 10 }, 0), current: current({ "7": 1113, "6": 10 }) }), count);
    expect(drift.map((row) => [row.product.id, row.closing, row.now])).toEqual([[7, 1117, 1113]]);
    expect(stockDrift(mapSkladSheet({ products: PRODUCTS, closing: flow({ "7": 5 }, 0), current: current({ "7": 5 }) }), count)).toEqual([]);
    // Blok kelmagan (eski server) — solishtirilmaydi.
    expect(stockDrift(mapSkladSheet({ products: PRODUCTS, closing: flow({ "7": 5 }, 0) }), count)).toEqual([]);
    expect(buildDaySheet(mapSkladSheet({ products: PRODUCTS }), "2026-11-20", true).tail.some((line) => line.key === "now")).toBe(false);
  });
});

describe("hujjat 101 §6: bosh kuryerda tasdiqlanmagan sotuv darhol hisoblanadi (`pending_included`)", () => {
  const current = (total: Record<string, number>, pending: Record<string, number> = {}) => ({
    store: cells({}),
    couriers: cells({}),
    total: cells(total),
    pending: cells(pending),
    min: {},
  });
  const count = (cell: { qty: number } | undefined) => cell?.qty ?? 0;
  const sheet = (closing: number) =>
    mapSkladSheet({
      products: PRODUCTS,
      pending_included: true,
      closing: flow({ "7": closing }, 0),
      sold_pending: flow({ "7": 3 }, 600_000),
      current: current({ "7": 1113 }, { "7": 3 }),
    });

  it("tasdiqlanmagani sotuv ichida — «shundan» qatori, «hozirgi qoldiq» qatori kerak emas", () => {
    const tail = buildDaySheet(sheet(1113), "2026-11-20", true).tail;
    expect(tail.slice(-2).map((line) => [line.key, line.kind === "total" ? line.label : ""])).toEqual([
      ["closing", "21.11 kun boshiga qoldiq"],
      ["sold-pending", "Shundan logist tasdiqlamagan · sotuv"],
    ]);
  });

  it("kun oxiri = hozirgi Jami tasdiqlanmagan bo'lsa ham tekshiriladi", () => {
    expect(stockDrift(sheet(1113), count)).toEqual([]);
    expect(stockDrift(sheet(1117), count).map((row) => [row.closing, row.now])).toEqual([[1117, 1113]]);
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
});
