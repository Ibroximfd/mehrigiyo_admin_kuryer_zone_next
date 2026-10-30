import { describe, expect, it } from "vitest";

import {
  allowedStatusChanges,
  canChangeStatus,
  canDragOrder,
  canTransferOrder,
  needsShipAfterConfirm,
  nextFlowStatus,
  previousFlowStatus,
  statusBlockedReason,
  statusTransition,
  transitionNeedsReason,
  undoPatch,
} from "./permissions";
import { ORDER_STATUSES } from "./types";

const ALL = ORDER_STATUSES.map((status) => status.value);

/**
 * Logist ustuni (2026-10-29): `pending` logistga yopiq; yetkazildi va atkaz
 * faqat jarayondan (`shipping`), logistning tasdig'i bilan.
 */
const MATRIX: Array<[from: string, to: string, kind: string | null]> = [
  ["pending", "confirmed", null],
  ["pending", "shipping", null],
  ["pending", "cancelled", null],
  ["confirmed", "shipping", "ship"],
  ["confirmed", "cancelled", null],
  ["confirmed", "delivered", null],
  ["confirmed", "pending", null],
  ["shipping", "delivered", "deliver"],
  ["shipping", "cancelled", "cancel"],
  ["shipping", "confirmed", "revert"],
  ["shipping", "pending", null],
  ["delivered", "shipping", "revert"],
  ["delivered", "confirmed", null],
  ["delivered", "cancelled", null],
  ["cancelled", "shipping", "restore"],
  ["cancelled", "confirmed", "restore"],
  ["cancelled", "pending", null],
  ["cancelled", "delivered", null],
];

describe("statusTransition — 02 §2.3 logist ustuni", () => {
  it.each(MATRIX)("%s → %s = %s", (from, to, kind) => {
    expect(statusTransition(from, to)).toBe(kind);
    expect(canChangeStatus(from, to)).toBe(kind !== null);
  });

  it("o'z-o'ziga va noma'lum statusga o'tish yo'q", () => {
    for (const status of ALL) {
      expect(statusTransition(status, status)).toBeNull();
      expect(statusTransition(status, "unknown")).toBeNull();
      expect(statusTransition("unknown", status)).toBeNull();
    }
  });

  it("allowedStatusChanges matritsadagi ruxsatlarni beradi", () => {
    expect(allowedStatusChanges("pending")).toEqual([]);
    expect(allowedStatusChanges("confirmed")).toEqual(["shipping"]);
    expect(allowedStatusChanges("shipping")).toEqual(["confirmed", "delivered", "cancelled"]);
    expect(allowedStatusChanges("delivered")).toEqual(["shipping"]);
    expect(allowedStatusChanges("unknown")).toEqual([]);
  });
});

describe("oqim tugmalari", () => {
  it("FLOW = confirmed → shipping → delivered", () => {
    expect(nextFlowStatus("confirmed")).toBe("shipping");
    expect(nextFlowStatus("shipping")).toBe("delivered");
    expect(nextFlowStatus("delivered")).toBeNull();
    expect(nextFlowStatus("pending")).toBeNull();
    expect(previousFlowStatus("shipping")).toBe("confirmed");
    expect(previousFlowStatus("confirmed")).toBeNull();
  });
});

describe("sudrash va qulflar", () => {
  it("`pending` dan hech qayerga o'tish yo'q — logist uni ko'rmaydi", () => {
    expect(needsShipAfterConfirm("pending", "shipping")).toBe(false);
    expect(needsShipAfterConfirm("confirmed", "shipping")).toBe(false);
    expect(transitionNeedsReason(statusTransition("shipping", "cancelled"))).toBe(true);
  });

  it("qolgan 4 status sudraladi", () => {
    for (const status of ["confirmed", "shipping", "delivered", "cancelled"]) {
      expect(canDragOrder({ status, transfer: null })).toBe(true);
      expect(statusBlockedReason({ status, transfer: null })).toBeNull();
    }
  });

  it("transfer qulfi hammasidan ustun", () => {
    const locked = {
      status: "confirmed",
      transfer: {
        id: 1,
        status: "pending_accept",
        fromFilial: null,
        toFilial: null,
        reason: null,
      },
    };
    expect(canDragOrder(locked)).toBe(false);
    expect(canTransferOrder(locked)).toBe(false);
    expect(statusBlockedReason(locked)).toMatch(/o'tkazilmoqda/);
  });

  it("faqat `confirmed` boshqa filialga o'tkaziladi", () => {
    expect(canTransferOrder({ status: "confirmed", transfer: null })).toBe(true);
    expect(canTransferOrder({ status: "shipping", transfer: null })).toBe(false);
  });
});

describe("undoPatch — 5 soniyalik qaytarish", () => {
  it("to'g'ri o'tish (shipping→delivered) undo'si sabab bilan qaytadi", () => {
    expect(undoPatch("shipping", "delivered")).toMatchObject({
      status: "shipping",
      revertReason: "mistake",
    });
  });

  it("atkazning undo'si — jarayonga tiklash (revert_reason)", () => {
    expect(undoPatch("shipping", "cancelled")).toMatchObject({
      status: "shipping",
      revertReason: "mistake",
    });
  });

  it("jarayonga tiklashning undo'si — qayta atkaz (cancel_reason)", () => {
    expect(undoPatch("cancelled", "shipping")).toMatchObject({
      status: "cancelled",
      cancelReason: "other",
    });
  });

  it("teskari o'tish matritsada bo'lmasa undo yo'q", () => {
    // cancelled → confirmed tiklandi; confirmed → cancelled endi yo'q.
    expect(undoPatch("cancelled", "confirmed")).toBeNull();
    // confirmed → shipping undo'si shipping → confirmed (revert) — bor.
    expect(undoPatch("confirmed", "shipping")).toMatchObject({
      status: "confirmed",
    });
    expect(undoPatch("unknown", "confirmed")).toBeNull();
  });
});
