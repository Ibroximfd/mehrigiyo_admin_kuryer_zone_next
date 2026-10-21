import { isAppError, type AppErrorKind } from "@/shared/lib/app-error";

import type { Dictionary } from "./uz";

const KIND_KEYS: Record<AppErrorKind, keyof Dictionary["errors"]> = {
  offline: "offline",
  timeout: "timeout",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  "not-found": "notFound",
  conflict: "conflict",
  validation: "validation",
  server: "server",
  parse: "parse",
  unknown: "unknown",
};

/**
 * Xatoning foydalanuvchiga ko'rinadigan matni: server `detail` bergan bo'lsa
 * o'sha (u `X-Lang` bo'yicha tarjima qilingan), aks holda turiga qarab.
 */
export function describeError(error: unknown, t: Dictionary): string {
  if (!isAppError(error)) return t.errors.unknown;
  if (error.detail && error.kind !== "server" && error.kind !== "parse") return error.detail;
  return t.errors[KIND_KEYS[error.kind]];
}

/** Zod xato kaliti (`"required"`) → tarjima; noma'lum kalit — umumiy matn. */
export function validationMessage(t: Dictionary, key: string | undefined): string | undefined {
  if (!key) return undefined;
  const messages: Record<string, string> = t.validation;
  return messages[key] ?? key;
}
