import { describe, expect, it } from "vitest";

import { mapCourierStock, mapLoadRequest, mapOwnSklad, mapSkladMe, mapStockCell, parseSkladChanged, skladStockRows, skladStore, type StockCell } from "./types";

const item = { id: 14, name: "Alatoo bals", image: null };

const cell = (onHand: number, isLow: boolean, locationId = 1): StockCell => ({
  kind: "region",
  location: { id: locationId, name: `Ombor ${locationId}` },
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
    expect(me).toEqual({ sklad: null, canView: true, canWrite: false });
    expect(mapOwnSklad([], me.sklad)).toBeNull();
  });

  it("eski javob: `sklad_id: null` + to'ldirilgan `region` — baribir biriktirilmagan", () => {
    expect(mapSkladMe({ region: "fargona", sklad_id: null }).sklad).toBeNull();
  });

  it("biriktirilgan: `sklad {id, name, regions}`; `warehouse_permissions.view: false` — yopiq", () => {
    const me = mapSkladMe({ sklad_id: 1, sklad: { id: 1, name: "Vodiy", regions: ["fargona", "namangan"] }, warehouse_permissions: { view: false } });
    expect(me).toEqual({ sklad: { id: 1, name: "Vodiy", regions: ["fargona", "namangan"] }, canView: false, canWrite: false });
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

describe("bosh kuryer yozuvi (sklad hujjati 2026-11-03)", () => {
  it("`can_write` yoki `manage` — tugmalar; dopusk ro'yxati o'qilmaydi", () => {
    const sklad = { id: 1, name: "Vodiy", regions: ["fargona"] };
    expect(mapSkladMe({ sklad, can_write: true, grants_apply: false, granted_item_ids: [] }).canWrite).toBe(true);
    expect(mapSkladMe({ sklad, warehouse_permissions: { view: true, manage: true } }).canWrite).toBe(true);
    expect(mapSkladMe({ sklad, can_write: false }).canWrite).toBe(false);
  });

  it("sklad ombori — eng ko'p qoldiqli `region` ombori", () => {
    expect(skladStore([cell(0, false, 3), cell(40, false, 5), cell(10, false, 5)])?.id).toBe(5);
    expect(skladStore([])).toBeNull();
  });

  it("so'rov: so'ralgan va berilgan son ikkalasi qoladi", () => {
    const request = mapLoadRequest({
      id: 12,
      status: "approved",
      courier: { id: 3, full_name: "Aziz", phone: "998907770001" },
      lines: [{ item: { id: 7, name: "M" }, item_id: 7, quantity: 10, approved_quantity: 3 }],
      total_qty: 10,
      approved_qty: 3,
    });
    expect(request.lines[0]).toMatchObject({ quantity: 10, approvedQuantity: 3 });
    expect(mapLoadRequest({ id: 1, lines: [{ item_id: 7, quantity: 2, approved_quantity: null }] }).lines[0]?.approvedQuantity).toBeNull();
  });
});
