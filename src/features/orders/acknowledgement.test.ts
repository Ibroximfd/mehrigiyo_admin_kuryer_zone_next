import { describe, expect, it } from "vitest";

import {
  EMPTY_LOCAL_ACKS,
  countFresh,
  hasUnseenChanges,
  isAckFallback,
  isFreshOrder,
  myAckAt,
  orderAcks,
} from "./acknowledgement";
import type { LocalAckState } from "./acknowledgement";
import { mergeOrderSnapshot } from "./order-snapshot";
import { mapLogistOrder } from "./types";

const T0 = Date.parse("2026-09-30T08:00:00Z");
const at = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();

function order(extra: Record<string, unknown>) {
  return mapLogistOrder({
    id: "o1",
    order_number: "ORD-1",
    status: "confirmed",
    created_at: at(10),
    confirmed_at: at(12),
    ...extra,
  });
}

const local = (patch: Partial<LocalAckState> = {}): LocalAckState => ({
  baselineAt: T0,
  acks: {},
  seen: {},
  ...patch,
});

describe("server rejimi — `acknowledged_by` filial bo'yicha umumiy", () => {
  it("hech kim olmagan tasdiqlangan buyurtma — yangi", () => {
    const fresh = order({ acknowledged_by: [] });
    expect(isAckFallback(fresh)).toBe(false);
    expect(isFreshOrder(fresh, "3", local())).toBe(true);
  });

  it("boshqa logist olgan bo'lsa hammada oddiy ko'rinadi", () => {
    const taken = order({ acknowledged_by: [{ id: 5, name: "Aziz", at: at(15) }] });
    expect(isFreshOrder(taken, "3", local())).toBe(false);
    expect(orderAcks(taken, "3", local())).toEqual([
      { userId: "5", name: "Aziz", at: new Date(at(15)), isSystem: false },
    ]);
    expect(myAckAt(taken, "3", local())).toBeNull();
    expect(myAckAt(taken, "5", local())).toBe(Date.parse(at(15)));
  });

  it("yo'lga chiqqan / yakunlangan buyurtma yangi emas", () => {
    for (const status of ["shipping", "delivered", "cancelled"]) {
      expect(isFreshOrder(order({ status, acknowledged_by: [] }), "3", local())).toBe(false);
    }
    expect(isFreshOrder(order({ status: "pending", acknowledged_by: [] }), "3", local())).toBe(true);
  });

  it("backend misoli (2026-10-01 §5.3): id — operator profili, `is_system`", () => {
    const taken = order({
      acknowledged_by: [
        { id: 5, name: "Aziz Karimov", at: "2026-10-01T09:32:00+00:00", is_system: false },
      ],
    });
    expect(taken.acknowledgedBy).toEqual([
      {
        userId: "5",
        name: "Aziz Karimov",
        at: new Date("2026-10-01T09:32:00+00:00"),
        isSystem: false,
      },
    ]);
  });

  it("migratsiyaning \"Tizim\" yozuvi: yangi emas, lekin \"Oldi\" deb chizilmaydi", () => {
    const backfilled = order({
      acknowledged_by: [{ id: 1, name: "Tizim", at: at(5), is_system: true }],
    });
    expect(isFreshOrder(backfilled, "3", local())).toBe(false);
    expect(orderAcks(backfilled, "3", local())).toEqual([]);
    // "Tizim" hech qachon "men olganman" emas — "Oldim" tugmasi qoladi.
    expect(myAckAt(backfilled, "1", local())).toBeNull();
  });

  it("server rejimida mahalliy belgi hisobga olinmaydi", () => {
    const fresh = order({ acknowledged_by: [] });
    const state = local({ acks: { o1: T0 } });
    expect(myAckAt(fresh, "3", state)).toBeNull();
    expect(isFreshOrder(fresh, "3", state)).toBe(true);
  });

  it("massiv bo'lmasa — zaxira rejimi", () => {
    expect(order({}).acknowledgedBy).toBeNull();
    expect(order({ acknowledged_by: "x" }).acknowledgedBy).toBeNull();
  });
});

describe("zaxira — shu qurilma, logist akkaunti bo'yicha", () => {
  it("birinchi ochilishdan oldin kelganlar yangi emas", () => {
    const old = order({ confirmed_at: at(-30), created_at: at(-40) });
    expect(isFreshOrder(old, "3", local())).toBe(false);
    expect(isFreshOrder(order({}), "3", local())).toBe(true);
    // Baseline hali yo'q (sessiya boshlanmagan) — hech narsa yonmaydi.
    expect(isFreshOrder(order({}), "3", EMPTY_LOCAL_ACKS)).toBe(false);
  });

  it("\"Oldim\" bosilgach yangi emas va \"Siz\" bo'lib ko'rinadi", () => {
    const state = local({ acks: { o1: T0 + 20 * 60_000 } });
    const current = order({});
    expect(isFreshOrder(current, "3", state)).toBe(false);
    expect(orderAcks(current, "3", state)).toEqual([
      { userId: "3", name: "Siz", at: new Date(T0 + 20 * 60_000), isSystem: false },
    ]);
  });

  it("sanoq", () => {
    const orders = [order({}), order({ id: "o2" }), order({ id: "o3", status: "shipping" })];
    expect(countFresh(orders, "3", local({ acks: { o1: T0 } }))).toBe(1);
  });
});

describe("ko'rilmagan o'zgarish nuqtasi", () => {
  const ackAt = T0 + 20 * 60_000;

  it("olingandan keyin boshqa joyda o'zgargan bo'lsa yonadi", () => {
    const changed = order({ updated_at: at(40) });
    expect(hasUnseenChanges(changed, "3", local({ acks: { o1: ackAt } }))).toBe(true);
  });

  it("ko'rilgach o'chadi; o'z PATCH imizning aks-sadosi yutiladi", () => {
    const changed = order({ updated_at: at(40) });
    const seen = local({ acks: { o1: ackAt }, seen: { o1: Date.parse(at(40)) - 2_000 } });
    expect(hasUnseenChanges(changed, "3", seen)).toBe(false);
  });

  it("olinmagan buyurtmada nuqta yo'q", () => {
    expect(hasUnseenChanges(order({ updated_at: at(40) }), "3", local())).toBe(false);
  });

  it("server rejimida o'z belgim bo'yicha", () => {
    const changed = order({
      updated_at: at(40),
      acknowledged_by: [{ id: 3, name: "Men", at: at(20) }],
    });
    expect(hasUnseenChanges(changed, "3", local())).toBe(true);
    expect(hasUnseenChanges(changed, "5", local())).toBe(false);
  });
});

describe("WS qisqa kartasi belgini yo'qotmaydi", () => {
  it("`acknowledged_by` siz to'liq buyurtma kelsa eskisi qoladi", () => {
    const current = order({ acknowledged_by: [{ id: 5, name: "Aziz", at: at(15) }] });
    const merged = mergeOrderSnapshot(current, {
      id: "o1",
      status: "confirmed",
      client: { full_name: "Ibroxim" },
      items: [],
    });
    expect(merged.acknowledgedBy).toEqual(current.acknowledgedBy);
  });

  it("qisqa kartada kelsa yangilanadi", () => {
    const current = order({ acknowledged_by: [] });
    const merged = mergeOrderSnapshot(current, {
      acknowledged_by: [{ user: { id: 7, full_name: "Olim" }, acknowledged_at: at(30) }],
    });
    expect(merged.acknowledgedBy).toEqual([
      { userId: "7", name: "Olim", at: new Date(at(30)), isSystem: false },
    ]);
  });
});
