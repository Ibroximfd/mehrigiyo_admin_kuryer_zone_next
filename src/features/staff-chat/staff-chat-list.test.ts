import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import { selectOrderChatUnread } from "./order-chat-unread";
import { createBackoffInterval } from "./poll";
import { applyStaffBadge, clearStaffChannelUnread } from "./realtime";
import { findFirstUnreadId } from "./timeline";
import { mapStaffChannel, mapStaffMessage, mapUnreadByOrder } from "./types";
import type { UnreadByOrder } from "./types";

/** 2026-10-01 C §13 — hujjatdagi JSON misollari. */
describe("channels/ — `order.client` (§13.3)", () => {
  const DOC_CHANNEL = {
    id: 312,
    kind: "order",
    title: "ORD-20261001143022-A7F3B9C1",
    slug: null,
    order: {
      id: "3f6c1a7e-2b84-4c11-9d0a-7e51f0b9a2cd",
      order_number: "ORD-20261001143022-A7F3B9C1",
      status: "confirmed",
      total_amount: "480000.00",
      client: { full_name: "Dilnoza Rahimova", phone: "998901234567" },
    },
    filial_id: 1,
    unread: 3,
    last_message: {
      text: "Mijoz 16:00 dan keyin uyda bo'ladi",
      by: "Aziz Qoraboyev",
      at: "2026-10-01T10:15:33.221104+05:00",
    },
  };

  it("mijoz kanal yuklamasidan — har kanal uchun so'rov yo'q", () => {
    const channel = mapStaffChannel(DOC_CHANNEL);
    expect(channel.order?.client).toEqual({
      fullName: "Dilnoza Rahimova",
      phone: "998901234567",
    });
    expect(channel.unread).toBe(3);
    expect(channel.lastMessage?.by).toBe("Aziz Qoraboyev");
  });

  it("telefon bo'sh satr — ataylab; ikkalasi bo'sh — `null`", () => {
    const noPhone = mapStaffChannel({
      ...DOC_CHANNEL,
      order: {
        ...DOC_CHANNEL.order,
        client: { full_name: "Dilnoza Rahimova", phone: "" },
      },
    });
    expect(noPhone.order?.client).toEqual({
      fullName: "Dilnoza Rahimova",
      phone: "",
    });
    const empty = mapStaffChannel({
      ...DOC_CHANNEL,
      order: { ...DOC_CHANNEL.order, client: { full_name: "", phone: "" } },
    });
    expect(empty.order?.client).toBeNull();
  });
});

describe("unread-by-order/ (§13.1)", () => {
  const DOC = {
    success: true,
    orders: [
      {
        order_id: "3f6c1a7e-2b84-4c11-9d0a-7e51f0b9a2cd",
        channel_id: 312,
        unread: 3,
        last_message: {
          text: "Mijoz 16:00 dan keyin uyda bo'ladi",
          by: "Aziz Qoraboyev",
          at: "2026-10-01T10:15:33.221104+05:00",
        },
      },
      {
        order_id: "a1d02f64-9b30-4f8e-8e22-1c7d55bb90aa",
        channel_id: 298,
        unread: 1,
        last_message: {
          text: "Karta orqali to'lamoqchi",
          by: "Nodira Yusupova",
          at: "2026-10-01T09:48:11.004512+05:00",
        },
      },
    ],
    orders_count: 2,
  };

  it("order_id → belgi xaritasi, `orders_count` — kartalar soni", () => {
    const data = mapUnreadByOrder(DOC);
    expect(data.ordersCount).toBe(2);
    const map = selectOrderChatUnread(data);
    expect(map["3f6c1a7e-2b84-4c11-9d0a-7e51f0b9a2cd"]).toEqual({
      count: 3,
      channelId: 312,
      lastMessage: {
        text: "Mijoz 16:00 dan keyin uyda bo'ladi",
        by: "Aziz Qoraboyev",
        at: "2026-10-01T10:15:33.221104+05:00",
      },
    });
    expect(Object.keys(map)).toHaveLength(2);
  });

  function seeded() {
    const client = new QueryClient();
    client.setQueryData(queryKeys.staffUnreadByOrder, mapUnreadByOrder(DOC));
    return client;
  }

  it("`staff_badge` (§9.3) — `order_id` bo'yicha joyida: yangi buyurtma qo'shiladi, son +1", () => {
    const client = seeded();
    applyStaffBadge(client, {
      type: "staff_badge",
      channel_id: 400,
      channel_kind: "order",
      order_id: "new-order",
      created_at: "2026-10-01T10:20:00.000000+05:00",
      sender: {
        user_id: 904,
        full_name: "Aziz Qoraboyev",
        operator_id: 14,
        role: "operator",
      },
      preview: "Kuryer yo'lda",
    });
    const data = client.getQueryData<UnreadByOrder>(
      queryKeys.staffUnreadByOrder,
    )!;
    expect(data.ordersCount).toBe(3);
    expect(data.orders[0]).toEqual({
      orderId: "new-order",
      channelId: 400,
      systemUnread: 0,
      unread: 1,
      lastMessage: {
        text: "Kuryer yo'lda",
        by: "Aziz Qoraboyev",
        at: "2026-10-01T10:20:00.000000+05:00",
      },
    });
  });

  it("guruh kanalida `order_id: null` — belgi o'zgarmaydi", () => {
    const client = seeded();
    applyStaffBadge(client, {
      channel_id: 1,
      channel_kind: "group",
      order_id: null,
      preview: "Salom",
    });
    expect(
      client.getQueryData<UnreadByOrder>(queryKeys.staffUnreadByOrder)!
        .ordersCount,
    ).toBe(2);
  });

  it("kanal o'qildi — buyurtma belgidan chiqadi", () => {
    const client = seeded();
    clearStaffChannelUnread(client, 298);
    const data = client.getQueryData<UnreadByOrder>(
      queryKeys.staffUnreadByOrder,
    )!;
    expect(data.ordersCount).toBe(1);
    expect(data.orders.map((item) => item.channelId)).toEqual([312]);
  });
});

describe("createBackoffInterval", () => {
  it("doubles while nothing changes and resets on change", () => {
    const next = createBackoffInterval({ minMs: 1000, maxMs: 4000 });
    const data = { a: 1 };
    expect(next(data, 1)).toBe(1000);
    expect(next(data, 1)).toBe(1000); // o'sha javob — o'zgarmaydi
    expect(next(data, 2)).toBe(2000);
    expect(next(data, 3)).toBe(4000);
    expect(next(data, 4)).toBe(4000);
    expect(next({ a: 2 }, 5)).toBe(1000);
  });
});

describe("findFirstUnreadId", () => {
  const messages = [1, 2, 3, 4].map((id) =>
    mapStaffMessage({ id, channel_id: 1, is_mine: id === 3 }),
  );

  it("places the divider before the last N foreign messages", () => {
    expect(findFirstUnreadId(messages, 2)).toBe(2);
    expect(findFirstUnreadId(messages, 1)).toBe(4);
    expect(findFirstUnreadId(messages, 10)).toBe(1);
    expect(findFirstUnreadId(messages, 0)).toBeNull();
  });
});
