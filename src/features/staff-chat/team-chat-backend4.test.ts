import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CurrentUser } from "@/features/auth/types";
import { useAuthStore } from "@/stores/auth-store";

import { isPeerInactiveError, staffChatErrorMessage } from "./error-hints";
import { applyStaffChannelRead } from "./realtime";
import { useStaffLiveStore } from "./store";
import { mapTeamMember, memberStatusText } from "./team";
import { mapStaffMessage, mapStaffPeer, senderAvatarId } from "./types";

/** `HUDUD_BACKEND_JAVOBLAR_4.md` §1 — jamoa chati faktlari. */

const CHANNEL = { id: 77, kind: "direct", title: "", unread: 3, lastMessage: null, peer: null, order: null };

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.staffUnread, { unread: 5, channels: 2, orderChannels: null });
  queryClient.setQueryData(["staff-chat", "channels", "team,direct"], [CHANNEL]);
  return queryClient;
}

afterEach(() => {
  useAuthStore.setState({ user: null });
  useStaffLiveStore.setState({ reads: {} });
});

describe("staff_channel_read", () => {
  it("kuryer o'qidi — kursor (ism kaliti), hisob o'zgarmaydi", () => {
    const queryClient = setup();
    const ok = applyStaffChannelRead(queryClient, {
      type: "staff_channel_read",
      channel_id: 77,
      by: { id: 12, kind: "courier", full_name: "Aziz Kuryer" },
      last_message_id: 501,
    });
    expect(ok).toBe(true);
    const cursors = Object.values(useStaffLiveStore.getState().reads[77] ?? {});
    expect(cursors).toEqual([{ userId: null, fullName: "Aziz Kuryer", lastReadMessageId: 501 }]);
    expect(queryClient.getQueryData<{ unread: number }>(queryKeys.staffUnread)?.unread).toBe(5);
  });

  it("o'zimiz (boshqa tab) o'qidik — kanal va umumiy hisob kamayadi", () => {
    useAuthStore.setState({ user: { id: "9", name: "Logist" } as CurrentUser });
    const queryClient = setup();
    applyStaffChannelRead(queryClient, {
      type: "staff_channel_read",
      channel_id: 77,
      by: { id: 9, kind: "staff", full_name: "Logist" },
      last_message_id: 501,
    });
    const [channel] = queryClient.getQueryData<(typeof CHANNEL)[]>(["staff-chat", "channels", "team,direct"]) ?? [];
    expect(channel?.unread).toBe(0);
    expect(queryClient.getQueryData<{ unread: number }>(queryKeys.staffUnread)?.unread).toBe(2);
    expect(useStaffLiveStore.getState().reads[77]).toBeUndefined();
  });

  it("kanal yoki kursor yo'q — e'tiborsiz", () => {
    expect(applyStaffChannelRead(setup(), { type: "staff_channel_read", channel_id: 77 })).toBe(false);
  });
});

describe("xato kodlari", () => {
  it("403 peer_inactive — tanib olinadi va o'qiladigan matn", () => {
    const error = new ApiError("x", 403, { code: "peer_inactive" }, "peer_inactive");
    expect(isPeerInactiveError(error)).toBe(true);
    expect(staffChatErrorMessage(error, "Xatolik")).toBe("Bu foydalanuvchi faol emas");
    expect(isPeerInactiveError(new ApiError("x", 403, {}, "forbidden"))).toBe(false);
  });

  it("409 delete_window_closed — toast matni", () => {
    const error = new ApiError("x", 409, { code: "delete_window_closed" }, "delete_window_closed");
    expect(staffChatErrorMessage(error, "O'chirishda xatolik")).toBe(
      "O'chirish muddati tugagan — o'z xabarini 24 soat ichida o'chirish mumkin",
    );
  });
});

describe("xodim holati null — \"oflayn\" yozilmaydi", () => {
  it("online/last_seen_at null — matn yo'q", () => {
    const member = mapTeamMember({ id: 3, kind: "staff", full_name: "Vali", online: null, last_seen_at: null });
    expect(member?.online).toBe(false);
    expect(memberStatusText(member!)).toBeNull();
    expect(mapStaffPeer({ id: 3, kind: "staff", online: null })?.online).toBe(false);
  });

  it("onlayn / smenada", () => {
    expect(memberStatusText({ online: true, onShift: null, lastSeenAt: null })).toBe("onlayn");
    expect(memberStatusText({ online: false, onShift: true, lastSeenAt: null })).toBe("smenada");
  });
});

describe("xabar yuboruvchisi rasmi", () => {
  it("`sender.avatar` (thumb) va turi o'qiladi", () => {
    const message = mapStaffMessage({
      id: 1,
      channel_id: 77,
      text: "salom",
      sender: { id: 12, kind: "courier", full_name: "Aziz", avatar: { url: "https://x/a.webp", thumb_url: "https://x/t.webp" } },
    });
    expect(message.sender?.avatarUrl).toBe("https://x/t.webp");
    expect(message.sender?.kind).toBe("courier");
    expect(senderAvatarId(message.sender)).toBe(12);
    expect(mapStaffMessage({ id: 2, sender: { id: 1, avatar: null } }).sender?.avatarUrl).toBeNull();
  });
});
