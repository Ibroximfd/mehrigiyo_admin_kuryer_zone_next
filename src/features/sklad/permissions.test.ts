import { describe, expect, it } from "vitest";

import {
  canManageItems,
  canWriteAny,
  canWriteItem,
  firstUngrantedItem,
} from "./permissions";
import type { SkladMe } from "./types";

const main: SkladMe = {
  role: "logist.main",
  filialId: 1,
  region: "fargona",
  canWrite: true,
  grantedItemIds: [],
};
const branch: SkladMe = { ...main, role: "logist.branch", filialId: 3, grantedItemIds: [120, 124] };
const crm: SkladMe = { ...main, role: "crm", canWrite: false };

describe("sklad ruxsatlari", () => {
  it("asosiy logist hammasini yozadi", () => {
    expect(canWriteItem(main, 999)).toBe(true);
    expect(canWriteAny(main)).toBe(true);
    expect(canManageItems(main)).toBe(true);
  });

  it("filial logisti faqat dopusk berilgan mahsulotni yozadi", () => {
    expect(canWriteItem(branch, 120)).toBe(true);
    expect(canWriteItem(branch, 121)).toBe(false);
    expect(canWriteAny(branch)).toBe(true);
    expect(canWriteAny({ ...branch, grantedItemIds: [] })).toBe(false);
    expect(canManageItems(branch)).toBe(false);
  });

  it("CRM va sessiyasiz — faqat ko'rish", () => {
    expect(canWriteItem(crm, 120)).toBe(false);
    expect(canWriteAny(null)).toBe(false);
  });

  it("hujjatdagi birinchi dopusksiz qatorni topadi", () => {
    expect(firstUngrantedItem(branch, [120, 124])).toBeNull();
    expect(firstUngrantedItem(branch, [120, 125, 126])).toBe(125);
    expect(firstUngrantedItem(main, [1, 2])).toBeNull();
  });
});
