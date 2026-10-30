import { describe, expect, it } from "vitest";

import type { OrderComment } from "./comments";
import {
  buildFallbackTimeline,
  filterTimeline,
  mapTimelineEvent,
  resolveTimelineDistricts,
  pendingDoorPayment,
} from "./timeline";
import { mapLogistOrder, mapOrderAudit } from "./types";

const order = mapLogistOrder({
  id: "o1",
  order_number: "DA-1",
  status: "shipping",
  total_amount: 600000,
  created_at: "2026-09-27T17:01:00+05:00",
  created_by: { kind: "operator", id: 7, name: "M. Xaydarov" },
  client: { full_name: "Bekzod", phone: "+998914004040" },
  confirmation: {
    required: true,
    confirmed_at: "2026-09-28T12:10:00+05:00",
    confirmed_by: "client",
    channel: "app_slide",
  },
  items: [{ medicine_name: "Rayhon krem", quantity: 2, price: 300000 }],
  delivery_attempts: [
    { id: 3, reason: "client_unavailable", note: "uyda yo'q", created_at: "2026-09-29T10:10:00+05:00", created_by: "Jasur" },
  ],
});

const audit = [
  mapOrderAudit({
    id: 11,
    action: "edit",
    admin: "Sardor T.",
    created_at: "2026-09-29T08:40:00+05:00",
    changes: {
      delivery_date: { from: "2026-09-28", to: "2026-09-29" },
      change_reason: { from: null, to: "Mijoz so'radi" },
    },
  }),
];

const comments: OrderComment[] = [
  { id: "c1", author: "M. Xaydarov", text: "Darvoza oldida qo'ng'iroq qiling", createdAt: new Date("2026-09-27T17:02:00+05:00"), local: false },
];

describe("buildFallbackTimeline", () => {
  it("audit, izoh, urinish, yaratildi va tasdiqni bitta xronologiyaga birlashtiradi", () => {
    const items = buildFallbackTimeline({ order, audit, comments });
    expect(items.map((item) => item.kind)).toEqual([
      "order.delivery_attempt",
      "edit",
      "order.confirmed",
      "comment.added",
      "order.created",
    ]);

    const edit = items[1]!;
    expect(edit.diffs).toEqual([
      { key: "delivery_date", label: "Yetkazish sanasi", from: "2026-09-28", to: "2026-09-29" },
    ]);
    // Sabab diff emas — alohida qator.
    expect(edit.reason).toBe("Mijoz so'radi");
    expect(items[2]!.title).toBe("Mijoz tasdiqladi");
    expect(items[4]!.who).toBe("Operator · M. Xaydarov");
  });

  it("filtr: o'zgarishlar va izohlar ajraladi", () => {
    const items = buildFallbackTimeline({ order, audit, comments });
    expect(filterTimeline(items, "changes").map((item) => item.kind)).toEqual(["edit"]);
    expect(filterTimeline(items, "comments").map((item) => item.kind)).toEqual(["comment.added"]);
    expect(filterTimeline(items, "all")).toHaveLength(5);
  });
});

describe("mapTimelineEvent", () => {
  it("status o'zgarishi: diff yorliqlar bilan, sabab va izoh birga", () => {
    const item = mapTimelineEvent({
      id: 5,
      kind: "order.status_changed",
      actor: { type: "logist", name: "Sardor T." },
      payload: { from: "delivered", to: "shipping", reason: "mistake", note: "xato bosildi" },
      created_at: "2026-09-29T09:00:00Z",
    });
    expect(item.who).toBe("Logist · Sardor T.");
    expect(item.diffs[0]).toMatchObject({ from: "Yetkazilgan", to: "Yo'lga chiqarilgan" });
    expect(item.reason).toBe("Xato bosildi · xato bosildi");
    expect(item.category).toBe("change");
  });

  it("order.updated: massiv qiymatlar matnga aylanadi", () => {
    const item = mapTimelineEvent({
      kind: "order.updated",
      actor: { type: "logist", name: "S" },
      payload: {
        changes: {
          items: {
            from: [{ name: "Rayhon krem", quantity: 1 }],
            to: [{ name: "Rayhon krem", quantity: 2 }],
          },
        },
        reason: "Mijoz so'radi",
      },
    });
    expect(item.diffs).toEqual([
      { key: "items", label: "Tarkib", from: "Rayhon krem ×1", to: "Rayhon krem ×2" },
    ]);
    expect(item.reason).toBe("Mijoz so'radi");
  });
});

describe("order.address_changed (HUDUD_3 §2)", () => {
  const payload = {
    by: "courier",
    courier: { id: 4, name: "Jasur" },
    reason: "client_error",
    comment: "Mijoz 7-uy dedi, 5 emas",
    before: { address_text: "Turkiston 5", locality: null, district: "fargona/qoqon_sh", lat: 40.5, lng: 70.9 },
    after: { address_text: "Turkiston 7, 2-podyezd", locality: "Navbahor MFY", district: "fargona/qoqon_sh", lat: 40.53, lng: 70.94 },
  };

  it("kuryer: sarlavha, kim, faqat o'zgargan maydonlar va sabab yorlig'i", () => {
    const item = mapTimelineEvent({
      id: "a1",
      kind: "order.address_changed",
      created_at: "2026-10-17T10:00:00+05:00",
      payload,
    });
    expect(item.title).toBe("Kuryer manzilni o'zgartirdi");
    expect(item.category).toBe("change");
    expect(item.icon).toBe("map");
    // `actor` yo'q — `payload.by` + kuryer ismi.
    expect(item.who).toBe("Kuryer · Jasur");
    expect(item.diffs).toEqual([
      { key: "address_text", label: "Manzil", from: "Turkiston 5", to: "Turkiston 7, 2-podyezd" },
      { key: "locality", label: "Mahalla / qishloq", from: "—", to: "Navbahor MFY" },
      { key: "coordinates", label: "Koordinata", from: "40.5, 70.9", to: "40.53, 70.94" },
    ]);
    expect(item.reason).toBe("Mijoz xato kiritgan · Mijoz 7-uy dedi, 5 emas");
  });

  it("logist va mijoz sarlavhalari; actor bo'lsa — o'sha", () => {
    const logist = mapTimelineEvent({
      kind: "order.address_changed",
      actor: { type: "logist", name: "Sardor T." },
      payload: { ...payload, by: "logist", reason: "moved", comment: null },
    });
    expect(logist.title).toBe("Logist manzilni o'zgartirdi");
    expect(logist.who).toBe("Logist · Sardor T.");
    expect(logist.reason).toBe("Ko'chib o'tgan");

    const client = mapTimelineEvent({
      kind: "order.address_changed",
      payload: { by: "client", reason: "clarified", before: {}, after: { locality: "Beshariq" } },
    });
    expect(client.title).toBe("Mijoz manzilni o'zgartirdi");
    expect(client.who).toBe("Mijoz");
    expect(client.diffs).toEqual([
      { key: "locality", label: "Mahalla / qishloq", from: "—", to: "Beshariq" },
    ]);
    expect(client.reason).toBe("Aniqlashtirildi");
  });

  it("noma'lum `by` va bo'sh diff — yiqilmaydi", () => {
    const item = mapTimelineEvent({
      kind: "order.address_changed",
      payload: { reason: "other", before: { address_text: "A" }, after: { address_text: "A" } },
    });
    expect(item.title).toBe("Manzil o'zgartirildi");
    expect(item.who).toBeNull();
    expect(item.diffs).toEqual([]);
    expect(item.reason).toBe("Boshqa");
  });
});

describe("order.address_changed: tuman nomi va changed[] (HUDUD_3 javobi Q4/Q9)", () => {
  const event = (payload: Record<string, unknown>) =>
    mapTimelineEvent({ id: "d1", kind: "order.address_changed", payload });

  it("`district_display` bo'lsa diffda kod emas, nom", () => {
    const item = event({
      by: "courier",
      reason: "client_error",
      changed: ["district"],
      before: { district: "fargona/beshariq", district_display: "Beshariq tumani" },
      after: { district: "fargona/qoqon_sh", district_display: "Qo'qon sh." },
    });
    expect(item.diffs).toEqual([
      { key: "district", label: "Tuman", from: "Beshariq tumani", to: "Qo'qon sh." },
    ]);
  });

  it("`changed[]` bo'lsa faqat o'sha maydonlar (koordinata ham shu bo'yicha)", () => {
    const item = event({
      by: "logist",
      reason: "clarified",
      changed: ["locality"],
      before: { address_text: "A", locality: null, lat: 40.1, lng: 70.1 },
      after: { address_text: "B", locality: "Navbahor MFY", lat: 40.2, lng: 70.2 },
    });
    expect(item.diffs.map((diff) => diff.key)).toEqual(["locality"]);

    const point = event({
      changed: ["lat", "lng"],
      before: { lat: 40.1, lng: 70.1 },
      after: { lat: 40.2, lng: 70.2 },
    });
    expect(point.diffs.map((diff) => diff.key)).toEqual(["coordinates"]);
  });

  it("nom yo'q — kod chiqadi, katalog bo'yicha nomlanadi; topilmasa kod qoladi", () => {
    const item = event({
      before: { district: "fargona/beshariq" },
      after: { district: "fargona/qoqon_sh", district_display: "Qo'qon sh." },
    });
    expect(item.diffs[0]).toMatchObject({
      from: "fargona/beshariq",
      to: "Qo'qon sh.",
      codes: { from: "fargona/beshariq", to: null },
    });

    const names: Record<string, string> = { "fargona/beshariq": "Beshariq" };
    const [resolved] = resolveTimelineDistricts([item], (code) => names[code] ?? null);
    expect(resolved?.diffs[0]).toMatchObject({ from: "Beshariq", to: "Qo'qon sh." });

    const [missing] = resolveTimelineDistricts([item], () => null);
    expect(missing?.diffs[0]).toMatchObject({ from: "fargona/beshariq" });
  });

  it("nomlanadigan narsa yo'q — o'sha massiv (memo buzilmaydi)", () => {
    const items = [event({ before: { address_text: "A" }, after: { address_text: "B" } })];
    expect(resolveTimelineDistricts(items, () => "X")).toBe(items);
  });
});

describe("eshikda onlayn to'lov (§2.4b)", () => {
  const opened = mapTimelineEvent({
    id: "e1",
    kind: "payment.door_opened",
    created_at: "2026-10-13T12:30:00+05:00",
    actor: { type: "courier", name: "Jasur" },
    payload: {
      provider: "payme_merchant",
      provider_display: "Payme",
      amount: 150000,
      expires_at: "2026-10-13T12:45:00+05:00",
    },
  });

  it("ochildi — provayder, summa, muddat va kuryer", () => {
    expect(opened.title).toBe("Eshikda onlayn to'lov ochildi");
    expect(opened.tone).toBe("warn");
    expect(opened.who).toBe("Kuryer · Jasur");
    expect(opened.text).toContain("Payme");
    expect(opened.text).toContain("150 000 so'm");
    expect(opened.text).toContain("gacha");
    expect(opened.door?.provider).toBe("Payme");
  });

  it("mijoz ochgan — actor client", () => {
    const item = mapTimelineEvent({
      kind: "payment.door_opened",
      created_at: "2026-10-13T12:30:00+05:00",
      actor: { type: "client" },
      payload: { provider: "click_merchant" },
    });
    expect(item.who).toBe("Mijoz");
    expect(item.door?.provider).toBe("Click");
  });

  it("yopildi — sabab matni", () => {
    const item = mapTimelineEvent({
      kind: "payment.door_closed",
      created_at: "2026-10-13T12:46:00+05:00",
      payload: { provider: "payme_merchant", reason: "provider_cancelled", back_to: "cash" },
    });
    expect(item.title).toBe("Onlayn to'lov yopildi — naqdga qaytdi");
    expect(item.text).toBe("Mijoz to'lov oynasida bekor qildi");
  });

  it("to'landi eshikda — onlayn deb yoziladi", () => {
    const item = mapTimelineEvent({
      kind: "payment.paid",
      created_at: "2026-10-13T12:35:00+05:00",
      payload: { provider: "payme_merchant", provider_display: "Payme", amount: 150000, door: true },
    });
    expect(item.text).toBe("Eshikda onlayn · Payme · 150 000 so'm");
  });

  it("kutilayotgan to'lov: ochiq, to'langan, yopilgan, muddati o'tgan", () => {
    const at = new Date("2026-10-13T12:40:00+05:00");
    expect(pendingDoorPayment([opened], at)?.provider).toBe("Payme");

    const paid = mapTimelineEvent({
      kind: "payment.paid",
      created_at: "2026-10-13T12:35:00+05:00",
      payload: { door: true },
    });
    expect(pendingDoorPayment([opened, paid], at)).toBeNull();

    const closed = mapTimelineEvent({
      kind: "payment.door_closed",
      created_at: "2026-10-13T12:38:00+05:00",
      payload: { reason: "cancelled" },
    });
    expect(pendingDoorPayment([closed, opened], at)).toBeNull();

    expect(pendingDoorPayment([opened], new Date("2026-10-13T12:50:00+05:00"))).toBeNull();
  });
});
