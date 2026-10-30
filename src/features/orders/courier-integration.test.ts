import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { mapDeliveryAnomaly } from "./anomalies";
import {
  COURIER_MESSAGE_MAX,
  applyCourierMessageEvent,
  checkCourierAttachment,
  courierMessageTextError,
  courierMessagePreview,
  mapCourierMessage,
  mergeCourierMessages,
} from "./courier-messages";
import type { CourierMessage } from "./courier-messages";
import { anomalyLabel, anomalyTone, mapDeliveryProof } from "./delivery-proof";
import { mapLogistOrder, paymentView } from "./types";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/** Namunalar — `KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.1, §2.5, §2.7. */
const proofJson = {
  photos: [
    {
      full: "https://imorganic.uz/media/courier/a.jpg",
      thumb: "https://imorganic.uz/media/courier/a_thumb.jpg",
    },
  ],
  delivered_at: "2026-10-12T09:41:03Z",
  received_amount: 155000,
  received_amount_display: "155 000 so'm",
  payment_kind: "cash",
  distance_to_address_m: 38,
  time_drift_s: 2,
  location: { lat: 41.2856, lng: 69.2034 },
  note: null,
  anomaly_flags: ["far_from_address"],
};

describe("buyurtma — kuryer maydonlari", () => {
  it("bosqich, marshrut o'rni va isbot o'qiladi", () => {
    const order = mapLogistOrder({
      id: "o1",
      order_number: "12341",
      status: "delivered",
      delivery_stage: "delivered",
      route_position: 2,
      delivery_proof: proofJson,
    });
    expect(order.deliveryStage).toBe("delivered");
    expect(order.routePosition).toBe(2);
    expect(order.deliveryProof?.photos[0]?.thumb).toContain("_thumb");
    expect(order.deliveryProof?.distanceToAddressM).toBe(38);
    expect(order.deliveryProof?.anomalyFlags).toEqual(["far_from_address"]);
    expect(anomalyLabel("far_from_address")).toBe("Manzildan uzoqda yopilgan");
  });

  it("eski javob — maydonlar null, yiqilmaydi", () => {
    const order = mapLogistOrder({ id: "o2", status: "shipping" });
    expect(order.deliveryStage).toBeNull();
    expect(order.deliveryProof).toBeNull();
    expect(order.routePosition).toBeNull();
  });

  it("thumb null bo'lsa asl rasm ishlatiladi", () => {
    const proof = mapDeliveryProof({
      photos: [{ full: "https://x/a.jpg", thumb: null }],
    });
    expect(proof?.photos[0]?.thumb).toBe("https://x/a.jpg");
  });

  it("with_courier — 'Pul kuryerda', 'To'langan' emas", () => {
    const view = paymentView(
      mapLogistOrder({
        id: "o3",
        status: "delivered",
        payment_method: "cash",
        is_paid: true,
        payment_status: "with_courier",
        payable_amount: 155000,
      }),
    );
    expect(view.state).toBe("with_courier");
    expect(view.label).toBe("Pul kuryerda");
  });

  it("anomaliya qatori", () => {
    const item = mapDeliveryAnomaly({
      order_id: "o1",
      order_number: "12341",
      courier: { id: 7, full_name: "Aziz Karimov" },
      flags: ["far_from_address", "partial_amount"],
      proof: proofJson,
    });
    expect(item.courier?.fullName).toBe("Aziz Karimov");
    expect(item.flags).toHaveLength(2);
    expect(item.proof?.receivedAmount).toBe(155000);
  });
});

describe("kuryer bilan chat", () => {
  const messages: CourierMessage[] = [
    mapCourierMessage({
      id: 41,
      kind: "text",
      text: "Yetib keldim",
      created_at: "2026-10-13T08:00:00Z",
      read_at: null,
      author: { id: 7, name: "Aziz Karimov", role: "courier" },
    }),
    mapCourierMessage({
      id: 42,
      kind: "voice",
      text: "",
      audio_url: "https://x/a.m4a",
      duration_ms: 7400,
      author: { id: 7, name: "Aziz", role: "courier" },
    }),
    mapCourierMessage({
      id: 43,
      kind: "system",
      event: "delivered",
      photo_count: 2,
      text: "Buyurtma yetkazildi",
      author: { id: null, name: "", role: "system" },
    }),
  ];

  it("turlar va rollar", () => {
    expect(messages.map((m) => m.role)).toEqual([
      "courier",
      "courier",
      "system",
    ]);
    expect(messages[1]?.audioUrl).toBe("https://x/a.m4a");
    expect(messages[2]?.photoCount).toBe(2);
  });

  it("birlashtirish id bo'yicha, takrorsiz va tartibli", () => {
    const merged = mergeCourierMessages(messages, [messages[0]!]);
    expect(merged.map((m) => m.id)).toEqual([41, 42, 43]);
  });

  it("WS: yangi xabar keshga qo'shiladi, o'qildi belgisi qo'yiladi", () => {
    const client = new QueryClient();
    const key = queryKeys.orderCourierMessages("o1");
    client.setQueryData(key, messages);

    applyCourierMessageEvent(client, "order_message_created", {
      order_id: "o1",
      message: {
        id: 44,
        kind: "text",
        text: "Mijoz 15:00 da uyda",
        author: { id: 3, name: "Nilufar", role: "logist" },
      },
    });
    applyCourierMessageEvent(client, "order_messages_read", {
      order_id: "o1",
      up_to_id: 44,
    });

    const after = client.getQueryData<CourierMessage[]>(key) ?? [];
    expect(after).toHaveLength(4);
    expect(after[3]?.role).toBe("logist");
    expect(after[3]?.readAt).not.toBeNull();
    // Kuryer xabarlariga "kuryer o'qidi" hodisasi tegmaydi.
    expect(after[0]?.readAt).toBeNull();
  });

  it("chat ochilmagan buyurtma — kesh yaratilmaydi", () => {
    const client = new QueryClient();
    applyCourierMessageEvent(client, "order_message_created", {
      order_id: "o9",
      message: { id: 1, kind: "text", text: "x", author: { role: "courier" } },
    });
    expect(
      client.getQueryData(queryKeys.orderCourierMessages("o9")),
    ).toBeUndefined();
  });
});

describe("kuryer xabari — kiruvchi quti", () => {
  it("buyurtma raqami keshdan topiladi (doska shakli)", async () => {
    const { findOrderNumberInCache } = await import("./courier-messages");
    const client = new QueryClient();
    client.setQueryData(["orders", "board", "logist", {}], {
      columns: [
        {
          status: "shipping",
          orders: [{ id: "o7", orderNumber: "ORD-1-ABC" }],
        },
      ],
    });
    expect(findOrderNumberInCache(client, "o7")).toBe("ORD-1-ABC");
    expect(findOrderNumberInCache(client, "nope")).toBeNull();
  });

  it("ovoz va uzun matn uchun qisqa ko'rinish", async () => {
    const { courierMessagePreview } = await import("./courier-messages");
    const voice = mapCourierMessage({
      id: 8,
      kind: "voice",
      audio_url: "https://x/a.m4a",
    });
    expect(courierMessagePreview(voice)).toContain("Ovozli xabar");
    const long = mapCourierMessage({
      id: 9,
      kind: "text",
      text: "a".repeat(300),
    });
    expect(courierMessagePreview(long).length).toBeLessThanOrEqual(118);
  });

  it("kuryer xabari qutiga tushadi, logist xabari tushmaydi", async () => {
    const { notifyCourierMessage } = await import("./courier-inbox");
    const { useCourierInboxStore } =
      await import("@/stores/courier-inbox-store");
    const client = new QueryClient();
    client.setQueryData(["orders", "detail", "o5"], {
      order: { id: "o5", orderNumber: "ORD-5-XYZ" },
    });
    const opened: string[] = [];
    const notice = notifyCourierMessage(
      client,
      {
        order_id: "o5",
        message: {
          id: 1,
          kind: "text",
          text: "Yetib keldim",
          author: { name: "Aziz", role: "courier" },
        },
      },
      (id) => opened.push(id),
    );
    expect(notice?.title).toBe("#ORD-5-XYZ · Aziz");
    expect(useCourierInboxStore.getState().entries.o5?.count).toBe(1);

    notifyCourierMessage(
      client,
      {
        order_id: "o5",
        message: {
          id: 2,
          kind: "text",
          text: "ok",
          author: { role: "logist" },
        },
      },
      () => undefined,
    );
    expect(useCourierInboxStore.getState().entries.o5?.count).toBe(1);

    useCourierInboxStore.getState().clear("o5");
    expect(useCourierInboxStore.getState().entries.o5).toBeUndefined();
  });
});

describe("kuryer chati: rasm, fayl, ovoz (§2.5, 2026-10-13)", () => {
  it("image va file xabarlari o'qiladi", () => {
    const image = mapCourierMessage({
      id: 44,
      kind: "image",
      text: "eshik mana",
      created_at: "2026-10-14T06:00:00Z",
      author: { id: 7, name: "Aziz", role: "courier" },
      url: "https://imorganic.uz/media/courier/a.jpg",
      thumb: "https://imorganic.uz/media/courier/a_t.webp",
      name: "",
      size: 183420,
      content_type: "image/jpeg",
    });
    expect(image.kind).toBe("image");
    expect(image.thumb).toContain("_t.webp");
    expect(image.text).toBe("eshik mana");
    expect(courierMessagePreview(image)).toBe("eshik mana");

    const file = mapCourierMessage({
      id: 45,
      kind: "file",
      author: { role: "logist" },
      url: "/media/courier/chek.pdf",
      thumb: null,
      name: "chek.pdf",
      size: 48210,
    });
    expect(file.kind).toBe("file");
    expect(file.url).toMatch(/^https?:\/\/.+chek\.pdf$/);
    expect(file.thumb).toBeNull();
    expect(file.fileName).toBe("chek.pdf");
    expect(file.fileSize).toBe(48210);
    expect(courierMessagePreview(file)).toBe("📎 chek.pdf");
  });

  it("noma'lum tur matn sifatida ko'rinadi", () => {
    expect(mapCourierMessage({ id: 1, kind: "sticker", text: "x" }).kind).toBe(
      "text",
    );
  });

  it("biriktirma tekshiruvi: tur va 5 MB chegarasi", () => {
    const make = (name: string, type: string, size: number) => {
      const file = new File(["x"], name, { type });
      Object.defineProperty(file, "size", { value: size });
      return file;
    };
    expect(checkCourierAttachment(make("a.png", "image/png", 10))).toEqual({
      ok: true,
      kind: "image",
    });
    expect(
      checkCourierAttachment(make("chek.pdf", "application/pdf", 10)),
    ).toEqual({ ok: true, kind: "file" });
    expect(checkCourierAttachment(make("x.exe", "", 10)).ok).toBe(false);
    expect(
      checkCourierAttachment(make("big.pdf", "application/pdf", 6 * 1024 * 1024))
        .ok,
    ).toBe(false);
  });
});

describe("chat matni (HUDUD_3 javobi §3)", () => {
  it("chegara 4096 belgi", () => {
    expect(COURIER_MESSAGE_MAX).toBe(4096);
  });

  it("`400 {fields:{text:[…]}}` — kompozer ostidagi matn", () => {
    const error = new ApiError("Xato", 400, {
      code: "validation_error",
      fields: { text: ["Ruxsatsiz havola"] },
    }, "validation_error");
    expect(courierMessageTextError(error)).toBe("Ruxsatsiz havola");
  });

  it("boshqa xato — `null` (toast bo'ladi)", () => {
    expect(courierMessageTextError(new ApiError("Server", 500))).toBeNull();
    expect(courierMessageTextError(new ApiError("X", 400, { fields: { kind: ["?"] } }))).toBeNull();
    expect(courierMessageTextError(new Error("tarmoq"))).toBeNull();
  });
});

describe("anomaliya belgilari (HUDUD_3 javobi Q17)", () => {
  it("`mock_location` — \"Soxta GPS\", qizil; oddiylari sariq", () => {
    expect(anomalyLabel("mock_location")).toBe("Soxta GPS");
    expect(anomalyTone("mock_location")).toBe("danger");
    expect(anomalyTone("far_from_address")).toBe("danger");
    expect(anomalyTone("time_drift")).toBe("warn");
    expect(anomalyLabel("yangi_belgi")).toBe("yangi_belgi");
  });

  it("isbotda `anomaly_flags` va `distance_to_address_m` o'qiladi", () => {
    const proof = mapDeliveryProof({
      distance_to_address_m: 420,
      anomaly_flags: ["far_from_address", "mock_location"],
    });
    expect(proof?.distanceToAddressM).toBe(420);
    expect(proof?.anomalyFlags.map(anomalyLabel)).toEqual(["Manzildan uzoqda yopilgan", "Soxta GPS"]);
  });
});
