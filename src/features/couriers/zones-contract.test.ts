import { describe, expect, it } from "vitest";

import {
  cashPointLabel,
  districtName,
  districtOptions,
  findDistrict,
  isActiveDistrictOf,
  mapCashPoint,
  mapRegionSettings,
  mapRegionsDictionary,
  mapZones,
} from "@/features/zones/types";
import { ApiError } from "@/lib/api-client";

import { courierFilterParams } from "./api";
import {
  applyBody,
  buildOverrides,
  carryOverrides,
  formatCountdown,
  mapAutoAssignPlan,
  mapAutoAssignResult,
  previewBody,
  secondsLeft,
  staleOrderIds,
  unassignedReasonLabel,
} from "./auto-assign";
import {
  candidateReasonText,
  formatDistance,
  groupCandidates,
  mapCourierCandidates,
} from "./candidates";
import { interfilialRangeError, mapInterfilialReport } from "./interfilial";
import { mapCodSettleResult, mapCourier, mapHandover, mapHandoverRow } from "./types";

describe("ma'lumotnoma: tumanlar, zonalar, sozlama", () => {
  const regions = mapRegionsDictionary([
    {
      region: "fargona",
      name: "Farg'ona viloyati",
      districts: [
        { code: "fargona/qoqon_sh", region: "fargona", name_uz: "Qo'qon shahri", name_ru: "г. Коканд", kind: "city", is_active: true },
        { code: "fargona/eski", name_uz: "Eski tuman", is_active: false },
        { name_uz: "kodsiz" },
      ],
    },
    { region: "toshkent", name: "Toshkent viloyati", districts: [{ code: "toshkent/chirchiq", name_uz: "Chirchiq" }] },
    { name: "kodsiz viloyat" },
  ]);

  it("lug'at o'qiladi, kodsiz yozuvlar tashlanadi", () => {
    expect(regions).toHaveLength(2);
    expect(regions[0]?.districts).toHaveLength(2);
    expect(findDistrict(regions, "fargona/qoqon_sh")).toMatchObject({ nameUz: "Qo'qon shahri", nameRu: "г. Коканд", kind: "city" });
    expect(findDistrict(regions, "yo'q")).toBeNull();
  });

  it("tanlov: viloyat bo'yicha, faqat faollar", () => {
    expect(districtOptions(regions, "fargona").map((d) => d.code)).toEqual(["fargona/qoqon_sh"]);
    expect(districtOptions(regions, null)).toHaveLength(2);
    expect(districtOptions(undefined, null)).toEqual([]);
  });

  it("tuman shu viloyatda faolmi: nofaol, boshqa viloyat yoki viloyatsiz — yo'q", () => {
    expect(isActiveDistrictOf(regions, "fargona", "fargona/qoqon_sh")).toBe(true);
    expect(isActiveDistrictOf(regions, "fargona", "fargona/eski")).toBe(false);
    expect(isActiveDistrictOf(regions, "toshkent", "fargona/qoqon_sh")).toBe(false);
    expect(isActiveDistrictOf(regions, "", "fargona/qoqon_sh")).toBe(false);
    expect(isActiveDistrictOf(undefined, "fargona", "fargona/qoqon_sh")).toBe(false);
  });

  it("tuman nomi UI tiliga qarab (backend #1)", () => {
    const qoqon = findDistrict(regions, "fargona/qoqon_sh");
    const chirchiq = findDistrict(regions, "toshkent/chirchiq");
    if (!qoqon || !chirchiq) throw new Error("fixture");
    expect(districtName(qoqon, "ru")).toBe("г. Коканд");
    expect(districtName(qoqon, "uz-latn")).toBe("Qo'qon shahri");
    expect(districtName(qoqon, "uz-cyrl")).toBe("Qo'qon shahri");
    expect(districtName({ ...qoqon, nameUzCyrl: "Қўқон шаҳри" }, "uz-cyrl")).toBe("Қўқон шаҳри");
    // `name_ru` bo'lmasa — o'zbekcha.
    expect(districtName(chirchiq, "ru")).toBe("Chirchiq");
  });

  it("{results} o'ramasi ham, axlat ham", () => {
    expect(mapRegionsDictionary({ results: [{ region: "x", districts: [] }] })).toHaveLength(1);
    expect(mapRegionsDictionary("axlat")).toEqual([]);
  });

  it("zonalar", () => {
    const zones = mapZones([
      {
        id: 7,
        region: "fargona",
        name: "Qo'qon markaz",
        is_active: true,
        district_codes: ["fargona/qoqon_sh"],
        cash_point: { kind: "filial", filial_id: 3, user_id: null, name: "Qo'qon kassasi" },
        neighbor_zone_ids: [8, "9", null],
      },
      { name: "idsiz" },
    ]);
    expect(zones).toHaveLength(1);
    expect(zones[0]).toMatchObject({ id: 7, districtCodes: ["fargona/qoqon_sh"], neighborZoneIds: [8, 9] });
    expect(zones[0]?.cashPoint).toMatchObject({ kind: "filial", filialId: 3, name: "Qo'qon kassasi" });
  });

  it("kassa nuqtasi: null-xavfsiz va zaxira nom", () => {
    expect(mapCashPoint(null)).toBeNull();
    expect(mapCashPoint({})).toBeNull();
    expect(cashPointLabel({ kind: "person", filialId: null, userId: 4, name: null })).toBe("Mas'ul xodim");
    // Backend #17: faqat `filial` | `person`; notanish tur — `null`.
    expect(mapCashPoint({ kind: "person", user_id: 4 })?.kind).toBe("person");
    expect(mapCashPoint({ kind: "user", user_id: 4 })?.kind).toBeNull();
    expect(cashPointLabel({ kind: "filial", filialId: 1, userId: null, name: null })).toBe("Filial kassasi");
    expect(cashPointLabel(null)).toBe("");
  });

  it("viloyat sozlamasi: notanish rejim — off", () => {
    expect(mapRegionSettings({ region: "fargona", auto_assign: "full" })).toEqual({ region: "fargona", autoAssign: "full" });
    expect(mapRegionSettings({ auto_assign: "turbo" }).autoAssign).toBe("off");
  });
});

describe("kuryer: zonalar, yuklama, filial", () => {
  it("yangi maydonlar", () => {
    const courier = mapCourier({
      id: 5,
      full_name: "Aziz",
      zone_ids: [7, 8],
      zones: [{ id: 7, name: "Markaz" }, { name: "idsiz" }],
      region: "fargona",
      load: 4,
      filial: { id: 3, name: "Qo'qon" },
    });
    expect(courier).toMatchObject({
      zoneIds: [7, 8],
      zones: [{ id: 7, name: "Markaz" }],
      region: "fargona",
      load: 4,
      filial: { id: 3, name: "Qo'qon" },
      filialName: "Qo'qon",
    });
  });

  it("eski javob — bo'sh/null", () => {
    expect(mapCourier({ id: 5 })).toMatchObject({ zoneIds: [], zones: [], region: null, load: null, filial: null });
  });

  it("filial: null (backend #18) — yiqilmaydi", () => {
    expect(mapCourier({ id: 5, filial: null })).toMatchObject({ filial: null, filialName: null });
  });

  it("ro'yxat filtrlari", () => {
    expect(courierFilterParams({ zoneIds: [7], onShift: true })).toEqual({
      zone: "7",
      region: null,
      district: null,
      on_shift: "true",
    });
    expect(courierFilterParams()).toEqual({ zone: null, region: null, district: null, on_shift: null });
    expect(courierFilterParams({ region: " fargona ", onShift: false })).toMatchObject({ region: "fargona", on_shift: "false" });
  });
});

describe("pul: kassa nuqtasi va filiallar bo'linishi", () => {
  const handoverJson = {
    status: "pending",
    amount: "500000",
    cash_point: { kind: "filial", filial_id: 3, user_id: null, name: "Qo'qon kassasi" },
    by_filial: [
      { filial_id: 3, filial_name: "Qo'qon", amount: "300000", orders: 3, amount_display: "300 000 so'm" },
      { filial_id: 4, filial_name: "Farg'ona", amount: 200000, orders: 2 },
    ],
  };

  it("yangi e'lon", () => {
    const handover = mapHandover(handoverJson);
    expect(handover?.cashPoint?.name).toBe("Qo'qon kassasi");
    expect(handover?.byFilial).toEqual([
      { filialId: 3, filialName: "Qo'qon", amount: 300000, orders: 3, amountDisplay: "300 000 so'm" },
      { filialId: 4, filialName: "Farg'ona", amount: 200000, orders: 2, amountDisplay: null },
    ]);
  });

  it("eski e'lon — cash_point null, by_filial []", () => {
    expect(mapHandover({ status: "pending", cash_point: null, by_filial: null })).toMatchObject({ cashPoint: null, byFilial: [] });
    expect(mapHandover({ status: "pending" })).toMatchObject({ cashPoint: null, byFilial: [] });
  });

  it("ro'yxat qatori: boshqa filial kuryeri", () => {
    const row = mapHandoverRow({
      ...handoverJson,
      date: "2026-10-14",
      courier: { id: 9, full_name: "Boshqa", filial: { id: 4, name: "Farg'ona" } },
    });
    expect(row.courier).toEqual({ id: 9, fullName: "Boshqa", filial: { id: 4, name: "Farg'ona" } });
    expect(row.cashPoint?.filialId).toBe(3);
    expect(mapHandoverRow({ date: "x" })).toMatchObject({ courier: null, cashPoint: null, byFilial: [] });
  });

  it("settle javobi ham bo'linishni olib keladi", () => {
    const result = mapCodSettleResult({ settled_days: 1, days: [{ date: "2026-10-14", handover: handoverJson }] });
    expect(result.days[0]?.handover?.byFilial).toHaveLength(2);
  });

  it("filiallararo hisobot va oraliq", () => {
    const report = mapInterfilialReport({
      rows: [
        { from_filial: { id: 4, name: "Farg'ona" }, to_filial: { id: 3, name: "Qo'qon" }, amount: "200000", handover_ids: [1, "2"] },
        "axlat",
      ],
      total: "200000",
    });
    expect(report).toEqual({
      rows: [
        { fromFilial: { id: 4, name: "Farg'ona" }, toFilial: { id: 3, name: "Qo'qon" }, amount: 200000, handoverIds: [1, 2] },
      ],
      total: 200000,
    });
    expect(mapInterfilialReport(null)).toEqual({ rows: [], total: 0 });
    expect(interfilialRangeError("2026-10-01", "2026-10-15")).toBeNull();
    expect(interfilialRangeError("2026-10-15", "2026-10-01")).not.toBeNull();
    expect(interfilialRangeError("2026-01-01", "2026-04-10")).toBe("Oraliq 92 kundan oshmasin");
    expect(interfilialRangeError("2026-01-01", "2026-04-02")).toBeNull();
    expect(interfilialRangeError("", "2026-01-01")).not.toBeNull();
  });
});

describe("nomzod kuryerlar", () => {
  const raw = {
    order_id: "o1",
    zone: { id: 7, name: "Markaz" },
    candidates: [
      { courier: { id: 1, full_name: "Viloyatlik", on_shift: true }, tier: "region", load: 1 },
      { courier: { id: 2, full_name: "Asosiy", on_shift: true, online: true, zone_ids: [7] }, tier: "primary", load: 3, distance_m: 1250, familiar: true },
      { courier: { id: 3, full_name: "Qo'shni", on_shift: false }, tier: "neighbor", load: 0, distance_m: null },
      { courier: { id: 4, full_name: "Ikkinchi", on_shift: true }, tier: "secondary", load: 5 },
      { courier: { full_name: "idsiz" }, tier: "primary" },
    ],
    suggested_courier_id: 4,
    reason: "ok",
  };

  it("o'qiladi; suggested umumiy id dan to'ldiriladi", () => {
    const data = mapCourierCandidates(raw);
    expect(data.candidates).toHaveLength(4);
    expect(data.zone).toEqual({ id: 7, name: "Markaz" });
    expect(data.candidates.find((c) => c.courier.id === 4)?.suggested).toBe(true);
    expect(data.candidates.find((c) => c.courier.id === 2)).toMatchObject({ distanceM: 1250, familiar: true, suggested: false });
  });

  it("guruhlar: zona → qo'shni → viloyat, server tartibi saqlanadi", () => {
    const groups = groupCandidates(mapCourierCandidates(raw).candidates);
    expect(groups.map((g) => g.title)).toEqual(["Zona kuryerlari", "Qo'shni zona", "Viloyat"]);
    expect(groups[0]?.items.map((c) => c.courier.id)).toEqual([2, 4]);
    expect(groups[2]?.items.map((c) => c.courier.id)).toEqual([1]);
  });

  it("bo'sh guruh chiqmaydi; zonasiz buyurtma — faqat viloyat", () => {
    const data = mapCourierCandidates({
      zone: null,
      reason: "no_zone",
      candidates: [{ courier: { id: 1 }, tier: "region" }, { courier: { id: 2 }, tier: "mars" }],
    });
    expect(groupCandidates(data.candidates).map((g) => g.key)).toEqual(["region"]);
    expect(candidateReasonText(data.reason)).toContain("viloyat");
    expect(mapCourierCandidates(null)).toMatchObject({ candidates: [], zone: null, suggestedCourierId: null, reason: null });
  });

  it("masofa", () => {
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(1250)).toBe("1,3 km");
    expect(formatDistance(12500)).toBe("13 km");
    expect(formatDistance(null)).toBeNull();
  });
});

describe("avto-taqsimlash", () => {
  const plan = mapAutoAssignPlan({
    plan: [
      { order_id: "a", order_number: "MH-1", courier_id: 1, courier_name: "Aziz", tier: "primary", load_after: 3 },
      { order_id: "b", order_number: "MH-2", courier_id: 2, courier_name: "Bobur", tier: "neighbor", load_after: 1 },
      { order_number: "idsiz" },
    ],
    unassigned: [
      { order_id: "c", reason: "no_zone" },
      {
        order_id: "d",
        reason: "no_courier_on_shift",
        order_number: "MH-4",
        client_name: "Dilnoza",
        zone_id: 7,
        region: "fargona",
        district: "fargona/qoqon_sh",
        district_display: "Qo'qon shahri",
      },
      { reason: "idsiz" },
    ],
    plan_token: "tok",
    expires_in: 120,
  });

  it("reja o'qiladi", () => {
    expect(plan.plan.map((row) => row.orderId)).toEqual(["a", "b"]);
    // A5: qator o'z maydonlarini olib keladi; eski javobda ular `null`.
    expect(plan.unassigned).toEqual([
      {
        orderId: "c",
        orderNumber: null,
        reason: "no_zone",
        clientName: null,
        zoneId: null,
        region: null,
        district: null,
        districtDisplay: null,
      },
      {
        orderId: "d",
        orderNumber: "MH-4",
        reason: "no_courier_on_shift",
        clientName: "Dilnoza",
        zoneId: 7,
        region: "fargona",
        district: "fargona/qoqon_sh",
        districtDisplay: "Qo'qon shahri",
      },
    ]);
    expect(plan.planToken).toBe("tok");
    expect(mapAutoAssignPlan({}).expiresIn).toBe(120);
    expect(unassignedReasonLabel("no_zone")).toBe("Zona aniqlanmagan");
    expect(unassignedReasonLabel("no_courier_on_shift")).toBe("Smenada kuryer yo'q");
    // Backend #15: boshqa sabab yo'q — notanishi umumiy matn.
    expect(unassignedReasonLabel("capacity")).toBe("Biriktirib bo'lmadi");
    expect(unassignedReasonLabel("")).toBe("Biriktirib bo'lmadi");
  });

  it("preview tanasi", () => {
    expect(previewBody(null)).toEqual({});
    expect(previewBody({ region: "fargona", zoneIds: [7] }, ["a"])).toEqual({
      scope: { region: "fargona", zone_ids: [7] },
      order_ids: ["a"],
    });
    expect(previewBody({ filialId: 3, region: "x" })).toEqual({ scope: { filial_id: 3 } });
  });

  it("faqat rejadan farqli tanlovlar yuboriladi", () => {
    expect(buildOverrides(plan.plan, { a: 1, b: 5, zz: 9 })).toEqual([{ order_id: "b", courier_id: 5 }]);
  });

  it("qo'llash tanasi: butun reja yoki `order_ids` qismi (A4), `allow_off_shift` yo'q", () => {
    expect(applyBody("tok", plan.plan, { b: 5 })).toEqual({
      plan_token: "tok",
      overrides: [{ order_id: "b", courier_id: 5 }],
    });
    // Qism: tanlovlar ham shu qatorlar bilan cheklanadi.
    expect(applyBody("tok", plan.plan, { a: 9, b: 5 }, ["a"])).toEqual({
      plan_token: "tok",
      order_ids: ["a"],
      overrides: [{ order_id: "a", courier_id: 9 }],
    });
    expect(applyBody("tok", plan.plan, {}, [])).toEqual({ plan_token: "tok", order_ids: [], overrides: [] });
  });

  it("409 plan_stale — eskirgan buyurtmalar; boshqa xato — null", () => {
    const stale = new ApiError("Reja eskirdi", 409, { code: "plan_stale", stale_order_ids: ["a", 7] }, "plan_stale");
    expect(staleOrderIds(stale)).toEqual(["a", "7"]);
    expect(staleOrderIds(new ApiError("x", 409, { code: "plan_stale" }, "plan_stale"))).toEqual([]);
    expect(staleOrderIds(new ApiError("x", 403, { code: "forbidden" }, "forbidden"))).toBeNull();
    expect(staleOrderIds(new Error("x"))).toBeNull();
  });

  it("qayta tuzilganda tanlovlar ko'chiriladi (eskirgan va yo'qolganlar tashlanadi)", () => {
    const next = mapAutoAssignPlan({
      plan: [{ order_id: "a", courier_id: 1 }, { order_id: "b", courier_id: 2 }],
    });
    expect(carryOverrides({ a: 5, b: 6, gone: 7 }, next.plan, ["b"])).toEqual({ a: 5 });
  });

  it("natija va sanoq — ogohlantirish ikki shaklda: `{id}` (A2) va eski `{order_id}`", () => {
    expect(
      mapAutoAssignResult({
        applied: [{ order_id: "a", courier_id: 1 }, { order_id: "b", courier_id: 2 }],
        warnings: [
          { id: "a", warning: "courier_off_shift" },
          { id: "a", warning: "zone_mismatch" },
          { order_id: "b", warning: "zone_mismatch" },
          { id: "c" },
        ],
      }),
    ).toEqual({
      applied: [{ orderId: "a", courierId: 1 }, { orderId: "b", courierId: 2 }],
      warnings: [
        { orderId: "a", warning: "courier_off_shift" },
        { orderId: "a", warning: "zone_mismatch" },
        { orderId: "b", warning: "zone_mismatch" },
      ],
    });
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(0, 5_000)).toBe(0);
    expect(formatCountdown(95)).toBe("1:35");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
