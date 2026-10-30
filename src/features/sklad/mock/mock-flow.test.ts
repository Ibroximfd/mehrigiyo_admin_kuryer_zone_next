import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";

import {
  mapCourierDetail,
  mapCourierStock,
  mapDocument,
  mapItem,
  mapOverview,
  mapRegionPanel,
  mapSkladMe,
} from "../types";
import { COURIERS, ITEMS, onHand, primaryOf, session } from "./db";
import { mockRequest } from "./index";

/**
 * Mock shartnoma oqimi: har ekran endpointi `map*` orqali o'qiladi va
 * hujjat amallari qoldiqni to'g'ri o'zgartiradi. Backend kelganda shu
 * test o'rnini `SKLAD_API_1.md` namunalari egallaydi.
 */
const get = (path: string, searchParams: Record<string, unknown> = {}) =>
  mockRequest("get", path, { searchParams });
const post = (path: string, json: unknown) => mockRequest("post", path, { json });

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("xato kutilgan edi");
}

describe("sklad mock — ekranlar", () => {
  it("me, overview, viloyat paneli, kuryerlar shartnoma shaklida", async () => {
    const me = mapSkladMe(await get("/sklad/me/"));
    expect(me.role).toBe("logist.main");

    const overview = mapOverview(await get("/sklad/overview/"));
    expect(overview.regions).toHaveLength(14);
    expect(overview.totals.onHand).toBeGreaterThan(0);
    // Mockda ataylab bitta manfiy qoldiq — `alert` holati ko'rinsin.
    expect(overview.regions.some((region) => region.status === "alert")).toBe(true);

    const panel = mapRegionPanel(await get("/sklad/regions/toshkent_shahar/"));
    expect(panel.locations).toHaveLength(3);
    expect(panel.items.length).toBeGreaterThan(0);
    expect(panel.items[0]!.item.pinned).toBe(true);

    const couriers = (await get("/sklad/couriers/")) as unknown[];
    expect(couriers.map(mapCourierStock)).toHaveLength(COURIERS.length);

    const detail = mapCourierDetail(await get(`/sklad/couriers/${COURIERS[0]!.id}/`));
    expect(detail.courier.id).toBe(COURIERS[0]!.id);
  });

  it("nazoratsiz mahsulot qoldiq va panelda chiqmaydi", async () => {
    const items = ((await get("/sklad/items/")) as unknown[]).map(mapItem);
    const off = items.find((item) => !item.stockTracking)!;
    const stock = (await get("/sklad/stock/", { item: off.id })) as unknown[];
    expect(stock).toHaveLength(0);
  });
});

describe("sklad mock — hujjatlar", () => {
  const store = primaryOf("fargona")!;
  const item = ITEMS[0]!;

  it("kirim qo'shadi, chiqim ayiradi, yetmasa shortages qaytaradi", async () => {
    const before = onHand(store.id, item.id);
    const receipt = mapDocument(
      await post("/sklad/documents/", { type: "receipt", location_id: store.id, lines: [{ item_id: item.id, quantity: 120 }] }),
    );
    expect(receipt.number.startsWith("KIR-")).toBe(true);
    expect(receipt.stock[0]!.onHand).toBe(before + 120);

    const writeOff = await post("/sklad/documents/", {
      type: "write_off",
      location_id: store.id,
      reason: "damaged",
      lines: [{ item_id: item.id, quantity: 20 }],
    });
    expect(mapDocument(writeOff).stock[0]!.onHand).toBe(before + 100);

    const error = await failure(
      post("/sklad/documents/", { type: "write_off", location_id: store.id, reason: "lost", lines: [{ item_id: item.id, quantity: 1_000_000 }] }),
    );
    expect(error.code).toBe("insufficient_stock");
  });

  it("kuryerga berish, qabul va tuzatish", async () => {
    const courier = COURIERS.find((entry) => entry.region === "fargona")!;
    const storeBefore = onHand(store.id, item.id);
    const courierBefore = onHand(courier.location_id, item.id);

    await post("/sklad/documents/", { type: "courier_load", location_id: store.id, courier_id: courier.id, lines: [{ item_id: item.id, quantity: 10 }] });
    expect(onHand(store.id, item.id)).toBe(storeBefore - 10);
    expect(onHand(courier.location_id, item.id)).toBe(courierBefore + 10);

    await post("/sklad/documents/", { type: "courier_return", location_id: store.id, courier_id: courier.id, mode: "partial", lines: [{ item_id: item.id, quantity: 4 }] });
    expect(onHand(courier.location_id, item.id)).toBe(courierBefore + 6);

    const adjust = mapDocument(
      await post("/sklad/documents/", { type: "adjustment", courier_id: courier.id, reason: "count_diff", lines: [{ item_id: item.id, actual_qty: 3 }] }),
    );
    expect(adjust.lines[0]!.after).toBe(3);
    expect(onHand(courier.location_id, item.id)).toBe(3);

    const mismatch = await failure(
      post("/sklad/documents/", { type: "courier_load", location_id: primaryOf("andijon")!.id, courier_id: courier.id, lines: [{ item_id: item.id, quantity: 1 }] }),
    );
    expect(mismatch.code).toBe("courier_region_mismatch");
  });

  it("nazoratsiz mahsulot hujjatga kirmaydi", async () => {
    const off = ITEMS.find((entry) => !entry.stock_tracking)!;
    const error = await failure(
      post("/sklad/documents/", { type: "receipt", location_id: store.id, lines: [{ item_id: off.id, quantity: 1 }] }),
    );
    expect(error.code).toBe("tracking_off");
  });
});

describe("sklad mock — nazorat, dopusk, pin", () => {
  it("nazorat yoqilsa BOSH- qatorlar yoziladi, o'chirilsa dopusk bekor bo'ladi", async () => {
    const off = ITEMS.find((entry) => !entry.stock_tracking)!;
    const store = primaryOf("samarqand")!;
    await post(`/sklad/items/${off.id}/tracking/on/`, { opening: [{ location_id: store.id, quantity: 66 }], min_quantity: 10, note: "" });
    expect(onHand(store.id, off.id)).toBe(66);
    expect(mapItem(((await get("/sklad/items/", { q: off.name })) as unknown[])[0]).stockTracking).toBe(true);

    await post("/sklad/grants/", { item_ids: [off.id], filial_id: 2, note: "" });
    expect(((await get("/sklad/grants/", { item: off.id })) as unknown[]).length).toBe(1);

    await post(`/sklad/items/${off.id}/tracking/off/`, { reason: "manual" });
    expect(((await get("/sklad/grants/", { item: off.id })) as unknown[]).length).toBe(0);
  });

  it("filial logisti faqat dopusk berilgan mahsulotni yozadi", async () => {
    session.role = "logist.branch";
    session.filial_id = 2;
    try {
      const me = mapSkladMe(await get("/sklad/me/"));
      expect(me.grantedItemIds).toContain(120);

      const store = primaryOf("andijon")!;
      await post("/sklad/documents/", { type: "receipt", location_id: store.id, lines: [{ item_id: 120, quantity: 5 }] });

      const denied = await failure(
        post("/sklad/documents/", { type: "receipt", location_id: store.id, lines: [{ item_id: 121, quantity: 5 }] }),
      );
      expect(denied.code).toBe("grant_required");

      const forbidden = await failure(post("/sklad/grants/", { item_ids: [121], filial_id: 3 }));
      expect(forbidden.code).toBe("role_forbidden");
    } finally {
      session.role = "logist.main";
      session.filial_id = 1;
    }
  });

  it("pin qo'yiladi va yechiladi", async () => {
    await mockRequest("put", "/sklad/items/125/pin/", {});
    expect(mapItem(((await get("/sklad/items/", { q: ITEMS[5]!.name })) as unknown[])[0]).pinned).toBe(true);
    await mockRequest("delete", "/sklad/items/125/pin/", {});
    expect(mapItem(((await get("/sklad/items/", { q: ITEMS[5]!.name })) as unknown[])[0]).pinned).toBe(false);
  });
});
