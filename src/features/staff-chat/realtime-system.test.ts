import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import { applyStaffBadge, applyStaffMessage } from "./realtime";
import type { UnreadByOrder } from "./types";

const ORDER_ID = "3f6c1a7e-2b84-4c11-9d0a-7e51f0b9a2cd";
const CHANNEL = {
  id: 312,
  kind: "order",
  title: "ORD-1",
  unread: 0,
  lastMessage: { text: "Mijoz uyda", by: "Aziz", at: null },
};

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData<UnreadByOrder>(queryKeys.staffUnreadByOrder, {
    orders: [],
    ordersCount: 0,
  });
  queryClient.setQueryData(queryKeys.staffUnread, { unread: 0 });
  queryClient.setQueryData(["staff-chat", "channels", "all"], [CHANNEL]);
  return queryClient;
}

const totalOf = (queryClient: QueryClient) =>
  queryClient.getQueryData<{ unread: number }>(queryKeys.staffUnread)?.unread;

describe("tizim xabari — faqat buyurtmaning o'zida", () => {
  it("`staff_message` (system) — kartada +1, xodimlar chatida hech narsa", () => {
    const queryClient = setup();
    applyStaffMessage(queryClient, {
      type: "staff_message",
      order_id: ORDER_ID,
      message: {
        id: 9001,
        channel_id: 312,
        kind: "system",
        text: "Status: Tasdiqlangan",
      },
    });

    const entry = queryClient.getQueryData<UnreadByOrder>(
      queryKeys.staffUnreadByOrder,
    )?.orders[0];
    expect(entry).toMatchObject({
      orderId: ORDER_ID,
      unread: 1,
      systemUnread: 1,
    });
    expect(totalOf(queryClient)).toBe(0);
    const [channel] =
      queryClient.getQueryData<(typeof CHANNEL)[]>([
        "staff-chat",
        "channels",
        "all",
      ]) ?? [];
    expect(channel.unread).toBe(0);
    expect(channel.lastMessage.text).toBe("Mijoz uyda");
  });

  it("`staff_badge` (system) — umumiy raqamga tegmaydi", () => {
    const queryClient = setup();
    applyStaffBadge(queryClient, {
      type: "staff_badge",
      channel_id: 313,
      order_id: ORDER_ID,
      kind: "system",
      preview: "Status",
    });
    expect(
      queryClient.getQueryData<UnreadByOrder>(queryKeys.staffUnreadByOrder)
        ?.orders[0]?.systemUnread,
    ).toBe(1);
    expect(totalOf(queryClient)).toBe(0);
  });

  it("odam xabari — odatdagidek sanaladi", () => {
    const queryClient = setup();
    applyStaffMessage(queryClient, {
      type: "staff_message",
      order_id: ORDER_ID,
      message: {
        id: 9002,
        channel_id: 312,
        kind: "text",
        text: "Salom",
        sender: { id: 5, full_name: "Vali" },
      },
    });
    expect(totalOf(queryClient)).toBe(1);
  });
});
