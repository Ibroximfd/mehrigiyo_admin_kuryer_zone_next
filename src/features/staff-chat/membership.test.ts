import { describe, expect, it } from "vitest";

import { mapChatMembers, mapOrderChatHits, memberRoleLabel, sortMembers } from "./membership";

describe("zakaz chati a'zoligi (backend C1 §D)", () => {
  it("ishtirokchilar: admin birinchi, yorliqlar, buzuq qator tashlanadi", () => {
    const members = sortMembers(
      mapChatMembers({
        success: true,
        members: [
          { seat_id: 9, full_name: "Logist Aziz", role_in_chat: "member", is_logist: true, joined_at: "2026-10-30T10:00:00Z" },
          { seat_id: 5, full_name: "Operator Vali", role_in_chat: "admin", joined_at: "2026-10-30T11:00:00Z" },
          { seat_id: 12, full_name: "Bosh admin", role_in_chat: "member", is_admin: true, added_by: { full_name: "Vali" } },
          { full_name: "id yo'q" },
        ],
      }),
    );
    expect(members.map((member) => member.seatId)).toEqual([5, 12, 9]);
    expect(members.map(memberRoleLabel)).toEqual(["chat admini", "admin", "logist"]);
    expect(members[1]!.addedBy).toBe("Vali");
  });

  it("zakaz bo'yicha qidiruv natijasi", () => {
    const hits = mapOrderChatHits({
      results: [
        { order_id: "u1", order_number: "DA-1", status: "shipping", client_name: "Dilnoza", channel_id: 7, joined: false, can_join: true },
        { order_id: "u2", order_number: "DA-2", channel_id: null, joined: false, can_join: false },
        { order_number: "id yo'q" },
      ],
    });
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ orderId: "u1", channelId: 7, joined: false, canJoin: true });
    expect(hits[1]!.channelId).toBeNull();
  });
});

describe("chatga qo'shiladigan xodimlar (`candidates/`)", () => {
  it("seat_id siz qator tashlanadi, ism bo'lmasa username", async () => {
    const { mapCandidates } = await import("./membership");
    expect(
      mapCandidates({
        results: [
          { seat_id: 9, full_name: "Logist Aziz", username: "aziz", role_label: "Logist" },
          { seat_id: 12, full_name: "", username: "vali", role_label: "Admin" },
          { full_name: "Yo'q" },
        ],
      }),
    ).toEqual([
      { seatId: 9, fullName: "Logist Aziz", roleLabel: "Logist" },
      { seatId: 12, fullName: "vali", roleLabel: "Admin" },
    ]);
  });
});
