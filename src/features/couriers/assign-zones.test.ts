import { describe, expect, it } from "vitest";

import { EMPTY_ZONING } from "@/features/orders/zoning";
import type { OrderZoning } from "@/features/orders/zoning";

import {
  ZONE_NONE,
  courierInZone,
  courierMismatchesSelection,
  groupUnassignedByReason,
  needsOffShiftConfirm,
  nothingToApplyText,
  orderCouriersForZone,
  shiftCounts,
  sortCouriersForAssign,
  visibleCouriers,
  zoneKeyOf,
} from "./assign-zones";
import type { AutoAssignUnassigned } from "./auto-assign";

function order(zoneId: number | null, zoneName: string | null = null) {
  const zoning: OrderZoning = { ...EMPTY_ZONING, zoneId, zoneName };
  return { zoning };
}

function courier(
  zoneIds: number[],
  onShift = true,
  load: number | null = null,
  assigned = 0,
  isActive = true,
) {
  return {
    zoneIds,
    zones: zoneIds.map((id) => ({ id, name: `Z${id}` })),
    live: { onShift },
    load,
    today: { assigned },
    isActive,
  };
}

describe("zona kaliti", () => {
  it("buyurtma zonasi yoki `none` savatiga tushadi", () => {
    expect(zoneKeyOf(order(7))).toBe("7");
    expect(zoneKeyOf(order(null))).toBe(ZONE_NONE);
  });
});

describe("kuryer va zona", () => {
  it("zone_ids yoki zones[] bo'yicha", () => {
    expect(courierInZone(courier([7]), "7")).toBe(true);
    expect(courierInZone({ zoneIds: [], zones: [{ id: 7, name: "Shimol" }] }, "7")).toBe(true);
    expect(courierInZone(courier([8]), "7")).toBe(false);
    expect(courierInZone(courier([7]), ZONE_NONE)).toBe(false);
  });

  it("tanlangan buyurtmalar zonasidan bo'lmasa — ogohlantirish", () => {
    expect(courierMismatchesSelection(courier([7]), [order(8)])).toBe(true);
    expect(courierMismatchesSelection(courier([7, 8]), [order(8)])).toBe(false);
    // Zonasiz buyurtma hisobga olinmaydi.
    expect(courierMismatchesSelection(courier([7]), [order(null)])).toBe(false);
    expect(courierMismatchesSelection(courier([7]), [])).toBe(false);
  });

  it("smenadagilar tepada, ichida kam bandi birinchi", () => {
    const sorted = sortCouriersForAssign([
      { ...courier([7], false, 0), id: "off" },
      { ...courier([7], true, 5), id: "busy" },
      { ...courier([7], true, null, 1), id: "light" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["light", "busy", "off"]);
  });

  it("kuryer tanlovi: zona kuryerlari oldin, keyin qolganlar; zonasiz — bitta guruh", () => {
    const list = [
      { ...courier([8], true, 1), id: "other" },
      { ...courier([7], false, 0), id: "zone-off" },
      { ...courier([7], true, 3), id: "zone-on" },
    ];
    const grouped = orderCouriersForZone(list, 7);
    expect(grouped.zone.map((item) => item.id)).toEqual(["zone-on", "zone-off"]);
    expect(grouped.others.map((item) => item.id)).toEqual(["other"]);
    const flat = orderCouriersForZone(list, null);
    expect(flat.zone).toEqual([]);
    expect(flat.others).toHaveLength(3);
  });
});

describe("smena: ko'rinish va tasdiq", () => {
  const list = [
    { ...courier([7], true), id: "on" },
    { ...courier([7], false), id: "off" },
    { ...courier([7], true, null, 0, false), id: "inactive" },
  ];

  it("`on_shift` — faqat smenadagilar; `all` — nofaoldan tashqari hammasi", () => {
    expect(visibleCouriers(list, "on_shift").map((item) => item.id)).toEqual(["on"]);
    expect(visibleCouriers(list, "all").map((item) => item.id)).toEqual(["on", "off"]);
  });

  it("sonlar tugma yorlig'i uchun", () => {
    expect(shiftCounts(list)).toEqual({ onShift: 1, all: 2 });
  });

  it("smenadan tashqaridagi kuryerga biriktirishdan oldin tasdiq", () => {
    expect(needsOffShiftConfirm({ live: { onShift: false } })).toBe(true);
    expect(needsOffShiftConfirm({ live: { onShift: true } })).toBe(false);
  });
});

describe("avto-taqsimlash: biriktirilmaydiganlar", () => {
  const row = (orderId: string, orderNumber: string, reason: string): AutoAssignUnassigned => ({
    orderId,
    orderNumber,
    reason,
    clientName: null,
    zoneId: null,
    region: null,
    district: null,
    districtDisplay: null,
  });
  const rows = [
    row("a", "1", "no_courier_on_shift"),
    row("b", "2", "no_zone"),
    row("c", "3", "weird"),
    row("d", "4", "no_zone"),
  ];

  it("sabab bo'yicha guruhlaydi: no_zone → no_courier_on_shift → noma'lum", () => {
    const groups = groupUnassignedByReason(rows);
    expect(groups.map((group) => group.reason)).toEqual([
      "no_zone",
      "no_courier_on_shift",
      "weird",
    ]);
    expect(groups[0]?.items.map((item) => item.orderId)).toEqual(["b", "d"]);
    expect(groups[0]?.title).toBe("Tuman belgilanmagan");
    expect(groups[2]?.title).toBe("Biriktirib bo'lmadi");
  });

  it("hech narsa biriktirilmasa — bitta keyingi qadam", () => {
    const groups = groupUnassignedByReason(rows);
    expect(nothingToApplyText(0, groups)).toBe(
      "2 ta buyurtmada tuman yo'q — avval tumanlarni belgilang",
    );
    expect(nothingToApplyText(3, groups)).toBeNull();
    expect(nothingToApplyText(0, [])).toBeNull();
    expect(
      nothingToApplyText(0, groupUnassignedByReason([rows[0]!])),
    ).toContain("smenadagi kuryer yo'q");
    expect(nothingToApplyText(0, groupUnassignedByReason([rows[2]!]))).toContain("qo'lda");
  });
});
