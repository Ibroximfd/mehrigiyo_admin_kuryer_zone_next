import { describe, expect, it } from "vitest";

import { mapCourierStock, mapOwnSklad, mapSkladMe, mapStockCell, parseSkladChanged, skladStockRows, type StockCell } from "./types";

const item = { id: 14, name: "Alatoo bals", image: null };

const cell = (onHand: number, isLow: boolean): StockCell => ({
  kind: "region",
  item,
  onHand,
  minQuantity: 50,
  isLow,
});

describe("skladStockRows", () => {
  it("bo'sh qolgan birlashgan ombor mahsulotni «kam» qilmaydi — yig'indi hal qiladi", () => {
    const [row] = skladStockRows(
      [cell(2460, false), cell(0, true), cell(0, true)],
      [],
    );
    expect(row?.inSklad).toBe(2460);
    expect(row?.isLow).toBe(false);
  });

  it("jami qoldiq minimumdan past bo'lsa — «kam»", () => {
    const [row] = skladStockRows([cell(20, true), cell(0, true)], []);
    expect(row?.isLow).toBe(true);
  });
});

describe("sklad item.image", () => {
  it("to'liq URL saqlanadi, bo'sh yoki yo'q — null", () => {
    expect(mapCourierStock({ id: 1, items: [{ item: { id: 2, name: "G", image: "https://x.uz/m/g.png" }, quantity: 1 }] }).items[0]?.item).toEqual({
      id: 2,
      name: "G",
      image: "https://x.uz/m/g.png",
    });
    expect(mapStockCell({ item: { id: 2, name: "G", image: null } }).item.image).toBeNull();
    expect(mapStockCell({ item: { id: 2, name: "G" } }).item.image).toBeNull();
  });
});

describe("TZ 32 S: sklad/me va chiefs[] (SKLAD_S_BLOK §1, §10, §11)", () => {
  it("biriktirilmagan bosh kuryer — `sklad: null`, `region` ga ishonilmaydi (xato emas)", () => {
    const me = mapSkladMe({
      role: "chief_courier",
      region: "toshkent_shahar",
      regions: [],
      sklad_id: null,
      sklad: null,
      warehouse_permissions: { view: true, manage: false, admin: false },
    });
    expect(me).toEqual({ sklad: null, canView: true });
    expect(mapOwnSklad([], me.sklad)).toBeNull();
  });

  it("eski javob: `sklad_id: null` + to'ldirilgan `region` — baribir biriktirilmagan", () => {
    expect(mapSkladMe({ region: "fargona", sklad_id: null }).sklad).toBeNull();
  });

  it("biriktirilgan: `sklad {id, name, regions}`; `warehouse_permissions.view: false` — yopiq", () => {
    const me = mapSkladMe({ sklad_id: 1, sklad: { id: 1, name: "Vodiy", regions: ["fargona", "namangan"] }, warehouse_permissions: { view: false } });
    expect(me).toEqual({ sklad: { id: 1, name: "Vodiy", regions: ["fargona", "namangan"] }, canView: false });
  });

  it("`chiefs[]` — hamma bosh kuryer; `chief` (faqat birinchisi) e'tiborsiz", () => {
    const own = mapOwnSklad(
      [
        {
          id: 1,
          name: "Vodiy",
          regions: ["fargona"],
          chiefs: [
            { id: 7, full_name: "Vodiy bosh kuryeri" },
            { id: 9, full_name: "Andijon bosh kuryeri" },
          ],
          chief_ids: [7, 9],
          chief: { id: 7, full_name: "Vodiy bosh kuryeri" },
        },
      ],
      { id: 1, name: "Vodiy", regions: ["fargona"] },
    );
    expect(own?.chiefs.map((chief) => chief.fullName)).toEqual(["Vodiy bosh kuryeri", "Andijon bosh kuryeri"]);
  });

  it("`chiefs: []` va `chief: null` — bo'sh ro'yxat; begona sklad qatori olinmaydi", () => {
    const own = mapOwnSklad([{ id: 2, name: "Begona", chiefs: [], chief: null }], { id: 1, name: "Vodiy", regions: ["fargona"] });
    expect(own).toEqual({ id: 1, name: "Vodiy", regions: ["fargona"], chiefs: [] });
  });

  it("`sklad_changed` hodisasi: o'rin id va yangi sklad (`null` — uzildi)", () => {
    expect(parseSkladChanged({ type: "sklad_changed", chief_id: 7, sklad_id: 2, regions: ["xorazm"] })).toEqual({ chiefId: 7, skladId: 2 });
    expect(parseSkladChanged({ type: "sklad_changed", chief_id: 7, sklad_id: null, regions: [] })).toEqual({ chiefId: 7, skladId: null });
    expect(parseSkladChanged({ type: "stock_changed", chief_id: 7 })).toBeNull();
  });
});
