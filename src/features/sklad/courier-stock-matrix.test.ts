import { describe, expect, it } from "vitest";

import type { ItemRef } from "@/lib/item-ref";

import { buildCourierStockMatrix } from "./courier-stock-matrix";
import type { CourierStock, SkladStockRow } from "./types";

const product = (id: number, name: string, unitLabel = "dona"): ItemRef => ({ id, name, image: null, unitLabel });

const GEPATOFIT = product(11, "Gepatofit");
const KARDIOMED = product(12, "Kardiomed");
const ARTROFLEX = product(13, "Artroflex", "karobka");

const courier = (id: number, items: Array<[ItemRef, number]>): CourierStock => ({
  courier: { id, fullName: `Kuryer ${id}`, onShift: true },
  onHand: items.reduce((sum, [, quantity]) => sum + quantity, 0),
  items: items.map(([item, quantity]) => ({ item, quantity })),
});

const inStore = (item: ItemRef, inSklad: number): SkladStockRow => ({ item, inSklad, withCouriers: 0, isLow: false });

describe("buildCourierStockMatrix", () => {
  it("ustunlar — kuryerlardagi mahsulotlar birlashmasi, nom bo'yicha (kelish tartibiga bog'liq emas)", () => {
    const matrix = buildCourierStockMatrix([
      courier(1, [[KARDIOMED, 4], [GEPATOFIT, 2]]),
      courier(2, [[ARTROFLEX, 1], [KARDIOMED, 7]]),
    ]);
    expect(matrix.products.map((item) => item.name)).toEqual(["Artroflex", "Gepatofit", "Kardiomed"]);
    expect(matrix.products[0]).toBe(ARTROFLEX);
  });

  it("nomi bir xil mahsulotlar `id` bo'yicha — tartib barqaror", () => {
    const twin = product(5, "Gepatofit");
    const forward = buildCourierStockMatrix([courier(1, [[GEPATOFIT, 1], [twin, 1]])]);
    const backward = buildCourierStockMatrix([courier(1, [[twin, 1], [GEPATOFIT, 1]])]);
    expect(forward.products.map((item) => item.id)).toEqual([5, 11]);
    expect(backward.products.map((item) => item.id)).toEqual([5, 11]);
  });

  it("qatorlar kelgan tartibda; kuryerda yo'q mahsulot — 0", () => {
    const first = courier(9, [[KARDIOMED, 4]]);
    const second = courier(3, [[GEPATOFIT, 2]]);
    const empty = courier(5, []);
    const matrix = buildCourierStockMatrix([first, second, empty]);
    expect(matrix.rows.map((row) => row.stock)).toEqual([first, second, empty]);
    expect(matrix.rows.map((row) => row.cells)).toEqual([[0, 4], [2, 0], [0, 0]]);
    expect(matrix.rows.map((row) => row.kinds)).toEqual([1, 1, 0]);
  });

  it("nol miqdor ustun ochmaydi", () => {
    const matrix = buildCourierStockMatrix([courier(1, [[GEPATOFIT, 0], [KARDIOMED, 3]])], [inStore(ARTROFLEX, 0)]);
    expect(matrix.products).toEqual([KARDIOMED]);
    expect(matrix.rows[0]?.cells).toEqual([3]);
    expect(matrix.store).toEqual({ cells: [0], total: 0, kinds: 0 });
  });

  it("qator, ustun va umumiy yig'indi — minus ham hisobga kiradi", () => {
    const matrix = buildCourierStockMatrix([
      courier(1, [[GEPATOFIT, 5], [KARDIOMED, -2]]),
      courier(2, [[GEPATOFIT, 120], [KARDIOMED, 3]]),
    ]);
    expect(matrix.rows.map((row) => row.total)).toEqual([3, 123]);
    expect(matrix.totals).toEqual({ cells: [125, 1], total: 126 });
  });

  it("minus kataklar sanaladi — faqat kuryerlarniki", () => {
    const matrix = buildCourierStockMatrix(
      [courier(1, [[GEPATOFIT, -1], [KARDIOMED, -4]]), courier(2, [[GEPATOFIT, 2], [ARTROFLEX, -3]])],
      [inStore(KARDIOMED, -10)],
    );
    expect(matrix.negativeCount).toBe(3);
    expect(buildCourierStockMatrix([courier(1, [[GEPATOFIT, 2]])]).negativeCount).toBe(0);
  });

  it("bir kuryerda takrorlangan mahsulot qo'shiladi", () => {
    const matrix = buildCourierStockMatrix([courier(1, [[GEPATOFIT, 2], [GEPATOFIT, 3]])]);
    expect(matrix.rows[0]).toMatchObject({ cells: [5], total: 5, kinds: 1 });
  });

  it("«Omborim»: sklad qoldig'i berilmasa qator yo'q", () => {
    expect(buildCourierStockMatrix([courier(1, [[GEPATOFIT, 2]])]).store).toBeNull();
  });

  it("«Omborim»: faqat skladda bor mahsulot ham ustun oladi; «Jami» ga sklad kirmaydi", () => {
    const matrix = buildCourierStockMatrix(
      [courier(1, [[KARDIOMED, 4]])],
      [inStore(GEPATOFIT, 2460), inStore(KARDIOMED, 300), inStore(ARTROFLEX, 12)],
    );
    expect(matrix.products).toEqual([ARTROFLEX, GEPATOFIT, KARDIOMED]);
    expect(matrix.store).toEqual({ cells: [12, 2460, 300], total: 2772, kinds: 3 });
    expect(matrix.rows[0]?.cells).toEqual([0, 0, 4]);
    expect(matrix.totals).toEqual({ cells: [0, 0, 4], total: 4 });
  });

  it("kuryer ham, mahsulot ham yo'q — bo'sh matritsa", () => {
    expect(buildCourierStockMatrix([], [])).toEqual({
      products: [],
      store: { cells: [], total: 0, kinds: 0 },
      rows: [],
      totals: { cells: [], total: 0 },
      negativeCount: 0,
    });
  });
});
