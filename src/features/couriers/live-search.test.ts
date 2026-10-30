import { describe, expect, it } from "vitest";

import { FOLLOW_PAUSE_MS, searchLiveCouriers, shouldFollow, soleMatch } from "./live-search";
import { mapLiveCourier } from "./live-tracking";

const couriers = [
  mapLiveCourier({
    id: 1,
    full_name: "Shohruh O'ktamov",
    phone: "998901234567",
    zones: [{ id: 1, name: "Chilonzor" }],
    current_order: { id: "o-1", order_number: "DA-184011" },
  }),
  mapLiveCourier({ id: 2, full_name: "Aziza Karimova", phone: "998971112233", zones: ["Yunusobod"] }),
  mapLiveCourier({ id: 3, full_name: "Olim Toshev", phone: "998933334455" }),
];

describe("searchLiveCouriers", () => {
  it("bo'sh so'rov — null (filtr yo'q)", () => {
    expect(searchLiveCouriers(couriers, "")).toBeNull();
    expect(searchLiveCouriers(couriers, "   ")).toBeNull();
  });

  it("ism: lotin, kirill, apostrofsiz", () => {
    expect(searchLiveCouriers(couriers, "shoh")?.map((h) => h.courier.id)).toEqual([1]);
    expect(searchLiveCouriers(couriers, "Шохрух")?.map((h) => h.courier.id)).toEqual([1]);
    expect(searchLiveCouriers(couriers, "oktamov")?.map((h) => h.courier.id)).toEqual([1]);
  });

  it("telefon: kod bilan va kodsiz, probellar bilan", () => {
    expect(searchLiveCouriers(couriers, "97 111")?.map((h) => h.courier.id)).toEqual([2]);
    expect(searchLiveCouriers(couriers, "998933334455")?.map((h) => h.courier.id)).toEqual([3]);
  });

  it("zona va buyurtma raqami", () => {
    expect(searchLiveCouriers(couriers, "yunus")?.map((h) => h.courier.id)).toEqual([2]);
    expect(searchLiveCouriers(couriers, "184011")?.map((h) => h.courier.id)).toEqual([1]);
    expect(searchLiveCouriers(couriers, "DA-18")?.map((h) => h.courier.id)).toEqual([1]);
  });

  it("boshidan moslik yuqorida; hech narsa — bo'sh ro'yxat", () => {
    const hits = searchLiveCouriers(couriers, "o");
    expect(hits?.[0]?.courier.id).toBe(3);
    expect(searchLiveCouriers(couriers, "zzz")).toEqual([]);
  });

  it("soleMatch — faqat yagona natijada", () => {
    expect(soleMatch(searchLiveCouriers(couriers, "aziza"))?.id).toBe(2);
    expect(soleMatch(searchLiveCouriers(couriers, "o"))).toBeNull();
    expect(soleMatch(null)).toBeNull();
  });
});

describe("shouldFollow", () => {
  const now = 1_000_000;
  it("fokus yo'q yoki boshqa kuryer — kuzatmaydi", () => {
    expect(shouldFollow({ focusedId: null, movedId: 1, lastUserPanAt: null, now })).toBe(false);
    expect(shouldFollow({ focusedId: 2, movedId: 1, lastUserPanAt: null, now })).toBe(false);
  });
  it("fokusdagi kuryer, surilmagan — kuzatadi", () => {
    expect(shouldFollow({ focusedId: 1, movedId: 1, lastUserPanAt: null, now })).toBe(true);
  });
  it("oxirgi 10 s ichida surilgan — to'xtaydi, keyin davom etadi", () => {
    expect(shouldFollow({ focusedId: 1, movedId: 1, lastUserPanAt: now - 3_000, now })).toBe(false);
    expect(shouldFollow({ focusedId: 1, movedId: 1, lastUserPanAt: now - FOLLOW_PAUSE_MS, now })).toBe(true);
  });
});
