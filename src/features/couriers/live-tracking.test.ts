import { describe, expect, it } from "vitest";

import {
  EMPTY_LIVE_FILTER,
  LIVE_INTENSE_POLL_MS,
  alertLabel,
  alertTone,
  applyLocationToLiveList,
  liveCouriersParams,
  liveEmptyText,
  liveRefetchInterval,
  formatAgo,
  formatStopDuration,
  freshness,
  hasFraudAlert,
  isMoving,
  liveCourierFromCourier,
  mapCourierAlerts,
  mapCourierLocationEvent,
  mapCourierTrack,
  mapLiveCourier,
  markerTone,
  miniStatusLine,
  normalizeBattery,
  normalizeHeading,
  pathLengthM,
} from "./live-tracking";
import { mapCourier } from "./types";

const NOW = new Date("2026-10-17T10:00:00Z");
const secondsAgo = (s: number) => new Date(NOW.getTime() - s * 1000);

/** Namuna — `HUDUD_BACKEND_TALABLAR_3.md` §7.2 `couriers/live/`. */
const LIVE_JSON = {
  id: 7,
  full_name: "Aziz Karimov",
  phone: "998901110001",
  on_shift: true,
  last_location: {
    lat: 41.31,
    lng: 69.24,
    at: "2026-10-17T09:59:30Z",
    accuracy: 8,
    speed: 4.2,
    heading: 135,
    is_mock: false,
  },
  last_heartbeat_at: "2026-10-17T09:59:40Z",
  battery: 0.63,
  location_permission: "always",
  gps_enabled: true,
  current_order: {
    id: "o-1",
    order_number: "DA-184011",
    address_text: "Chilonzor 12",
    lat: 41.32,
    lng: 69.25,
  },
  today: { assigned: 12, delivered: 9 },
  alerts: ["stale", "unknown_flag", "mock_location", "stale"],
};

describe("mapLiveCourier", () => {
  it("§7.2 shaklini o'qiydi, noma'lum ogohlantirishni tashlaydi", () => {
    const courier = mapLiveCourier(LIVE_JSON);
    expect(courier.id).toBe(7);
    expect(courier.lastLocation).toMatchObject({ lat: 41.31, lng: 69.24, speed: 4.2, heading: 135, isMock: false });
    expect(courier.battery).toBe(63);
    expect(courier.currentOrder).toEqual({
      id: "o-1",
      orderNumber: "DA-184011",
      addressText: "Chilonzor 12",
      point: { lat: 41.32, lng: 69.25 },
    });
    expect(courier.alerts).toEqual(["stale", "mock_location"]);
    expect(courier.gpsEnabled).toBe(true);
  });

  it("maydonlar yo'q bo'lsa — null/bo'sh, xato emas", () => {
    const courier = mapLiveCourier({ id: 1, full_name: "X", phone: "998" });
    expect(courier.lastLocation).toBeNull();
    expect(courier.battery).toBeNull();
    expect(courier.currentOrder).toBeNull();
    expect(courier.alerts).toEqual([]);
    expect(courier.gpsEnabled).toBeNull();
    expect(courier.zones).toEqual([]);
  });

  it("oddiy ro'yxatdan (zaxira) yig'iladi", () => {
    const courier = mapCourier({
      id: 3,
      full_name: "Bek",
      phone: "998901234567",
      on_shift: true,
      last_location: { lat: 41, lng: 69, at: "2026-10-17T09:00:00Z" },
      current_order_id: "o-9",
      battery: 45,
      alerts: ["app_killed"],
      zones: [{ id: 1, name: "Yunusobod" }],
    });
    const live = liveCourierFromCourier(courier);
    expect(live.lastLocation).toMatchObject({ lat: 41, lng: 69, speed: null, heading: null });
    expect(live.currentOrder?.id).toBe("o-9");
    expect(live.battery).toBe(45);
    expect(live.alerts).toEqual(["app_killed"]);
    expect(live.zones).toEqual(["Yunusobod"]);
  });
});

describe("normalizatsiya", () => {
  it("batareya: ulush va foiz ikkalasi ham foizga", () => {
    expect(normalizeBattery(0.63)).toBe(63);
    expect(normalizeBattery(63)).toBe(63);
    expect(normalizeBattery(1)).toBe(100);
    expect(normalizeBattery(null)).toBeNull();
    expect(normalizeBattery(140)).toBeNull();
    expect(normalizeBattery(-1)).toBeNull();
  });

  it("heading 0–360, manfiy — null", () => {
    expect(normalizeHeading(370)).toBe(10);
    expect(normalizeHeading(-1)).toBeNull();
    expect(normalizeHeading(null)).toBeNull();
  });

  it("ogohlantirish yorliqlari o'zbekcha", () => {
    expect(alertLabel("gps_off")).toBe("GPS o'chiq");
    expect(alertLabel("mock_location")).toBe("Soxta GPS");
    expect(alertLabel("app_killed")).toBe("Ilova yopilgan");
    expect(alertLabel("battery_restricted")).toBe("Batareya cheklovi yoqiq");
    expect(alertLabel("autostart_off")).toBe("Autostart o'chiq");
    expect(mapCourierAlerts(["gps_off", 5, null, "permission_denied"])).toEqual([
      "gps_off",
      "permission_denied",
    ]);
  });
});

describe("yangilik darajasi va marker rangi", () => {
  it("< 1 daqiqa yashil, < 5 daqiqa sariq, keyin kulrang", () => {
    expect(freshness(secondsAgo(10), NOW)).toBe("fresh");
    expect(freshness(secondsAgo(59), NOW)).toBe("fresh");
    expect(freshness(secondsAgo(60), NOW)).toBe("aging");
    expect(freshness(secondsAgo(299), NOW)).toBe("aging");
    expect(freshness(secondsAgo(300), NOW)).toBe("lost");
    expect(freshness(null, NOW)).toBe("lost");
  });

  it("aldov belgisi — qizil, yangilikdan qat'i nazar", () => {
    const point = { lat: 1, lng: 1, at: secondsAgo(5), accuracy: null, speed: null, heading: null, isMock: false };
    expect(markerTone({ alerts: [], lastLocation: point }, NOW)).toBe("fresh");
    expect(markerTone({ alerts: ["mock_location"], lastLocation: point }, NOW)).toBe("alert");
    expect(markerTone({ alerts: ["far_from_address"], lastLocation: null }, NOW)).toBe("alert");
    expect(markerTone({ alerts: ["stale"], lastLocation: null }, NOW)).toBe("lost");
  });

  it("strelka faqat > 1 m/s", () => {
    expect(isMoving(null)).toBe(false);
    expect(isMoving(1)).toBe(false);
    expect(isMoving(1.5)).toBe(true);
  });
});

describe("matnlar", () => {
  it("formatAgo: soniya · daqiqa · soat", () => {
    expect(formatAgo(secondsAgo(45), NOW)).toBe("45 soniya oldin");
    expect(formatAgo(secondsAgo(130), NOW)).toBe("2 daqiqa oldin");
    expect(formatAgo(secondsAgo(7200), NOW)).toBe("2 soat oldin");
  });

  it("mini-holat: `2 daqiqa oldin · 12 km/soat · 63%`; bo'sh — null", () => {
    const point = { lat: 1, lng: 1, at: secondsAgo(120), accuracy: null, speed: 3.33, heading: 10, isMock: false };
    expect(miniStatusLine({ lastLocation: point, battery: 63 }, NOW)).toBe("2 daqiqa oldin · 12 km/soat · 63%");
    // Turgan kuryerda tezlik chiqmaydi.
    expect(miniStatusLine({ lastLocation: { ...point, speed: 0.4 }, battery: null }, NOW)).toBe("2 daqiqa oldin");
    expect(miniStatusLine({ lastLocation: null, battery: null }, NOW)).toBeNull();
  });

  it("to'xtash davomiyligi", () => {
    expect(formatStopDuration(240)).toBe("4 daqiqa");
    expect(formatStopDuration(4320)).toBe("1 soat 12 daqiqa");
    expect(formatStopDuration(7200)).toBe("2 soat");
  });
});

describe("WS courier_location → jonli ro'yxat", () => {
  const base = mapLiveCourier(LIVE_JSON);
  const other = mapLiveCourier({ ...LIVE_JSON, id: 8, full_name: "Olim", alerts: [] });

  it("hodisani o'qiydi; courier_id yo'q — null", () => {
    const event = mapCourierLocationEvent({
      courier_id: 7,
      lat: 41.5,
      lng: 69.5,
      at: "2026-10-17T10:00:00Z",
      speed: 2,
      heading: 90,
      is_mock: false,
      on_shift: true,
      battery: 0.5,
    });
    expect(event).toMatchObject({ courierId: 7, onShift: true, battery: 50 });
    expect(event?.point).toMatchObject({ lat: 41.5, lng: 69.5, heading: 90 });
    expect(mapCourierLocationEvent({ lat: 1, lng: 2 })).toBeNull();
  });

  it("nuqta, batareya yangilanadi, boshqa kuryer tegilmaydi", () => {
    const event = mapCourierLocationEvent({ courier_id: 7, lat: 41.5, lng: 69.5, at: "2026-10-17T10:00:00Z", battery: 0.5 });
    const { list, applied } = applyLocationToLiveList([base, other], event!);
    expect(applied).toBe(true);
    expect(list[0]?.lastLocation).toMatchObject({ lat: 41.5, lng: 69.5 });
    expect(list[0]?.battery).toBe(50);
    expect(list[0]?.fullName).toBe("Aziz Karimov");
    expect(list[1]).toBe(other);
  });

  it("eskiroq nuqta joriyini bosib ketmaydi", () => {
    const event = mapCourierLocationEvent({ courier_id: 7, lat: 1, lng: 1, at: "2026-10-17T09:00:00Z" });
    const { list } = applyLocationToLiveList([base], event!);
    expect(list[0]?.lastLocation?.lat).toBe(41.31);
  });

  it("on_shift: false — ro'yxatdan tushadi; noma'lum kuryer — applied: false", () => {
    const off = mapCourierLocationEvent({ courier_id: 7, lat: 1, lng: 1, on_shift: false });
    expect(applyLocationToLiveList([base, other], off!).list.map((c) => c.id)).toEqual([8]);
    const unknown = mapCourierLocationEvent({ courier_id: 99, lat: 1, lng: 1, on_shift: true });
    const result = applyLocationToLiveList([base], unknown!);
    expect(result.applied).toBe(false);
    expect(result.list).toHaveLength(1);
  });

  it("is_mock nuqta `mock_location` qo'shadi; yangi nuqta `stale`/`app_killed` ni olib tashlaydi", () => {
    const fresh = mapCourierLocationEvent({ courier_id: 7, lat: 1, lng: 1, at: "2026-10-17T10:00:00Z" });
    expect(applyLocationToLiveList([base], fresh!).list[0]?.alerts).toEqual(["mock_location"]);
    const mock = mapCourierLocationEvent({ courier_id: 8, lat: 1, lng: 1, at: "2026-10-17T10:00:00Z", is_mock: true });
    expect(applyLocationToLiveList([other], mock!).list[0]?.alerts).toEqual(["mock_location"]);
  });
});

describe("kun izi", () => {
  it("nuqtalar, to'xtashlar, total_m", () => {
    const track = mapCourierTrack({
      points: [
        { lat: 41.31, lng: 69.24, at: "2026-10-17T08:00:00Z", speed: 0, accuracy: 10, is_mock: false },
        { lat: 41.32, lng: 69.25, at: "2026-10-17T08:05:00Z" },
        { lat: null, lng: 69.26 },
      ],
      total_m: 1450,
      stops: [{ lat: 41.31, lng: 69.24, from: "2026-10-17T08:00:00Z", to: "2026-10-17T08:04:00Z", duration_s: 240 }],
    });
    expect(track.points).toHaveLength(2);
    expect(track.totalM).toBe(1450);
    expect(track.stops[0]).toMatchObject({ durationS: 240 });
    expect(track.stops[0]?.from).toBeInstanceOf(Date);
  });

  it("total_m yo'q — nuqtalardan hisoblanadi; bo'sh javob — 0", () => {
    const track = mapCourierTrack({ points: [{ lat: 41.31, lng: 69.24 }, { lat: 41.32, lng: 69.24 }] });
    expect(track.totalM).toBeGreaterThan(1000);
    expect(track.totalM).toBeLessThan(1200);
    expect(mapCourierTrack({})).toEqual({ points: [], totalM: 0, stops: [] });
    expect(pathLengthM([])).toBe(0);
  });
});

describe("jonli so'rov: hudud filtri, ?all=1, jadal rejim (HUDUD_3 javobi §7.3)", () => {
  it("sahifa filtri so'rov qatoriga o'tadi; bo'shlari yuborilmaydi", () => {
    expect(liveCouriersParams(EMPTY_LIVE_FILTER)).toEqual({
      zone: null,
      region: null,
      district: null,
      all: null,
    });
    expect(
      liveCouriersParams({
        region: "fargona",
        zoneIds: [7],
        districts: ["fargona/qoqon_sh"],
        includeOffShift: true,
      }),
    ).toEqual({ zone: "7", region: "fargona", district: "fargona/qoqon_sh", all: "1" });
  });

  it("30 s so'rov faqat xarita ochiq va tab ko'rinib turganda", () => {
    expect(LIVE_INTENSE_POLL_MS).toBe(30_000);
    expect(liveRefetchInterval({ mapOpen: true, documentVisible: true })).toBe(30_000);
    expect(liveRefetchInterval({ mapOpen: true, documentVisible: false })).toBe(false);
    expect(liveRefetchInterval({ mapOpen: false, documentVisible: true })).toBe(false);
  });

  it("bo'sh xarita matni filtrga mos", () => {
    expect(liveEmptyText({})).toBe("Hozir smenada kuryer yo'q");
    expect(liveEmptyText({ region: "fargona" })).toBe("Bu hududda smenada kuryer yo'q");
    expect(liveEmptyText({ all: "1" })).toBe("Kuryer topilmadi");
    expect(liveEmptyText({ zone: "7", all: "1" })).toBe("Bu hududda kuryer yo'q");
  });

  it("`today.cod_total` o'qiladi; yo'q bo'lsa `null`", () => {
    expect(mapLiveCourier({ id: 1, today: { assigned: 5, delivered: 3, cod_total: 450000 } }).today)
      .toEqual({ assigned: 5, delivered: 3, codTotal: 450000 });
    expect(mapLiveCourier({ id: 1 }).today.codTotal).toBeNull();
  });

  it("`?all=1` ro'yxatida smenadan chiqqan kuryer qoladi", () => {
    const list = [mapLiveCourier({ id: 7, on_shift: true, last_location: { lat: 41, lng: 69 } })];
    const event = { courierId: 7, point: { lat: 41.1, lng: 69.1, at: null, accuracy: null, speed: null, heading: null, isMock: false }, onShift: false, battery: null };
    expect(applyLocationToLiveList(list, event).list).toHaveLength(0);
    const kept = applyLocationToLiveList(list, event, { keepOffShift: true });
    expect(kept.list[0]?.onShift).toBe(false);
    expect(kept.list[0]?.lastLocation).toMatchObject({ lat: 41.1 });
  });

  it("tasdiqlangan ogohlantirishlar ro'yxati tanilib, noma'lumi tashlanadi", () => {
    expect(
      mapCourierAlerts(["permission_denied", "gps_off", "app_killed", "stale", "mock_location", "far_from_address", "x"]),
    ).toEqual(["permission_denied", "gps_off", "app_killed", "stale", "mock_location", "far_from_address"]);
  });
});

describe("fon ishlashi belgilari (HUDUD_JAVOBLAR_4 §3)", () => {
  it("to'liq ro'yxat parse qilinadi, tartib saqlanadi", () => {
    const all = [
      "permission_denied",
      "gps_off",
      "battery_restricted",
      "autostart_off",
      "app_killed",
      "stale",
      "mock_location",
    ];
    expect(mapCourierAlerts(all)).toEqual(all);
  });

  it("batareya/autostart — warn, aldov — danger; marker rangi aldovsiz o'zgarmaydi", () => {
    expect(alertTone("battery_restricted")).toBe("warn");
    expect(alertTone("autostart_off")).toBe("warn");
    expect(alertTone("mock_location")).toBe("danger");
    expect(hasFraudAlert(["battery_restricted", "autostart_off"])).toBe(false);
  });
});
