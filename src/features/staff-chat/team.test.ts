import { describe, expect, it } from "vitest";

import {
  directTitle,
  filterDirectChannels,
  findDirectChannel,
  mapTeamMembers,
  orderChannelsOnly,
  planDirectOpen,
  searchTeamMembers,
  sortDirectChannels,
  staffChannelSection,
  upsertDirectChannel,
} from "./team";
import { mapStaffChannel } from "./types";

const direct = (id: number, peer: Record<string, unknown> | null, at: string | null = null) =>
  mapStaffChannel({
    id,
    kind: "direct",
    title: "",
    peer,
    unread: 0,
    last_message: at ? { text: "salom", by: null, at } : null,
  });

describe("kanal turlari", () => {
  it("team va group — Jamoa; direct — Shaxsiy; qolgani — Buyurtmalar", () => {
    const kinds = ["team", "group", "direct", "order", "nimadir"].map((kind) =>
      staffChannelSection(mapStaffChannel({ id: 1, kind })),
    );
    expect(kinds).toEqual(["team", "team", "direct", "order", "order"]);
  });

  it("direct peer o'qiladi; noma'lum tur `staff`; xavfli rasm manzili tashlanadi", () => {
    const channel = direct(5, {
      id: 42,
      kind: "courier",
      full_name: "Ibroxim Toshev",
      avatar: { thumb_url: "javascript:alert(1)" },
      online: true,
      last_seen_at: "2026-10-17T09:00:00Z",
    });
    expect(channel.peer).toEqual({
      id: 42,
      kind: "courier",
      fullName: "Ibroxim Toshev",
      avatarUrl: null,
      online: true,
      lastSeenAt: "2026-10-17T09:00:00Z",
    });
    expect(directTitle(channel)).toBe("Ibroxim Toshev");
    expect(direct(6, { id: 1, kind: "admin" }).peer?.kind).toBe("staff");
    expect(mapStaffChannel({ id: 7, kind: "order" }).peer).toBeNull();
  });

  it("buyurtmalar ro'yxatidan jamoa va shaxsiylar chiqariladi", () => {
    const list = [
      mapStaffChannel({ id: 1, kind: "order" }),
      mapStaffChannel({ id: 2, kind: "team" }),
      direct(3, { id: 9 }),
      mapStaffChannel({ id: 4, kind: "group" }),
    ];
    expect(orderChannelsOnly(list).map((c) => c.id)).toEqual([1]);
  });

  it("shaxsiylar: oxirgi xabar tepada, xabarsizlar oxirida ism bo'yicha, takror yo'q", () => {
    const old = direct(1, { id: 1, full_name: "Aziz" }, "2026-10-17T08:00:00Z");
    const fresh = direct(2, { id: 2, full_name: "Bobur" }, "2026-10-17T10:00:00Z");
    const emptyB = direct(3, { id: 3, full_name: "Zafar" });
    const emptyA = direct(4, { id: 4, full_name: "Davron" });
    const order = mapStaffChannel({ id: 9, kind: "order" });
    expect(sortDirectChannels([emptyB, old, order, fresh, emptyA, old]).map((c) => c.id)).toEqual([
      2, 1, 4, 3,
    ]);
  });

  it("shaxsiylar ism bo'yicha suziladi (kirill/lotin farqsiz)", () => {
    const list = [direct(1, { id: 1, full_name: "Ibroxim Toshev" }), direct(2, { id: 2, full_name: "Aziz" })];
    expect(filterDirectChannels(list, "ибро").map((c) => c.id)).toEqual([1]);
    expect(filterDirectChannels(list, "")).toHaveLength(2);
  });
});

describe("a'zolar", () => {
  const members = mapTeamMembers({
    members: [
      { id: 1, kind: "courier", full_name: "Ibroxim Toshev", phone: "+998901112233", on_shift: true },
      { id: 2, kind: "staff", full_name: "Aziza Logist", phone: "+998935556677", role_label: "Bosh logist", online: true },
      { id: 3, kind: "courier", full_name: "Bobur Aliyev", phone: "+998909998877" },
      { id: 1, kind: "courier", full_name: "Takror" },
      { kind: "staff", full_name: "id yo'q" },
    ],
  });

  it("parse: takror va id'siz tashlanadi; rol yorlig'i turidan to'ldiriladi", () => {
    expect(members.map((m) => `${m.kind}:${m.id}`)).toEqual(["courier:1", "staff:2", "courier:3"]);
    expect(members[0]?.roleLabel).toBe("Kuryer");
    expect(members[0]?.onShift).toBe(true);
    expect(members[1]?.roleLabel).toBe("Bosh logist");
    expect(members[1]?.onShift).toBeNull();
  });

  it("bo'sh so'rov — onlayn, logist, keyin kuryerlar ism bo'yicha", () => {
    expect(searchTeamMembers(members, "  ").map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it("ism (kirill ham) va telefon bo'yicha qidiradi", () => {
    expect(searchTeamMembers(members, "ibro").map((m) => m.id)).toEqual([1]);
    expect(searchTeamMembers(members, "Иброхим").map((m) => m.id)).toEqual([1]);
    expect(searchTeamMembers(members, "5556677").map((m) => m.id)).toEqual([2]);
    expect(searchTeamMembers(members, "zzz")).toEqual([]);
  });

  it("massiv javob ham o'qiladi", () => {
    expect(mapTeamMembers([{ id: 5, kind: "staff", full_name: "X" }])).toHaveLength(1);
    expect(mapTeamMembers(null)).toEqual([]);
  });
});

describe("shaxsiy chatni ochish — idempotent", () => {
  const existing = direct(10, { id: 1, kind: "courier", full_name: "Ibroxim" });
  const sameIdStaff = direct(11, { id: 1, kind: "staff", full_name: "Logist" });

  it("mavjud bo'lsa — o'sha ochiladi, so'rov yo'q", () => {
    const plan = planDirectOpen([sameIdStaff, existing], { kind: "courier", id: 1 });
    expect(plan).toEqual({ kind: "existing", channel: existing });
  });

  it("id bir xil, turi boshqa — boshqa odam", () => {
    expect(findDirectChannel([existing], { kind: "staff", id: 1 })).toBeNull();
    expect(planDirectOpen([existing], { kind: "staff", id: 1 })).toEqual({
      kind: "create",
      peer: { kind: "staff", id: 1 },
    });
  });

  it("server javobi keshga bir marta tushadi; peer bo'lmasa a'zodan to'ldiriladi", () => {
    const created = mapStaffChannel({ id: 12, kind: "direct", title: "" });
    const peer = { id: 7, kind: "courier" as const, fullName: "Bobur", avatarUrl: null, online: false, lastSeenAt: null };
    const once = upsertDirectChannel([existing], created, peer);
    const twice = upsertDirectChannel(once, created, peer);
    expect(twice.map((c) => c.id)).toEqual([12, 10]);
    expect(twice[0]?.peer?.fullName).toBe("Bobur");
    expect(planDirectOpen(twice, { kind: "courier", id: 7 }).kind).toBe("existing");
  });
});
