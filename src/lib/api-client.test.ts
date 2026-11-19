import { HTTPError, NetworkError, TimeoutError, type NormalizedOptions } from "ky";
import { describe, expect, it } from "vitest";

import { contentDispositionFileName, needsTokenRefresh, refreshRejected } from "./api-client";

describe("eksport fayli nomi — `Content-Disposition`", () => {
  it("oddiy `filename` va kodlangan `filename*`", () => {
    expect(contentDispositionFileName('attachment; filename="sotuv_2026-11-16.xlsx"')).toBe("sotuv_2026-11-16.xlsx");
    expect(contentDispositionFileName("attachment; filename=sotuv_2026-11-16.xlsx")).toBe("sotuv_2026-11-16.xlsx");
    expect(contentDispositionFileName("attachment; filename*=UTF-8''sotuv%20noyabr.xlsx")).toBe("sotuv noyabr.xlsx");
  });

  it("nom yo'q — `null` (chaqiruvchi o'z nomini qo'yadi)", () => {
    expect(contentDispositionFileName("attachment")).toBeNull();
    expect(contentDispositionFileName(null)).toBeNull();
  });
});

describe("tarmoq uzilishi sessiyani yopmaydi", () => {
  const request = new Request("https://example.test/api/orders/");
  // Konstruktor `options` ni ishlatmaydi — test uchun bo'sh obyekt yetadi.
  const httpError = (status: number) => new HTTPError(new Response(null, { status }), request, {} as NormalizedOptions);

  it("token faqat `401` da yangilanadi — tarmoq xatosi va timeout'da yo'q", () => {
    expect(needsTokenRefresh(httpError(401))).toBe(true);
    expect(needsTokenRefresh(httpError(500))).toBe(false);
    expect(needsTokenRefresh(new NetworkError(request))).toBe(false);
    expect(needsTokenRefresh(new TimeoutError(request))).toBe(false);
  });

  it("refresh o'tmasa: tarmoq, timeout, `5xx` — sessiya qoladi; `4xx` va buzuq javob — tugaydi", () => {
    expect(refreshRejected(new NetworkError(request))).toBe(false);
    expect(refreshRejected(new TimeoutError(request))).toBe(false);
    expect(refreshRejected(httpError(502))).toBe(false);
    expect(refreshRejected(httpError(401))).toBe(true);
    expect(refreshRejected(httpError(400))).toBe(true);
    expect(refreshRejected(new Error("Refresh javobida access token yo'q"))).toBe(true);
  });
});
