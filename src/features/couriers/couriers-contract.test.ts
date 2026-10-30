import { describe, expect, it } from "vitest";

import {
  countedDifference,
  currentWeek,
  parseCountedAmount,
  previousWeek,
  rangeError,
} from "./cod-week";
import {
  courierPresence,
  mapCodRange,
  mapCodSettleResult,
  mapCourier,
  mapCourierAccountResult,
  mapHandoverRow,
} from "./types";

/** Namunalar — `KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.3–§2.4 dan. */
const courierJson = {
  id: 7,
  full_name: "Aziz Karimov",
  phone: "998901110001",
  is_active: true,
  today: { assigned: 12, delivered: 9, cod_total: "1395000.00" },
  has_account: true,
  device: {
    device_name: "Redmi Note 12",
    platform: "android",
    app_version: "1.0.3",
    since: "2026-10-12T04:10:00Z",
    last_seen_at: "2026-10-13T08:55:12Z",
  },
  on_shift: true,
  online: true,
  last_heartbeat_at: "2026-10-13T08:55:12Z",
  queue_length: 3,
  oldest_pending_at: "2026-10-13T06:20:00Z",
  network: "wifi",
  app_version: "1.0.3",
  last_location: { lat: 41.29, lng: 69.21, at: "2026-10-13T08:54:50Z" },
  current_order_id: "0190abc",
};

describe("kuryer — jonli holat va akkaunt", () => {
  it("hujjatdagi javob to'liq o'qiladi", () => {
    const courier = mapCourier(courierJson);
    expect(courier.today.codTotal).toBe(1395000);
    expect(courier.hasAccount).toBe(true);
    expect(courier.device?.deviceName).toBe("Redmi Note 12");
    expect(courier.live.queueLength).toBe(3);
    expect(courier.live.lastLocation).toMatchObject({ lat: 41.29, lng: 69.21 });
    expect(courier.live.currentOrderId).toBe("0190abc");
    expect(courierPresence(courier)).toBe("online");
  });

  it("smenada, lekin heartbeat yo'q — aloqa yo'q", () => {
    expect(courierPresence(mapCourier({ ...courierJson, online: false }))).toBe(
      "no_connection",
    );
  });

  it("eski javob (jonli maydonsiz) — ilovasiz kuryer, yiqilmaydi", () => {
    const courier = mapCourier({ id: 1, full_name: "A", phone: "998" });
    expect(courier.hasAccount).toBe(false);
    expect(courier.device).toBeNull();
    expect(courier.live.lastLocation).toBeNull();
    expect(courierPresence(courier)).toBe("no_account");
  });

  it("parol javobda bir marta keladi", () => {
    const result = mapCourierAccountResult({
      id: 7,
      phone: "998901110001",
      password: "yangi123",
      has_account: true,
      device: null,
    });
    expect(result.password).toBe("yangi123");
    expect(result.courier.hasAccount).toBe(true);
  });
});

describe("haftalik naqd yig'im", () => {
  const range = mapCodRange({
    date_from: "2026-10-06",
    date_to: "2026-10-12",
    days: [
      {
        date: "2026-10-06",
        orders: [
          {
            id: "a",
            order_number: "12341",
            amount: 155000,
            delivered_at: "2026-10-06T09:41:03Z",
          },
        ],
        computed_total: 465000,
        amount: 465000,
        settled: false,
        handover: null,
      },
      {
        date: "2026-10-08",
        orders: [],
        computed_total: 310000,
        amount: 300000,
        settled: false,
        handover: {
          status: "pending",
          amount: 300000,
          confirmed_amount: null,
          note: "bitta mijoz 10 000 kam berdi",
        },
      },
    ],
    total: 1240000,
    outstanding_total: 1240000,
    outstanding_days: 4,
    settled: false,
  });

  it("kunlar, e'lon va topshirilmagan jami o'qiladi", () => {
    expect(range.days).toHaveLength(2);
    expect(range.days[1]?.amount).toBe(300000);
    expect(range.days[1]?.computedTotal).toBe(310000);
    expect(range.days[1]?.handover?.status).toBe("pending");
    expect(range.outstandingTotal).toBe(1240000);
    expect(range.outstandingDays).toBe(4);
  });

  it("yopish natijasida nizoli kun ajraladi", () => {
    const result = mapCodSettleResult({
      success: true,
      settled_days: 4,
      confirmed_total: 1200000,
      days: [
        { date: "2026-10-06", handover: { status: "confirmed", amount: 465000 } },
        {
          date: "2026-10-12",
          handover: {
            status: "disputed",
            amount: 155000,
            confirmed_amount: 115000,
            logist_note: "40 000 kam",
          },
        },
      ],
    });
    expect(result.settledDays).toBe(4);
    expect(result.days[1]?.handover?.status).toBe("disputed");
    expect(result.days[1]?.handover?.confirmedAmount).toBe(115000);
  });

  it("e'lonlar ro'yxati qatori", () => {
    const row = mapHandoverRow({
      courier: { id: 7, full_name: "Aziz Karimov" },
      date: "2026-10-08",
      status: "pending",
      amount: 300000,
    });
    expect(row.courier?.id).toBe(7);
    expect(row.amount).toBe(300000);
  });

  it("oraliq: hafta dushanbadan, 31 kundan oshmaydi", () => {
    const tuesday = new Date(2026, 9, 13);
    expect(currentWeek(tuesday)).toEqual({ from: "2026-10-12", to: "2026-10-13" });
    expect(previousWeek(tuesday)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(rangeError({ from: "2026-10-12", to: "2026-10-06" })).not.toBeNull();
    expect(rangeError({ from: "2026-09-01", to: "2026-10-12" })).not.toBeNull();
    expect(rangeError({ from: "2026-10-06", to: "2026-10-12" })).toBeNull();
  });

  it("sanalgan pul: bo'sh, raqam, farq", () => {
    expect(parseCountedAmount("")).toBeNull();
    expect(parseCountedAmount("1 200 000")).toBe(1200000);
    expect(parseCountedAmount("12a")).toBeNaN();
    expect(countedDifference(1240000, 1200000)).toBe(40000);
    expect(countedDifference(1240000, null)).toBeNull();
  });
});
