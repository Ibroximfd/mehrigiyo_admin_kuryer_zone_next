import { z } from "zod";

/**
 * Ilovaning yagona xato tili.
 *
 * Backend hamma joyda `{code, detail, fields?}` qaytaradi. Transport
 * tafsiloti (status, ky istisnosi) shu yerda bir marta `AppError` ga
 * o'giriladi — UI hech qachon `status === 409` ni tekshirmaydi, `kind` va
 * `code` bo'yicha shoxlanadi.
 */
export type AppErrorKind =
  | "offline"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "server"
  | "parse"
  | "unknown";

export type FieldErrors = Readonly<Record<string, readonly string[]>>;

type AppErrorInit = {
  kind: AppErrorKind;
  status?: number | null;
  code?: string | null;
  detail?: string | null;
  fields?: FieldErrors;
};

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status: number | null;
  /** Mashina o'qiydigan kod (`phone_taken`, `district_in_zone`…). */
  readonly code: string | null;
  /** Server bergan odam o'qiydigan matn (bo'lsa). */
  readonly detail: string | null;
  readonly fields: FieldErrors;

  constructor({ kind, status = null, code = null, detail = null, fields = {} }: AppErrorInit) {
    super(detail ?? code ?? kind);
    this.name = "AppError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fields = fields;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorKindForStatus(status: number): AppErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status >= 500) return "server";
  return "unknown";
}

/** Backend #28: admin bo'lmagan token bilan `/api/admin/…` → `403 {code: "forbidden", detail: "Faqat admin uchun"}`. */
export const FORBIDDEN_CODE = "forbidden";

/**
 * "Admin emas" — butun panel yopiladigan yagona holat: aynan `403` +
 * `code: "forbidden"` + admin yo'li. Boshqa kodli (yoki kodsiz) 403 joyida
 * oddiy xato bo'lib ko'rsatiladi — masalan, proksi rad etishi.
 */
export function isNotAdminError(error: AppError, path: string): boolean {
  return error.status === 403 && error.code === FORBIDDEN_CODE && path.startsWith("admin/");
}

// ─────────────────────────────────────────────────────────────────────────
// Xato tanasi
// ─────────────────────────────────────────────────────────────────────────

/**
 * `fields` qiymati har xil keladi: `["Majburiy"]`, `"Majburiy"`, `[7]` yoki
 * ichma-ich obyekt. Hammasi satrlar ro'yxatiga keltiriladi — forma faqat
 * matn ko'rsatadi (409 `district_in_zone`: `{district: [code], zone_id: [7]}`).
 */
function toMessages(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(toMessages);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) =>
      toMessages(inner).map((message) => `${key}: ${message}`),
    );
  }
  return [];
}

const RESERVED_KEYS = new Set(["code", "detail", "fields", "message", "error"]);

const errorBodySchema = z
  .object({
    code: z.string().nullish(),
    detail: z.unknown().optional(),
    message: z.unknown().optional(),
    fields: z.record(z.string(), z.unknown()).nullish(),
  })
  .passthrough();

export type ParsedErrorBody = {
  code: string | null;
  detail: string | null;
  fields: FieldErrors;
};

/** Har qanday xato tanasini `{code, detail, fields}` ga keltiradi; yiqilmaydi. */
export function parseErrorBody(body: unknown): ParsedErrorBody {
  const empty: ParsedErrorBody = { code: null, detail: null, fields: {} };
  if (typeof body === "string") {
    // Nginx/Django HTML sahifasini foydalanuvchiga ko'rsatib bo'lmaydi.
    const text = body.trim();
    return text && !text.startsWith("<") ? { ...empty, detail: text } : empty;
  }

  const parsed = errorBodySchema.safeParse(body);
  if (!parsed.success) return empty;

  const { code, detail, message, fields } = parsed.data;
  const detailText = toMessages(detail ?? message)[0] ?? null;

  // DRF ba'zan maydon xatolarini tekis beradi: `{name_uz: ["Majburiy"]}`.
  const flat = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => !RESERVED_KEYS.has(key)),
  );
  const source = fields ?? flat;
  const normalized: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(source)) {
    const messages = toMessages(value);
    if (messages.length > 0) normalized[key] = messages;
  }

  return { code: code ?? null, detail: detailText, fields: normalized };
}

export function appErrorFromResponse(status: number, body: unknown): AppError {
  const { code, detail, fields } = parseErrorBody(body);
  return new AppError({ kind: errorKindForStatus(status), status, code, detail, fields });
}

// ─────────────────────────────────────────────────────────────────────────
// Forma maydonlariga xaritalash
// ─────────────────────────────────────────────────────────────────────────

export type FieldErrorMapping<F extends string> = {
  /** Formada mavjud maydonlarga tushgan xatolar. */
  fields: Array<{ name: F; message: string }>;
  /** Formada joyi yo'q xabarlar — umumiy xato sifatida ko'rsatiladi. */
  rest: string[];
};

/**
 * Server `fields` ini forma maydonlariga ajratadi.
 *
 * `aliases` — server nomi formadagidan farq qilsa (`cash_point.filial_id`
 * → `cashPoint`). Noma'lum maydon xabari yo'qolmaydi, `rest` ga tushadi.
 */
export function mapFieldErrors<F extends string>(
  error: unknown,
  known: readonly F[],
  aliases: Readonly<Record<string, F>> = {},
): FieldErrorMapping<F> {
  const result: FieldErrorMapping<F> = { fields: [], rest: [] };
  if (!isAppError(error)) return result;

  for (const [serverName, messages] of Object.entries(error.fields)) {
    const root = serverName.split(".")[0] ?? serverName;
    const name =
      aliases[serverName] ?? aliases[root] ?? known.find((field) => field === root) ?? null;
    const message = messages.join(" ");
    if (name) result.fields.push({ name, message });
    else result.rest.push(message);
  }
  return result;
}
