import { describe, expect, it } from "vitest";

import {
  AVATAR_HUE_COUNT,
  avatarHue,
  avatarInitials,
  mapCourierAvatar,
  mapCourierUpdatedEvent,
  shortName,
} from "./avatar";
import { mapLiveCourier } from "./live-tracking";
import { mapCourier } from "./types";

describe("mapCourierAvatar (§8)", () => {
  it("obyekt: url, thumb_url, updated_at", () => {
    const avatar = mapCourierAvatar({
      url: "https://media.example.uz/a/512.jpg?v=1",
      thumb_url: "https://media.example.uz/a/96.jpg?v=1",
      updated_at: "2026-10-17T09:00:00Z",
    });
    expect(avatar).toEqual({
      url: "https://media.example.uz/a/512.jpg?v=1",
      thumbUrl: "https://media.example.uz/a/96.jpg?v=1",
      updatedAt: new Date("2026-10-17T09:00:00Z"),
    });
  });

  it("thumb_url yo'q — asl rasm ishlatiladi; url yo'q — thumb", () => {
    expect(mapCourierAvatar({ url: "https://m.uz/a.jpg" })?.thumbUrl).toBe("https://m.uz/a.jpg");
    expect(mapCourierAvatar({ thumb_url: "https://m.uz/t.jpg" })?.url).toBe("https://m.uz/t.jpg");
  });

  it("eski satr shakli ham o'qiladi", () => {
    expect(mapCourierAvatar("https://m.uz/a.jpg")).toEqual({
      url: "https://m.uz/a.jpg",
      thumbUrl: "https://m.uz/a.jpg",
      updatedAt: null,
    });
  });

  it("nisbiy yo'l backend hostiga bog'lanadi, http → https", () => {
    expect(mapCourierAvatar("/media/a.jpg")?.url).toMatch(/^https:\/\/[^/]+\/media\/a\.jpg$/);
    expect(mapCourierAvatar("http://m.uz/a.jpg")?.url).toBe("https://m.uz/a.jpg");
  });

  it("null, bo'sh, noto'g'ri sxema — null", () => {
    expect(mapCourierAvatar(null)).toBeNull();
    expect(mapCourierAvatar(undefined)).toBeNull();
    expect(mapCourierAvatar("")).toBeNull();
    expect(mapCourierAvatar({ url: "", thumb_url: null })).toBeNull();
    expect(mapCourierAvatar("javascript:alert(1)")).toBeNull();
    expect(mapCourierAvatar(42)).toBeNull();
  });

  it("kuryer va jonli kuryer mapperlari avatarni o'qiydi", () => {
    expect(mapCourier({ id: 1, avatar: "https://m.uz/a.jpg" }).avatar?.url).toBe("https://m.uz/a.jpg");
    expect(mapCourier({ id: 1 }).avatar).toBeNull();
    expect(mapLiveCourier({ id: 1, avatar: { url: "https://m.uz/a.jpg", thumb_url: "https://m.uz/t.jpg" } }).avatar?.thumbUrl).toBe(
      "https://m.uz/t.jpg",
    );
  });
});

describe("bosh harflar va rang", () => {
  it("ikki so'zdan bosh harflar, bo'sh ism — K", () => {
    expect(avatarInitials("Aziz Karimov")).toBe("AK");
    expect(avatarInitials("  aziz   karimov  olimovich ")).toBe("AK");
    expect(avatarInitials("Aziz")).toBe("A");
    expect(avatarInitials("")).toBe("K");
  });

  it("rang id dan barqaror va palitra ichida", () => {
    for (const id of [0, 1, 2, 7, 42, 1000, 99_999]) {
      const hue = avatarHue(id);
      expect(hue).toBe(avatarHue(id));
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(AVATAR_HUE_COUNT);
    }
  });

  it("ketma-ket id lar turli ranglarga tarqaladi", () => {
    const hues = new Set(Array.from({ length: 16 }, (_, i) => avatarHue(i + 1)));
    expect(hues.size).toBeGreaterThanOrEqual(6);
  });
});

describe("shortName — xarita yorlig'i", () => {
  it("ism + familiya bosh harfi", () => {
    expect(shortName("Ali Karimov")).toBe("Ali K.");
    expect(shortName("aziz karimov")).toBe("aziz K.");
    expect(shortName("  Ali   Karimov  Olimovich ")).toBe("Ali K.");
  });

  it("bitta so'z — o'zi, bo'sh — bo'sh", () => {
    expect(shortName("Ali")).toBe("Ali");
    expect(shortName("")).toBe("");
  });
});

describe("mapCourierUpdatedEvent", () => {
  it("avatar bilan va avatar null", () => {
    expect(mapCourierUpdatedEvent({ courier_id: 7, avatar: { url: "https://m.uz/a.jpg" } })).toMatchObject({
      courierId: 7,
      hasAvatar: true,
      avatar: { url: "https://m.uz/a.jpg" },
    });
    expect(mapCourierUpdatedEvent({ courier_id: 7, avatar: null })).toEqual({
      courierId: 7,
      hasAvatar: true,
      avatar: null,
    });
  });

  it("avatar kaliti yo'q — hasAvatar false; id yo'q — null", () => {
    expect(mapCourierUpdatedEvent({ courier_id: 7 })?.hasAvatar).toBe(false);
    expect(mapCourierUpdatedEvent({ avatar: null })).toBeNull();
  });
});
