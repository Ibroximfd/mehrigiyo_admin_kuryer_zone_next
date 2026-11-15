import { ApiError } from "@/lib/api-client";

/** Server qabul qiladigan eng qisqa parol (hujjat 67). */
export const PASSWORD_MIN_LENGTH = 6;

/**
 * Parol maydoni xatosi. `optional` — bo'sh qoldirish mumkin (kuryerga parol
 * qo'yishda bo'sh yuborilsa server o'zi 8 belgili parol yasaydi).
 */
export function passwordError(value: string, { optional = false }: { optional?: boolean } = {}): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return optional ? null : "Parolni kiriting";
  if (trimmed.length < PASSWORD_MIN_LENGTH) return `Parol kamida ${PASSWORD_MIN_LENGTH} belgi bo'lsin`;
  return null;
}

/** Ekranda parol o'rniga turadigan belgi — uzunligi ham sir. */
export const MASKED_SECRET = "••••••";

/**
 * Serverning maydon xatosi: `400 validation_error` → `fields.<name>` yoki
 * DRF uslubida tekis `{<name>: ["…"]}`. Yo'q bo'lsa `null`.
 */
export function apiFieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== "object") return null;
  const record = error.data as Record<string, unknown>;
  const fields = record.fields && typeof record.fields === "object" ? (record.fields as Record<string, unknown>) : {};
  const value = fields[field] ?? record[field];
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value) && value.length) return String(value[0]);
  return null;
}
