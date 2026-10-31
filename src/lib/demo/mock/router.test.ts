import { describe, expect, it } from "vitest";

import { mapChiefCash, mapCourierHandover } from "@/features/cash/types";
import { mapAutoAssignPreview, mapAutoAssignResult, mapChiefFilials, mapChiefMe, mapChiefOrderDetail } from "@/features/chief/types";
import { mapCourier } from "@/features/couriers/types";
import { mapLogistOrder } from "@/features/orders/types";
import { mapChiefFinance } from "@/features/report/types";
import { mapCourierCod } from "@/features/cash/types";
import { mapOwnSklad, mapSkladMe, mapStockCell } from "@/features/sklad/types";
import { todayIso } from "@/lib/format";
import { asPage } from "@/lib/paginate";

import { demoDb } from "./db";
import { demoRequest } from "./router";

const get = (path: string, searchParams?: Record<string, string>) => demoRequest({ method: "get", path, searchParams });
const post = (path: string, json?: unknown) => demoRequest({ method: "post", path, json });
const patch = (path: string, json?: unknown) => demoRequest({ method: "patch", path, json });

describe("demo rejim: backend v2 shakllari", () => {
  it("kirish faqat `site: chief` va demo telefon/parol bilan", async () => {
    expect((await post("/operator/login/", { username: "900000000", password: "Chief-2026", site: "chief" })).status).toBe(200);
    expect((await post("/operator/login/", { username: "998900000000", password: "x", site: "chief" })).status).toBe(401);
    expect(await post("/operator/login/", { username: "998900000000", password: "Chief-2026", site: "logist" })).toMatchObject({
      status: 403,
      data: { code: "wrong_site" },
    });
  });

  it("bosh kuryer — Vodiy, 6–8 kuryer, 20–30 zakaz", async () => {
    const me = mapChiefMe((await get("/operator/chief/me/")).data);
    expect(me.seat.fullName).toBe("Akmal Tursunov");
    expect(me.regions).toEqual(["fargona", "namangan", "andijon"]);
    expect(demoDb.couriers.length).toBeGreaterThanOrEqual(6);
    expect(demoDb.orders.length).toBeGreaterThanOrEqual(20);
    expect(demoDb.orders.length).toBeLessThanOrEqual(30);
  });

  it("zakazlar: hujjatdagi filtrlar (`scope`, `status`, `courier_id`)", async () => {
    const incoming = asPage((await get("/operator/chief/orders/", { scope: "incoming" })).data).items.map(mapLogistOrder);
    expect(incoming.every((order) => order.courier === null)).toBe(true);
    const delivered = asPage((await get("/operator/chief/orders/", { scope: "all", status: "delivered" })).data).items.map(mapLogistOrder);
    expect(delivered.length).toBeGreaterThan(0);
    expect(delivered.every((order) => order.status === "delivered")).toBe(true);
    const assigned = await post(`/operator/chief/orders/${incoming[0]!.id}/assign/`, { courier_id: 507 });
    expect(mapLogistOrder((assigned.data as { order: unknown }).order).courier?.id).toBe(507);
  });

  it("bloklangan kuryer zonasiz, ochiq zakazlari «Kelganlar» ga qaytadi", async () => {
    const courier = mapCourier((await patch("/operator/chief/couriers/501/", { is_active: false, zone_ids: [] })).data);
    expect(courier.isActive).toBe(false);
    expect(demoDb.orders.some((order) => order.status === "shipping" && order.courierId === 501)).toBe(false);
  });

  it("1-pog'ona: e'lon kam summa bilan qabul qilinsa — `disputed`, filialga topshiriladigan pul oshadi", async () => {
    const pending = asPage((await get("/operator/chief/cod/handovers/", { status: "pending" })).data).items.map(mapCourierHandover);
    const row = pending[0]!;
    const before = mapChiefCash((await get("/operator/chief/cash/")).data).byFilial.reduce((sum, item) => sum + item.toHandOver, 0);
    const settled = await post(`/operator/chief/couriers/${row.courier!.id}/settle/`, { date: row.date, confirmed_amount: row.amount - 1000 });
    expect(settled.data).toMatchObject({ success: true, handover: { status: "disputed" } });
    const after = mapChiefCash((await get("/operator/chief/cash/")).data).byFilial.reduce((sum, item) => sum + item.toHandOver, 0);
    expect(after).toBeGreaterThan(before);
  });

  it("2-pog'ona: bir nechta filialda pul — `filial_required`, `filial_id` bilan — 201 va idempotent", async () => {
    const required = await post("/operator/chief/cash/handover/", { amount: 1000, client_action_id: "a1" });
    expect(required).toMatchObject({ status: 400, data: { code: "filial_required" } });
    const created = await post("/operator/chief/cash/handover/", { amount: 1000, filial_id: 1, client_action_id: "a1" });
    expect(created.status).toBe(201);
    const again = await post("/operator/chief/cash/handover/", { amount: 1000, filial_id: 1, client_action_id: "a1" });
    expect(again.status).toBe(200);
    expect((again.data as { id: number }).id).toBe((created.data as { id: number }).id);
  });

  it("moliya: filial va kuryer kesimi bir-biriga mos (V13)", async () => {
    const finance = mapChiefFinance((await get("/operator/chief/finance/", { date_from: "2000-01-01", date_to: todayIso() })).data);
    expect(finance.byFilial.reduce((sum, row) => sum + row.addresses, 0)).toBe(finance.totals.addresses);
    expect(finance.totals.fee).toBe(finance.totals.addresses * 25_000);
    expect(finance.byCourier.reduce((sum, row) => sum + row.delivered, 0)).toBe(finance.totals.delivered);
    expect(finance.byCourier.some((row) => row.products.length > 0)).toBe(true);
  });

  it("zakazlar: `page` bilan 10 tadan, `page`siz massiv; qidiruv va detal (V3, V4)", async () => {
    const page = asPage((await get("/operator/chief/orders/", { scope: "all", page: "1" })).data);
    expect(page.items).toHaveLength(10);
    expect(page.hasMore).toBe(true);
    expect(Array.isArray((await get("/operator/chief/orders/", { scope: "all" })).data)).toBe(true);
    const found = asPage((await get("/operator/chief/orders/", { scope: "all", q: "gepatofit", page: "1" })).data);
    expect(found.total).toBeGreaterThan(0);
    const order = mapLogistOrder(found.items[0]);
    expect(mapChiefOrderDetail((await get(`/operator/chief/orders/${order.id}/`)).data).history.length).toBeGreaterThan(0);
  });

  it("avto-taqsimlash: preview yozmaydi, apply yozadi (V5)", async () => {
    const rows = mapAutoAssignPreview((await post("/operator/chief/orders/auto-assign/preview/", {})).data);
    expect(rows.some((row) => row.reason === "no_zone")).toBe(true);
    const ready = rows.filter((row) => row.courier);
    const result = mapAutoAssignResult(
      (await post("/operator/chief/orders/auto-assign/apply/", {
        assignments: [...ready.map((row) => ({ order_id: row.orderId, courier_id: row.courier!.id })), { order_id: "yo'q", courier_id: 1 }],
      })).data,
    );
    expect(result.assigned).toHaveLength(ready.length);
    expect(result.failed).toEqual([{ id: "yo'q", code: "order_not_found" }]);
  });

  it("joy qo'shish: 201, dublikat 200, begona viloyat 403 (V6); filiallar (V14)", async () => {
    const created = await post("/operator/chief/places/", { region: "fargona", name: "Yangiqishloq" });
    expect(created.status).toBe(201);
    expect((created.data as { code: string }).code).toMatch(/^fargona\/c_/);
    expect((await post("/operator/chief/places/", { region: "fargona", name: "yangiqishloq" })).status).toBe(200);
    expect(await post("/operator/chief/places/", { region: "toshkent", name: "X" })).toMatchObject({ status: 403, data: { code: "zone_other_region" } });
    expect(mapChiefFilials((await get("/operator/chief/filials/")).data).filter((row) => row.isMain)).toHaveLength(1);
  });

  it("kuryer naqdi oraliq bilan (V11)", async () => {
    const cod = mapCourierCod((await get("/operator/chief/couriers/503/cod/", { date_from: "2000-01-01", date_to: todayIso() })).data);
    expect(cod.days.length).toBeGreaterThan(0);
  });

  it("sklad: me → sklad_id va viloyatlar, faqat o'z skladi, qoldiq — sklad + kuryerlar (V7/V8/V16)", async () => {
    const me = mapSkladMe((await get("/sklad/me/")).data);
    expect(me.regions).toEqual(["fargona", "namangan", "andijon"]);
    const sklads = (await get("/sklad/sklads/")).data as unknown[];
    expect(sklads).toHaveLength(1);
    expect(mapOwnSklad(sklads, me.skladId)?.regions).toEqual(me.regions);
    const cells = asPage((await get("/sklad/stock/", { page: "1" })).data).items.map(mapStockCell);
    expect(new Set(cells.map((cell) => cell.kind))).toEqual(new Set(["region", "courier"]));
    expect(await get("/operator/unknown/")).toEqual({ status: 404, data: {} });
  });

  it("manzilni tuzatish: faqat lug'atdagi tuman va sabab bilan; `address_changed_by: chief`", async () => {
    const order = demoDb.orders.find((item) => item.status === "shipping" && !item.returned)!;
    const path = `/operator/chief/orders/${order.id}/address/`;
    expect((await patch(path, { district: "yoq_tuman", reason: "moved" })).status).toBe(400);
    expect((await patch(path, { district: "qoqon_sh" })).status).toBe(400);
    const fixed = mapLogistOrder((await patch(path, { district: "qoqon_sh", address_text: "Navoiy 5", landmark: "bozor", reason: "moved" })).data);
    expect(fixed.deliveryInfo?.addressChangedBy).toBe("chief");
    expect(fixed.zoning.district).toBe("qoqon_sh");
  });

  it("manzil javobi — detal (`history[]` bilan), xatolar maydonlarga; yopilgan zakaz — 409", async () => {
    const order = demoDb.orders.find((item) => item.status === "shipping" && !item.returned)!;
    const path = `/operator/chief/orders/${order.id}/address/`;
    expect(await patch(path, { district: "yoq_tuman", reason: "moved" })).toMatchObject({
      status: 400,
      data: { code: "validation_error", fields: { district: expect.any(Array) } },
    });
    const detail = mapChiefOrderDetail((await patch(path, { district: "qoqon_sh", landmark: "  ", reason: "clarified" })).data);
    expect(detail.order.deliveryInfo?.landmark).toBeNull();
    expect(detail.history.some((row) => row.action === "address_changed")).toBe(true);
    const closed = demoDb.orders.find((item) => item.status === "delivered")!;
    expect(await patch(`/operator/chief/orders/${closed.id}/address/`, { district: "qoqon_sh", reason: "moved" })).toMatchObject({
      status: 409,
      data: { code: "order_closed" },
    });
    expect(mapChiefMe((await get("/operator/chief/me/")).data).permissions["view.analytics"]).toBe(true);
  });

  it("logistga qaytarish: zakaz ro'yxatlardan chiqadi, qayta qaytarib bo'lmaydi", async () => {
    const incoming = asPage((await get("/operator/chief/orders/", { scope: "incoming" })).data).items.map(mapLogistOrder);
    const target = incoming[0]!;
    expect((await post(`/operator/chief/orders/${target.id}/return/`, { reason: "nimadir" })).status).toBe(400);
    expect(await post(`/operator/chief/orders/${target.id}/return/`, { reason: "other", note: " " })).toMatchObject({
      status: 400,
      data: { code: "validation_error", fields: { note: expect.any(Array) } },
    });
    expect((await post(`/operator/chief/orders/${target.id}/return/`, { reason: "address_unknown", note: "" })).status).toBe(200);
    const after = asPage((await get("/operator/chief/orders/", { scope: "incoming" })).data).items.map(mapLogistOrder);
    expect(after.some((order) => order.id === target.id)).toBe(false);
    expect((await post(`/operator/chief/orders/${target.id}/return/`, { reason: "other", note: "x" })).status).toBe(404);
    expect((await get(`/operator/chief/orders/${target.id}/`)).status).toBe(404);
  });
});
