import { resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import { asOptionalInt, asOptionalString, isRecord } from "@/lib/parse";

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

/** Palitradagi ranglar soni — `globals.css` `[data-avatar-hue]` bilan bir xil. */
export const AVATAR_HUE_COUNT = 8;

/** Kuryer `id` → palitra indeksi (0…7): bir kuryer har doim bir rangda. */
export function avatarHue(id: number): number {
  // Knuth multiplikativ xeshi — ketma-ket id lar qo'shni ranglarga tushmaydi.
  const hash = Math.imul(Math.trunc(Math.abs(id)), 2654435761) >>> 0;
  return hash % AVATAR_HUE_COUNT;
}

/** `Aziz Karimov` → `AK`; ism bo'lmasa `K` (kuryer). */
export function avatarInitials(fullName: string): string {
  const letters = (fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "K";
}

/** Xarita yorlig'i: `Aziz Karimov` → `Aziz K.`; bitta so'z — o'zi. */
export function shortName(fullName: string): string {
  const parts = (fullName ?? "").split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "";
  const last = parts[1];
  return last ? `${first} ${last[0]?.toUpperCase() ?? ""}.` : first;
}

// ─────────────────────────────────────────────────────────────────────────────
// WS `courier_updated {courier_id, avatar}`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `avatar` kaliti bo'lmasa — `hasAvatar: false` (boshqa maydon o'zgargan,
 * chaqiruvchi ro'yxatni qayta so'raydi).
 */
export type CourierUpdatedEvent = {
  courierId: number;
  hasAvatar: boolean;
  avatar: CourierAvatar | null;
};

export function mapCourierUpdatedEvent(raw: unknown): CourierUpdatedEvent | null {
  if (!isRecord(raw)) return null;
  const courierId = asOptionalInt(raw.courier_id ?? raw.id);
  if (courierId === null) return null;
  const hasAvatar = Object.prototype.hasOwnProperty.call(raw, "avatar");
  return {
    courierId,
    hasAvatar,
    avatar: hasAvatar ? mapCourierAvatar(raw.avatar) : null,
  };
}
