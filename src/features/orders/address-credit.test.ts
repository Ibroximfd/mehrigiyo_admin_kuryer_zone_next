import { describe, expect, it } from "vitest";

import {
  ADDRESS_CREDIT_MAX,
  canCreditAddresses,
  clampAddressCredit,
  defaultAddressCredit,
} from "./address-credit";

describe("kuryerga manzil soni", () => {
  it("sukut: yetkazildi +1, atkaz 0", () => {
    expect(defaultAddressCredit("delivered", { stopId: null })).toBe(1);
    expect(defaultAddressCredit("cancelled", { stopId: null })).toBe(0);
  });

  it("birlashtirilgan manzildagi zakaz — 0 (manzil o'zi +1 beradi)", () => {
    expect(defaultAddressCredit("delivered", { stopId: 7 })).toBe(0);
    expect(defaultAddressCredit("cancelled", { stopId: 7 })).toBe(0);
  });

  it("chegaralar: 0…MAX, butun son", () => {
    expect(clampAddressCredit(-2)).toBe(0);
    expect(clampAddressCredit(2.6)).toBe(3);
    expect(clampAddressCredit(99)).toBe(ADDRESS_CREDIT_MAX);
    expect(clampAddressCredit(Number.NaN)).toBe(0);
  });

  it("kuryersiz buyurtmada maydon yo'q", () => {
    expect(canCreditAddresses({ courier: null })).toBe(false);
    expect(canCreditAddresses({ courier: { id: 1 } })).toBe(true);
  });
});
