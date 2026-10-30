import { describe, expect, it } from "vitest";

import {
  ORDERING_FIELDS,
  compareByOrdering,
  insertByOrdering,
  isOrderSort,
  isValidOrdering,
  serverOrdering,
} from "./order-sort";
import { mapLogistOrder } from "./types";

/** 2026-10-01 C §8 — `?ordering=` oq ro'yxati va doska qatlamlari. */
function card(id: string, extra: Record<string, unknown> = {}) {
  return mapLogistOrder({ id, status: "shipping", total_amount: 100, ...extra });
}

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("serverOrdering / oq ro'yxat (§8.1)", () => {
  it("tartib pillari — server kalitlari", () => {
    expect(serverOrdering("status")).toBe("-status_changed_at");
    expect(serverOrdering("created")).toBe("-created_at");
    expect(serverOrdering("delivery")).toBe("delivery_date");
    expect(serverOrdering("amount")).toBe("-total_amount");
  });

  it("faqat oq ro'yxat: noma'lum qiymat (server jimgina sukutga tushirardi) rad etiladi", () => {
    expect(ORDERING_FIELDS).toEqual([
      "created_at",
      "total_amount",
      "id",
      "status_changed_at",
      "delivery_date",
    ]);
    for (const value of ["-status_changed_at", "delivery_date", "-total_amount", "-id"]) {
      expect(isValidOrdering(value)).toBe(true);
    }
    for (const value of ["user__password", "salom", "-payable_amount", "", null]) {
      expect(isValidOrdering(value)).toBe(false);
    }
  });

  it("isOrderSort", () => {
    expect(isOrderSort("delivery")).toBe(true);
    expect(isOrderSort("bogus")).toBe(false);
  });
});

describe("compareByOrdering — kartani joylash (§8.5)", () => {
  it("qadalgan har qanday tartibda tepada (`?ordering=total_amount` da ham)", () => {
    const pinned = card("p", { total_amount: 1, pinned_at: "2026-10-01T08:00:00+05:00" });
    const rich = card("r", { total_amount: 999999 });
    expect(compareByOrdering(pinned, rich, "-total_amount")).toBeLessThan(0);
  });

  it("`board_position` — tanlangan kalitdan oldin", () => {
    const first = card("a", { board_position: 0, created_at: "2026-09-01T00:00:00+05:00" });
    const second = card("b", { board_position: 1, created_at: "2026-10-01T00:00:00+05:00" });
    expect(compareByOrdering(first, second, "-created_at")).toBeLessThan(0);
  });

  it("`delivery_date` — NULLS LAST ikkala yo'nalishda (§8.3)", () => {
    const list = [
      card("none"),
      card("d3", { delivery_date: "2026-10-03" }),
      card("d1", { delivery_date: "2026-10-01" }),
    ];
    const asc = [...list].sort((a, b) => compareByOrdering(a, b, "delivery_date"));
    const desc = [...list].sort((a, b) => compareByOrdering(a, b, "-delivery_date"));
    expect(ids(asc)).toEqual(["d1", "d3", "none"]);
    expect(ids(desc)).toEqual(["d3", "d1", "none"]);
  });

  it("`-status_changed_at` — hozirgina o'tgan tepada, `null` oxirida", () => {
    const list = [
      card("old", { status_changed_at: "2026-10-01T08:00:00+05:00" }),
      card("nul", { created_at: "2026-10-01T12:00:00+05:00" }),
      card("new", { status_changed_at: "2026-10-01T09:22:48.100213+05:00" }),
    ];
    expect(ids([...list].sort((a, b) => compareByOrdering(a, b, "-status_changed_at")))).toEqual([
      "new",
      "old",
      "nul",
    ]);
  });

  it("teng qiymatda — `-id` (barqaror uzluvchi, §8.2)", () => {
    const at = { created_at: "2026-10-01T08:00:00+05:00" };
    expect(compareByOrdering(card("a", at), card("b", at), "-created_at")).toBeGreaterThan(0);
  });

  it("insertByOrdering — qolgan qatorlar joyida (qayta saralanmaydi)", () => {
    const column = [card("x", { total_amount: 50 }), card("y", { total_amount: 500 })];
    const next = insertByOrdering(column, card("z", { total_amount: 100 }), "-total_amount");
    expect(ids(next)).toEqual(["z", "x", "y"]);
  });
});
