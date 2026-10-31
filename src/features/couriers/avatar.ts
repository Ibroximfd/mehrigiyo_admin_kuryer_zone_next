import { resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import { asOptionalString, isRecord } from "@/lib/parse";

/**
 * Kuryer profil rasmi (`HUDUD_BACKEND_TALABLAR_3.md` §8).
 *
 * Server `avatar: {url, thumb_url, updated_at} | null` qaytaradi; eski
 * javobda oddiy satr (`"/media/…"`) bo'lishi mumkin — ikkalasi ham o'qiladi.
 * Rasm yo'q yoki yuklanmasa — ism bosh harflari va kuryer `id` sidan
 * hisoblangan barqaror rang (har safar bir xil).
 */

export type CourierAvatar = {
  /** Asl rasm (512 px). */
  url: string;
  /** Xarita markeri uchun kichik variant (96 px); bo'lmasa — asl rasm. */
  thumbUrl: string;
  updatedAt: Date | null;
};

/** `{url, thumb_url, updated_at}` · `"url"` · `null` → `CourierAvatar | null`. */
export function mapCourierAvatar(raw: unknown): CourierAvatar | null {
  if (typeof raw === "string") {
    const url = safeImageUrl(raw);
    return url ? { url, thumbUrl: url, updatedAt: null } : null;
  }
  if (!isRecord(raw)) return null;
  const url = safeImageUrl(asOptionalString(raw.url));
  const thumb = safeImageUrl(asOptionalString(raw.thumb_url));
  const main = url ?? thumb;
  if (!main) return null;
  return {
    url: main,
    thumbUrl: thumb ?? main,
    updatedAt: parseDate(asOptionalString(raw.updated_at)),
  };
}

/**
 * Faqat `http(s)` yoki nisbiy media yo'li — `javascript:` kabi sxemalar
 * marker HTML'iga tushmasin. Nisbiy yo'l backend hostiga bog'lanadi.
 */
function safeImageUrl(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:/i.test(value)) return null;
  return resolveMediaUrl(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rasm o'rnidagi belgi
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// WS `courier_updated {courier_id, avatar}`
// ─────────────────────────────────────────────────────────────────────────────
