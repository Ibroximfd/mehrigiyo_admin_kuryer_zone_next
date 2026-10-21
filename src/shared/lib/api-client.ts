import ky, { isHTTPError, isTimeoutError } from "ky";
import { z } from "zod";

import { env } from "@/shared/config/env";

import { AppError, appErrorFromResponse, isAppError, isNotAdminError } from "./app-error";
import { sessionStorage } from "./session-storage";

/**
 * Tarmoq qatlami (logist saytidagi `lib/api-client.ts` dan moslashtirilgan):
 *
 *  1. Har so'rovga `Authorization: Bearer <access>` qo'shadi.
 *  2. 401 kelsa tokenni BIR marta yangilab (`/api/token/refresh/`), so'rovni
 *     qayta yuboradi. Refresh ham rad etilsa — sessiya tugaydi.
 *  3. 403 `forbidden` (`/api/admin/…`) — foydalanuvchi admin emas: alohida ekran.
 *     Tokensiz so'rov → 401 `not_authenticated` → refresh yo'q → sessiya tugaydi.
 *  4. Har javob zod sxemasi bilan tekshiriladi; shartnoma buzilsa xato shu
 *     yerda o'qiladigan holda chiqadi, jadval ichida `undefined` bo'lib emas.
 */

export const AUTH_PATHS = {
  login: "admin/login/",
  refresh: "token/refresh/",
} as const;

function isAuthPath(url: string): boolean {
  const { pathname } = new URL(url);
  return Object.values(AUTH_PATHS).some((path) => pathname.endsWith(`/${path}`));
}

// ─────────────────────────────────────────────────────────────────────────
// Sessiya hodisalari (auth feature obuna bo'ladi)
// ─────────────────────────────────────────────────────────────────────────

type SessionHandlers = {
  onExpired?: () => void;
  onForbidden?: () => void;
};

let handlers: SessionHandlers = {};

export function setSessionHandlers(next: SessionHandlers): void {
  handlers = next;
}

function endSession(): void {
  sessionStorage.clear();
  handlers.onExpired?.();
}

// ─────────────────────────────────────────────────────────────────────────
// Til — backend xato matnlarini tanlangan tilda qaytarsin
// ─────────────────────────────────────────────────────────────────────────

let languageHeader = "uz";

export function setApiLanguage(language: string): void {
  languageHeader = language;
}

// ─────────────────────────────────────────────────────────────────────────
// Token yangilash — bir vaqtda faqat bitta so'rov
// ─────────────────────────────────────────────────────────────────────────

const refreshResponseSchema = z.object({
  access: z.string().min(1),
  refresh: z.string().nullish(),
});

const bareClient = ky.create({ prefix: env.apiBaseUrl, timeout: 20_000, retry: 0 });

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const json = await bareClient
    .post(AUTH_PATHS.refresh, { json: { refresh: sessionStorage.refreshToken } })
    .json();
  const tokens = refreshResponseSchema.parse(json);
  sessionStorage.saveTokens(tokens.access, tokens.refresh ?? null);
  return tokens.access;
}

async function obtainFreshToken(usedAuthHeader: string | null): Promise<string> {
  // Parallel so'rov allaqachon yangilab ulgurgan bo'lishi mumkin.
  const current = sessionStorage.accessToken;
  if (current && usedAuthHeader !== `Bearer ${current}`) return current;

  try {
    refreshInFlight ??= refreshAccessToken();
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Asosiy klient
// ─────────────────────────────────────────────────────────────────────────

const client = ky.create({
  prefix: env.apiBaseUrl,
  timeout: 30_000,
  headers: { Accept: "application/json" },
  // Faqat 401 qayta yuboriladi (token yangilangach). Yozuvlar boshqa sabab
  // bilan qayta yuborilmaydi — ular idempotent emas.
  retry: {
    limit: 1,
    statusCodes: [401],
    methods: ["get", "post", "patch", "put", "delete"],
    delay: () => 0,
  },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        request.headers.set("X-Lang", languageHeader);
        const token = sessionStorage.accessToken;
        if (token && !isAuthPath(request.url)) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    beforeRetry: [
      async ({ request, error }) => {
        // Login/refresh dan 401 — noto'g'ri parol yoki o'lik refresh token.
        if (isAuthPath(request.url)) throw error;
        if (!sessionStorage.refreshToken) {
          endSession();
          throw error;
        }
        try {
          const access = await obtainFreshToken(request.headers.get("Authorization"));
          request.headers.set("Authorization", `Bearer ${access}`);
        } catch (refreshError) {
          // Tarmoq uzilishi sessiyani o'ldirmaydi — faqat backend rad etsa.
          if (!isTimeoutError(refreshError)) endSession();
          throw error;
        }
      },
    ],
  },
});

// ─────────────────────────────────────────────────────────────────────────
// So'rov o'rami
// ─────────────────────────────────────────────────────────────────────────

export type QueryValue = string | number | boolean | null | undefined;

function toSearchParams(params?: Record<string, QueryValue>): Record<string, string> | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params).flatMap(([key, value]) =>
    value === undefined || value === null || value === "" ? [] : [[key, String(value)] as const],
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

type RequestOptions<S extends z.ZodType> = {
  schema: S;
  searchParams?: Record<string, QueryValue>;
  json?: unknown;
  signal?: AbortSignal;
};

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function toAppError(error: unknown, path: string): Promise<AppError> {
  if (isAppError(error)) return error;
  if (isHTTPError(error)) {
    const appError = appErrorFromResponse(error.response.status, error.data);
    // Faqat "admin emas" holati butun panelni yopadi; boshqa 403 — joyida xato.
    if (isNotAdminError(appError, path)) handlers.onForbidden?.();
    return appError;
  }
  if (isTimeoutError(error)) return new AppError({ kind: "timeout" });
  if (error instanceof z.ZodError) {
    // Shartnoma buzilishi — dasturchi uchun konsolda aniq yo'l bilan qoladi.
    console.error(`[api] ${path}: javob shakli kutilmagan`, error.issues);
    return new AppError({ kind: "parse" });
  }
  return new AppError({ kind: isOffline() ? "offline" : "unknown" });
}

async function request<S extends z.ZodType>(
  method: "get" | "post" | "patch",
  path: string,
  { schema, searchParams, json, signal }: RequestOptions<S>,
): Promise<z.output<S>> {
  try {
    const response = await client(path, {
      method,
      searchParams: toSearchParams(searchParams),
      ...(json === undefined ? {} : { json }),
      ...(signal ? { signal } : {}),
    });
    const text = await response.text();
    return schema.parse(text ? JSON.parse(text) : null);
  } catch (error) {
    // Bekor qilingan so'rov (filtr o'zgardi) xato emas — TanStack Query o'zi biladi.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw await toAppError(error, path);
  }
}

export const api = {
  get: <S extends z.ZodType>(path: string, options: Omit<RequestOptions<S>, "json">) =>
    request("get", path, options),
  post: <S extends z.ZodType>(path: string, options: RequestOptions<S>) =>
    request("post", path, options),
  patch: <S extends z.ZodType>(path: string, options: RequestOptions<S>) =>
    request("patch", path, options),
};
