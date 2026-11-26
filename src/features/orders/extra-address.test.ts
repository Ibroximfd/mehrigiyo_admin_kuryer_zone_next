import { describe, expect, it } from "vitest";

import { extraAddressDay, mapExtraAddresses } from "./extra-address";
import { mapLogistOrder } from "./types";

describe("qo'shimcha manzil — zakazda (2026-11-26)", () => {
  it("server bergan ro'yxat: kun bo'yicha, kuryer, izoh, kim qo'shgan", () => {
    const items = mapExtraAddresses([
      {
        id: 2,
        date: "2026-11-26",
        courier: { id: 31, full_name: "Bahtiyor aka" },
        note: " Mijoz chiqmadi ",
        created_by: { id: 5, full_name: "Sohibnazar" },
        created_at: "2026-11-26T15:10:00+05:00",
      },
      { id: 1, date: "2026-11-25", courier: null, note: "Telefonni olmadi" },
      // Yaroqsiz qator (id yoki kunsiz) — tashlanadi.
      { date: "2026-11-24" },
      { id: 9 },
    ]);
    expect(items.map((item) => item.id)).toEqual([1, 2]);
    expect(items[1]).toMatchObject({ courier: { id: 31, fullName: "Bahtiyor aka" }, note: "Mijoz chiqmadi", byName: "Sohibnazar" });
    expect(items[1]!.createdAt).toBeInstanceOf(Date);
    expect(items[0]!.courier).toBeNull();
  });

  it("kalit yo'q (eski server) yoki bo'sh — bo'sh ro'yxat, blok chizilmaydi", () => {
    expect(mapLogistOrder({ id: "a", status: "shipping" }).extraAddresses).toEqual([]);
    expect(mapLogistOrder({ id: "a", status: "shipping", extra_addresses: [] }).extraAddresses).toEqual([]);
    expect(mapLogistOrder({ id: "a", status: "shipping", extra_addresses: [{ id: 3, date: "2026-11-26" }] }).extraAddresses).toHaveLength(1);
  });

  it("kun yozuvi — dd.mm.yyyy", () => {
    expect(extraAddressDay("2026-11-25")).toBe("25.11.2026");
    expect(extraAddressDay("xato")).toBe("xato");
  });
});
