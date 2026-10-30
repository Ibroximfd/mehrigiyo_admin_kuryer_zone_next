import { describe, expect, it } from "vitest";

import { orderBusyReason, stopMergeBlocker } from "./merge-rules";
import {
  partialStopProgress,
  mapAutoResult,
  mapCreatedStop,
  mapPayRate,
  mapStopList,
  mapSuggestions,
  suggestionBlocker,
  suggestionKey,
} from "./types";

/** `LOGIST_03` §1 — hujjatdagi to'xtash. */
const STOP = {
  id: 5,
  status: "open",
  date: "2026-10-27",
  address_text: "Chilonzor, 12-kvartal, 34-uy",
  lat: 41.2856,
  lng: 69.2034,
  courier_id: 3,
  order_ids: ["uuid1", "uuid2"],
  order_numbers: ["ORD-1", "ORD-2"],
  orders_count: 2,
  open_count: 2,
  payable_total: 310000,
  delivered_at: null,
};

describe("to'xtashlar", () => {
  it("hujjatdagi shakl, kuryer faqat id bo'lib kelsa ham", () => {
    const [stop] = mapStopList([STOP]);
    expect(stop).toMatchObject({ id: 5, payableTotal: 310000, ordersCount: 2, courier: { id: 3, fullName: "" } });
    expect(mapCreatedStop({ stop: STOP })?.id).toBe(5);
    expect(mapStopList({ results: [STOP, { nope: 1 }] })).toHaveLength(1);
  });

  it("takliflar — bittalik guruh tashlanadi, kalit tartibga bog'liq emas", () => {
    const list = mapSuggestions([
      { courier: { id: 3, full_name: "Ali" }, date: "2026-10-27", order_ids: ["b", "a"], order_numbers: [] },
      { order_ids: ["c"] },
    ]);
    expect(list).toHaveLength(1);
    expect(suggestionKey(list[0]!)).toBe(suggestionKey({ orderIds: ["a", "b"] }));
  });

  it("telefon+manzil takliflari oldinda, kuryer farqi qulflaydi", () => {
    const list = mapSuggestions([
      { courier: { id: 3, full_name: "Ali" }, order_ids: ["a", "b"] },
      {
        match: "phone_address",
        client: { full_name: "Dilnoza", phone: "+998901112233" },
        couriers_differ: true,
        order_ids: ["c", "d"],
      },
    ]);
    expect(list[0]).toMatchObject({
      match: "phone_address",
      clientPhone: "+998901112233",
      clientName: "Dilnoza",
      couriersDiffer: true,
    });
    expect(list[1]!.match).toBe("address");
    expect(suggestionBlocker(list[0]!)).toMatch(/har xil kuryerda/);
    expect(suggestionBlocker(list[1]!)).toBeNull();
    expect(suggestionBlocker({ couriersDiffer: false, courier: null })).toMatch(/kuryer biriktiring/);
  });

  it("avto natija va stavka", () => {
    expect(mapAutoResult({ created: [STOP], count: 1 }).count).toBe(1);
    const rate = mapPayRate({
      per_stop: 15000,
      can_edit: false,
      history: [{ per_stop: 15000, effective_from: "2026-10-01", created_by: { full_name: "Bosh logist" } }],
    });
    expect(rate).toMatchObject({ perStop: 15000, canEdit: false });
    expect(rate.history[0]!.createdBy).toBe("Bosh logist");
    expect(mapPayRate(null)).toEqual({ perStop: 0, canEdit: false, history: [] });
  });
});

describe("birlashtirish qoidasi (mijozdagi nusxa)", () => {
  const order = (patch: object) => ({
    orderNumber: "ORD-1",
    status: "confirmed",
    courier: { id: 3, fullName: "Ali", phone: null },
    stopId: null,
    changeRequest: null,
    paymentMethod: "cash",
    paymentStatus: "cod_pending",
    pendingReason: null,
    isPaid: false,
    paidAt: null,
    ...patch,
  });

  it("ruxsat: bitta kuryer, ochiq, to'xtashsiz", () => {
    expect(stopMergeBlocker([order({}), order({})])).toBeNull();
  });

  it("to'sqinliklar", () => {
    expect(stopMergeBlocker([order({})])).toMatch(/kamida ikkita/);
    expect(stopMergeBlocker([order({}), order({ status: "delivered" })])).toMatch(/ochiq/);
    expect(stopMergeBlocker([order({}), order({ stopId: 1 })])).toMatch(/boshqa manzilda/);
    expect(stopMergeBlocker([order({}), order({ courier: null })])).toMatch(/kuryer biriktiring/);
    expect(
      stopMergeBlocker([order({}), order({ courier: { id: 4, fullName: "B", phone: null } })]),
    ).toMatch(/bitta kuryerda/);
  });
});

describe("band buyurtma (v2, `order_busy`)", () => {
  const base = {
    changeRequest: null,
    paymentMethod: "cash",
    paymentStatus: "cod_pending",
    pendingReason: null,
    isPaid: false,
    paidAt: null,
  };
  const pendingRequest = {
    id: 7,
    kind: "add_item",
    status: "pending",
    items: [],
    note: null,
    photoUrl: null,
    createdAt: null,
    resolvedAt: null,
    resolvedBy: null,
    decisionNote: null,
    courier: null,
  };

  it("naqd, so'rovsiz — band emas", () => {
    expect(orderBusyReason(base)).toBeNull();
  });

  it("ochiq o'zgarish so'rovi — band, yopilgani — yo'q", () => {
    expect(orderBusyReason({ ...base, changeRequest: pendingRequest })).toMatch(/o'zgarish so'rovi/);
    expect(
      orderBusyReason({ ...base, changeRequest: { ...pendingRequest, status: "accepted" } }),
    ).toBeNull();
  });

  it("jonli onlayn to'lov — band; to'langani — yo'q", () => {
    expect(orderBusyReason({ ...base, pendingReason: "awaiting_online_payment" })).toMatch(/onlayn/);
    expect(orderBusyReason({ ...base, paymentMethod: "payme", paymentStatus: "processing" })).toMatch(
      /onlayn/,
    );
    expect(
      orderBusyReason({ ...base, paymentMethod: "payme", paymentStatus: "processing", isPaid: true }),
    ).toBeNull();
  });

  it("tanlovda band buyurtma — raqami va sababi bilan qulf", () => {
    const ok = { ...base, orderNumber: "A", status: "confirmed", courier: { id: 1, fullName: "", phone: null }, stopId: null };
    expect(
      stopMergeBlocker([ok, { ...ok, orderNumber: "B", changeRequest: pendingRequest }]),
    ).toBe("#B band — kuryerning o'zgarish so'rovi javob kutmoqda");
  });
});

describe("qisman yopilgan to'xtash", () => {
  it("band buyurtma o'tkazib yuborilgan — to'xtash ochiq, progress ko'rinadi", () => {
    expect(partialStopProgress({ status: "open", ordersCount: 3, openCount: 1 })).toEqual({ closed: 2, left: 1 });
    expect(partialStopProgress({ status: "open", ordersCount: 2, openCount: 2 })).toBeNull();
    expect(partialStopProgress({ status: "delivered", ordersCount: 2, openCount: 0 })).toBeNull();
  });
});
