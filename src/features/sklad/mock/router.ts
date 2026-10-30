import { ApiError } from "@/lib/api-client";

/**
 * Brauzer ichidagi soxta server — yo'l naqshlari bo'yicha ishlovchilar.
 * Faqat `NEXT_PUBLIC_SKLAD_MOCK=1` da dinamik yuklanadi, production
 * to'plamiga tushmaydi. Javoblar shartnomadagi JSON'ni AYNAN qaytaradi.
 */
export type Method = "get" | "post" | "put" | "patch" | "delete";

export type MockQuery = Record<string, string>;

export type MockContext = {
  params: Record<string, string>;
  query: MockQuery;
  json: unknown;
};

type Handler = (ctx: MockContext) => unknown;

const routes: Array<{ method: Method; parts: string[]; handler: Handler }> = [];

function split(path: string): string[] {
  return path.split("?")[0]!.split("/").filter(Boolean);
}

/** `"/sklad/items/:id/pin/"` — `:nom` qismlar `params` ga tushadi. */
export function route(method: Method, pattern: string, handler: Handler) {
  routes.push({ method, parts: split(pattern), handler });
}

/** Shartnoma xatosi `{code, detail, ...}` — `ApiError` sifatida uloqtiriladi. */
export function fail(
  status: number,
  code: string,
  detail: string,
  extra: Record<string, unknown> = {},
): never {
  throw new ApiError(detail, status, { code, detail, ...extra }, code);
}

/** Tarmoq kechikishini sezdiradigan kichik pauza (skeletonlar ko'rinsin). */
const latency = () => new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));

export async function dispatch(
  method: Method,
  path: string,
  options: { searchParams?: Record<string, unknown>; json?: unknown },
): Promise<unknown> {
  const parts = split(path);
  for (const candidate of routes) {
    if (candidate.method !== method || candidate.parts.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const matched = candidate.parts.every((part, index) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = parts[index]!;
        return true;
      }
      return part === parts[index];
    });
    if (!matched) continue;

    const query: MockQuery = {};
    for (const [key, value] of Object.entries(options.searchParams ?? {})) {
      if (value !== undefined && value !== null && value !== "") query[key] = String(value);
    }
    await latency();
    return candidate.handler({ params, query, json: options.json });
  }
  // Marshrutsiz 404 — `isEndpointMissing` tanishi uchun kodsiz.
  throw new ApiError(`Mock: ${method.toUpperCase()} ${path} yo'q`, 404);
}
