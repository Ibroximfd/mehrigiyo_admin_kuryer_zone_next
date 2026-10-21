import { describe, expect, it } from "vitest";

import {
  AppError,
  appErrorFromResponse,
  errorKindForStatus,
  isNotAdminError,
  mapFieldErrors,
  parseErrorBody,
} from "./app-error";

describe("errorKindForStatus", () => {
  it("maps statuses to kinds", () => {
    expect(errorKindForStatus(400)).toBe("validation");
    expect(errorKindForStatus(401)).toBe("unauthorized");
    expect(errorKindForStatus(403)).toBe("forbidden");
    expect(errorKindForStatus(404)).toBe("not-found");
    expect(errorKindForStatus(409)).toBe("conflict");
    expect(errorKindForStatus(502)).toBe("server");
    expect(errorKindForStatus(418)).toBe("unknown");
  });
});

describe("parseErrorBody", () => {
  it("reads the {code, detail, fields} contract", () => {
    expect(
      parseErrorBody({ code: "validation_error", detail: "Xato", fields: { name_uz: ["Majburiy"] } }),
    ).toEqual({ code: "validation_error", detail: "Xato", fields: { name_uz: ["Majburiy"] } });
  });

  it("normalizes string, number and object field values", () => {
    const parsed = parseErrorBody({
      code: "district_in_zone",
      detail: "Tuman \"Qo'qon markaz\" zonasida",
      fields: { district: ["fargona/qoqon_sh"], zone_id: [7], phone: "Band", nested: { a: "b" } },
    });
    expect(parsed).toEqual({
      code: "district_in_zone",
      detail: "Tuman \"Qo'qon markaz\" zonasida",
      fields: { district: ["fargona/qoqon_sh"], zone_id: ["7"], phone: ["Band"], nested: ["a: b"] },
    });
  });

  it("falls back to flat DRF errors", () => {
    expect(parseErrorBody({ password: ["Kamida 6 belgi"] })).toEqual({
      code: null,
      detail: null,
      fields: { password: ["Kamida 6 belgi"] },
    });
  });

  it("ignores HTML pages and junk", () => {
    expect(parseErrorBody("<html>502</html>")).toEqual({ code: null, detail: null, fields: {} });
    expect(parseErrorBody("Plain text")).toMatchObject({ detail: "Plain text" });
    expect(parseErrorBody(undefined)).toEqual({ code: null, detail: null, fields: {} });
    expect(parseErrorBody(42)).toEqual({ code: null, detail: null, fields: {} });
  });
});

describe("mapFieldErrors", () => {
  const conflict = appErrorFromResponse(409, {
    code: "phone_taken",
    detail: "Bu raqamda faol kuryer bor: Ali",
    fields: { phone: ["Band"], "cash_point.filial_id": ["Topilmadi"], extra: ["Noma'lum"] },
  });

  it("builds a typed AppError", () => {
    expect(conflict).toBeInstanceOf(AppError);
    expect(conflict).toMatchObject({ kind: "conflict", status: 409, code: "phone_taken" });
    expect(conflict.message).toBe("Bu raqamda faol kuryer bor: Ali");
  });

  it("maps known fields and aliases; keeps the rest", () => {
    const mapping = mapFieldErrors(conflict, ["phone", "filialId"] as const, {
      "cash_point.filial_id": "filialId",
    });
    expect(mapping.fields).toEqual([
      { name: "phone", message: "Band" },
      { name: "filialId", message: "Topilmadi" },
    ]);
    expect(mapping.rest).toEqual(["Noma'lum"]);
  });

  it("maps a nested server field by its root name", () => {
    const error = appErrorFromResponse(400, { fields: { "zone_ids.0": ["Topilmadi"] } });
    expect(mapFieldErrors(error, ["zone_ids"] as const).fields).toEqual([
      { name: "zone_ids", message: "Topilmadi" },
    ]);
  });

  it("returns nothing for non-AppError values", () => {
    expect(mapFieldErrors(new Error("x"), ["a"] as const)).toEqual({ fields: [], rest: [] });
  });
});

describe("isNotAdminError (backend #28)", () => {
  const forbidden = appErrorFromResponse(403, { code: "forbidden", detail: "Faqat admin uchun" });

  it("matches only 403 forbidden on admin paths", () => {
    expect(forbidden).toMatchObject({ kind: "forbidden", code: "forbidden", detail: "Faqat admin uchun" });
    expect(isNotAdminError(forbidden, "admin/zones/")).toBe(true);
    expect(isNotAdminError(forbidden, "meta/regions/")).toBe(false);
  });

  it("ignores other 403s and 401 not_authenticated", () => {
    expect(isNotAdminError(appErrorFromResponse(403, { detail: "Proxy" }), "admin/zones/")).toBe(false);
    expect(isNotAdminError(appErrorFromResponse(403, { code: "permission_denied" }), "admin/zones/")).toBe(false);
    const unauthenticated = appErrorFromResponse(401, { code: "not_authenticated" });
    expect(unauthenticated.kind).toBe("unauthorized");
    expect(isNotAdminError(unauthenticated, "admin/zones/")).toBe(false);
  });
});
