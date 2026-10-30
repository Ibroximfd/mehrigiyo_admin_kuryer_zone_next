import ky, { isHTTPError, isTimeoutError } from "ky";

import { API_BASE_URL, ENDPOINTS, isAuthEndpoint } from "@/lib/api-constants";
import { localeInfo } from "@/lib/i18n/locale";
import { sessionStorage } from "@/lib/session-storage";
import { currentLocale } from "@/stores/locale-store";

/**
 * Tarmoq qatlami — `core/network/api_client.dart` va `dio_interceptor.dart`
 * ning ko'chirmasi.
 *
 *  1. Har bir so'rovga `Authorization: Bearer <access>` qo'shadi.
 *  2. 401 kelganda tokenni bir marta yangilab, so'rovni qayta yuboradi.
 *  3. Refresh ham rad etilsa — sessiyani tugatadi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Xatolik turi
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status?: number;
  readonly data?: unknown;
  /**
   * Backendning mashina o'qiydigan xato kodi (`price_increase_forbidden`,
   * `gift_not_available`, ...). Matn o'zgarishi mumkin, kod — yo'q,
   * shuning uchun shoxlanish shu bo'yicha qilinadi.
   */
  readonly code?: string;

  constructor(
    message: string,
    status?: number,
    data?: unknown,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

/** Xato kodini javobdan ajratadi. */
export function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? (error.code ?? null) : null;
}

/** Qaysi input aybdor ekani: `{items: ["2-qator"]}`. */
export function errorFields(error: unknown): Record<string, string[]> {
  if (!(error instanceof ApiError) || !error.data) return {};
  const fields = (error.data as Record<string, unknown>).fields;
  if (!fields || typeof fields !== "object") return {};

  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) result[key] = value.map(String);
    else if (typeof value === "string") result[key] = [value];
  }
  return result;
}

/**
 * `fields` ni xom holida beradi.
 *
 * `errorFields()` faqat matn va massivlarni qaytaradi — u forma maydonlarini
 * belgilash uchun. Ba'zi xatolarda esa `fields` ichida raqam yoki obyekt
 * bo'ladi (masalan `lead_phone_taken` da `lead_id: 128`), shuning uchun
 * kontekst kerak bo'lganda shu funksiya ishlatiladi.
 */
export function errorFieldsRaw(error: unknown): Record<string, unknown> {
  if (!(error instanceof ApiError) || !error.data) return {};
  const fields = (error.data as Record<string, unknown>).fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  return fields as Record<string, unknown>;
}

/**
 * Backend xatolik javobidan odam o'qiy oladigan xabarni ajratadi.
 * DRF validatsiya xatolari `{field: ["xabar"]}` ko'rinishida keladi —
 * ularning hammasini yig'ib chiqaramiz.
 */
function extractMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    // Nginx/Django xatolik sahifasi HTML qaytaradi — uni operatorga
    // ko'rsatib bo'lmaydi, tushunarli zaxira matn afzal.
    return data.trimStart().startsWith("<") ? fallback : data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    for (const key of ["detail", "message", "error", "non_field_errors"]) {
      const value = record[key];
      if (typeof value === "string" && value) return value;
      if (Array.isArray(value) && value.length) return String(value[0]);
    }

    // Maydonlar bo'yicha validatsiya xatolari — tekis yoki `fields{}` ichida
    // (`409 phone_taken`: `fields.phone` — raqam kimda band).
    const parts: string[] = [];
    const fields = record.fields;
    const sources =
      fields && typeof fields === "object" && !Array.isArray(fields)
        ? [...Object.values(record), ...Object.values(fields)]
        : Object.values(record);
    for (const value of sources) {
      if (typeof value === "string" && value) parts.push(value);
      else if (Array.isArray(value)) parts.push(...value.map(String));
    }
    if (parts.length) return parts.join("\n");
  }

  return fallback;
}

/**
 * Status kodiga qarab xabar — faqat tanada foydali matn bo'lmagan holatlar.
 *
 * `413` — so'rov Django'ga umuman yetib bormagan: yo'ldagi nginx
 * (bizniki yoki backendniki) fayl chegarasidan katta tanani HTML sahifa
 * bilan rad etadi. Undan `extractMessage` hech narsa chiqara olmaydi va
 * operator "Fayl yuborishda xatolik" degan umumiy matnni ko'rardi —
 * sababi esa fayl hajmi.
 */
function messageForStatus(
  status: number,
  data: unknown,
  fallback: string,
): string {
  if (status === 413) {
    return "Fayl juda katta — server qabul qilmadi. Kichikroq fayl yuboring.";
  }
  return extractMessage(data, fallback);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessiya tugaganini bildirish
// ─────────────────────────────────────────────────────────────────────────────

let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(callback: (() => void) | null) {
  onSessionExpired = callback;
}

function endSession() {
  sessionStorage.clear();
  onSessionExpired?.();
}

// ─────────────────────────────────────────────────────────────────────────────
// Token yangilash (bir vaqtda faqat bitta so'rov ketadi)
// ─────────────────────────────────────────────────────────────────────────────

const bareClient = ky.create({
  prefix: API_BASE_URL,
  timeout: 30_000,
  retry: 0,
});

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const payload = await bareClient
    .post(ENDPOINTS.refresh, { json: { refresh: sessionStorage.refreshToken } })
    .json<{ access?: string; refresh?: string }>();

  if (!payload.access) throw new Error("Refresh javobida access token yo'q");

  sessionStorage.saveTokens({
    access: payload.access,
    refresh: payload.refresh ?? null,
  });
  return payload.access;
}

async function obtainFreshToken(usedAuthHeader: string | null): Promise<string> {
  // Boshqa so'rov allaqachon yangilab ulgurgan bo'lishi mumkin.
  const current = sessionStorage.accessToken;
  if (current && usedAuthHeader !== `Bearer ${current}`) return current;

  try {
    refreshInFlight ??= refreshAccessToken();
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Til
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mobil ilova bilan bir xil shartnoma: `X-Lang: <SupportedLocale.id>`
 * (`ru` | `uz` | `uz-Cyrl`). `/api` bir xil origin orqali proksilanadi,
 * ya'ni qo'shimcha sarlavha CORS preflight talab qilmaydi.
 */
const LANGUAGE_HEADER = "X-Lang";

function apiLanguage(): string {
  return localeInfo(currentLocale()).apiLang;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asosiy klient
// ─────────────────────────────────────────────────────────────────────────────

const client = ky.create({
  prefix: API_BASE_URL,
  timeout: 30_000,
  headers: { Accept: "application/json" },

  retry: {
    limit: 1,
    statusCodes: [401],
    methods: ["get", "post", "put", "patch", "delete", "head"],
    delay: () => 0,
  },

  hooks: {
    beforeRequest: [
      ({ request }) => {
        // Backend matnlari (xato, status nomi) tanlangan tilda kelsin.
        request.headers.set(LANGUAGE_HEADER, apiLanguage());
        const token = sessionStorage.accessToken;
        const path = new URL(request.url).pathname;
        if (token && !isAuthEndpoint(path)) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],

    beforeRetry: [
      async ({ request, error }) => {
        const path = new URL(request.url).pathname;

        // Login/refresh'dan kelgan 401 — noto'g'ri parol yoki o'lik refresh
        // token, ya'ni token yangilash bilan hal bo'lmaydi.
        if (isAuthEndpoint(path)) throw error;
        if (!sessionStorage.canRefresh) {
          endSession();
          throw error;
        }

        try {
          const access = await obtainFreshToken(
            request.headers.get("Authorization"),
          );
          request.headers.set("Authorization", `Bearer ${access}`);
        } catch (refreshError) {
          // Tarmoq uzilishi sessiyani o'ldirmaydi — faqat backend rad etsa.
          if (isHTTPError(refreshError) || !isTimeoutError(refreshError)) {
            endSession();
          }
          throw error;
        }
      },
    ],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Qulay o'ramlar
// ─────────────────────────────────────────────────────────────────────────────

export type QueryValue = string | number | boolean | null | undefined;

function toSearchParams(params?: Record<string, QueryValue>) {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  ) as Array<[string, string | number | boolean]>;
  return entries.length ? Object.fromEntries(entries) : undefined;
}

type RequestOptions = {
  searchParams?: Record<string, QueryValue>;
  json?: unknown;
  /** Fayl yuborish uchun — `Content-Type` ni brauzer o'zi qo'yadi. */
  body?: FormData;
  signal?: AbortSignal;
  fallbackError?: string;
};

async function request<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    searchParams,
    json,
    body,
    signal,
    fallbackError = "Server xatosi yuz berdi",
  } = options;

  try {
    const response = await client(path, {
      method,
      searchParams: toSearchParams(searchParams),
      ...(json === undefined ? {} : { json }),
      ...(body === undefined ? {} : { body }),
      ...(signal ? { signal } : {}),
    });

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } catch (error) {
    if (isHTTPError(error)) {
      const payload = error.data as Record<string, unknown> | undefined;
      throw new ApiError(
        messageForStatus(error.response.status, error.data, fallbackError),
        error.response.status,
        error.data,
        typeof payload?.code === "string" ? payload.code : undefined,
      );
    }
    if (isTimeoutError(error)) {
      throw new ApiError("So'rov vaqti tugadi. Qaytadan urinib ko'ring.");
    }
    // So'rov bekor qilingan bo'lsa (yangi filtr), uni yuqoriga o'tkazamiz —
    // TanStack Query buni xatolik deb ko'rsatmasligi kerak.
    if (error instanceof DOMException && error.name === "AbortError") throw error;

    throw new ApiError("Tarmoq xatosi. Internetingizni tekshiring.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fayl yuklash — jarayon bilan
// ─────────────────────────────────────────────────────────────────────────────

export type UploadOptions = {
  /** Yuklangan ulush, 0..1 — pufakdagi halqa shundan chiziladi. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  fallbackError?: string;
};

/**
 * Yuklash uchun vaqt chegarasi.
 *
 * Oddiy so'rovlardagi 30 soniya fayl uchun yaramaydi: 50 MB video sekin
 * mobil tarmoqda bir necha daqiqa ketadi va ilgari u "So'rov vaqti
 * tugadi" bilan yiqilardi — operator esa buni "video yuborilmaydi" deb
 * o'qirdi.
 */
const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

type RawResponse = { status: number; text: string };

function joinApiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function abortError(): DOMException {
  return new DOMException("Yuklash bekor qilindi", "AbortError");
}

/**
 * Bitta urinish. `fetch` (ya'ni ky) yuklash jarayonini bermaydi —
 * `XMLHttpRequest.upload.onprogress` bu ishni qiladigan yagona brauzer
 * API'si, shuning uchun fayl shu yo'ldan ketadi.
 */
function performUpload(
  path: string,
  body: FormData,
  token: string | null,
  options: UploadOptions,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", joinApiUrl(path));
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader(LANGUAGE_HEADER, apiLanguage());
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(event.loaded / event.total);
      }
    };
    xhr.onload = () =>
      resolve({ status: xhr.status, text: xhr.responseText ?? "" });
    xhr.onerror = () =>
      reject(new ApiError("Tarmoq xatosi. Internetingizni tekshiring."));
    xhr.ontimeout = () =>
      reject(new ApiError("Yuklash vaqti tugadi. Qaytadan urinib ko'ring."));
    xhr.onabort = () => reject(abortError());

    options.signal?.addEventListener("abort", () => xhr.abort(), {
      once: true,
    });

    xhr.send(body);
  });
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * `multipart/form-data` yuboradi va jarayonni qaytarib turadi.
 *
 * Token qoidasi asosiy klient bilan bir xil: `401` kelsa token bir marta
 * yangilanadi va o'sha `FormData` qayta yuboriladi; refresh ham rad etilsa
 * sessiya tugatiladi.
 */
async function upload<T>(
  path: string,
  body: FormData,
  options: UploadOptions = {},
): Promise<T> {
  const { fallbackError = "Fayl yuborishda xatolik" } = options;

  let token = sessionStorage.accessToken;
  let response = await performUpload(path, body, token, options);

  if (response.status === 401 && !isAuthEndpoint(path)) {
    if (!sessionStorage.canRefresh) {
      endSession();
      throw new ApiError("Sessiya tugadi. Qaytadan kiring.", 401);
    }
    try {
      token = await obtainFreshToken(token ? `Bearer ${token}` : null);
    } catch (refreshError) {
      if (isHTTPError(refreshError) || !isTimeoutError(refreshError)) {
        endSession();
      }
      throw new ApiError("Sessiya tugadi. Qaytadan kiring.", 401);
    }
    response = await performUpload(path, body, token, options);
  }

  const data = parseBody(response.text);
  if (response.status >= 200 && response.status < 300) return data as T;

  const payload = data as Record<string, unknown> | undefined;
  throw new ApiError(
    messageForStatus(response.status, data, fallbackError),
    response.status,
    data,
    typeof payload?.code === "string" ? payload.code : undefined,
  );
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "json" | "body">) =>
    request<T>("get", path, options),
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>("post", path, options),
  put: <T>(path: string, options?: RequestOptions) =>
    request<T>("put", path, options),
  patch: <T>(path: string, options?: RequestOptions) =>
    request<T>("patch", path, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("delete", path, options),
  /** Fayl yuklash — jarayon va bekor qilish bilan (`UploadOptions`). */
  upload: <T>(path: string, body: FormData, options?: UploadOptions) =>
    upload<T>(path, body, options),
};

export function errorMessage(error: unknown, fallback = "Xatolik yuz berdi") {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
