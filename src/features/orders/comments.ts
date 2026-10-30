import { api } from "@/lib/api-client";
import {
  isEndpointMissing,
  isKnownMissing,
  markEndpointMissing,
} from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import { asPage } from "@/lib/paginate";
import { asRecord, asString } from "@/lib/parse";

/**
 * Buyurtma izohlari — logistlarning o'zaro yozishmasi (§4.10).
 *
 * Nega kerak: bir vaqtda bir necha logist (har biri o'z profili bilan) bitta
 * ma'lumot ustida ishlaydi. Har izoh **muallif nomi** va vaqt bilan yoziladi —
 * "buni kim qildi, mijoz bilan kim gaplashdi" degan chalkashlik yo'qoladi.
 *
 * Muallifni **server** yozadi (token egasi), shuning uchun POST tanasida
 * faqat `text` ketadi — kontrakt shundan iborat va begona maydon yubormaslik
 * eng xavfsiz yo'l.
 *
 * Saqlash ikki qavatli:
 *   1. Backend endpointi — filialning barcha qurilmalari o'rtasida sinxron.
 *      Marshrut yo'q bo'lsa 404 (kodsiz) keladi.
 *   2. Zaxira: `localStorage` — izohlar shu qurilmada qoladi va `local`
 *      belgisi bilan ko'rsatiladi. Bitta kompyuterda smenali ishlovchi ikki
 *      logist uchun bu allaqachon to'liq yechim.
 *
 * Eski lokal izohlar o'chirilmaydi — ular ro'yxatda "shu qurilmada" belgisi
 * bilan qoladi, yangilari serverga yoziladi.
 */
export type OrderComment = {
  id: string;
  author: string;
  text: string;
  createdAt: Date | null;
  /** Faqat shu qurilmada saqlangan (backend hali yo'q paytda yozilgan). */
  local: boolean;
};

const MISSING_COMMENTS = "logist-order-comments";

function commentsPath(orderId: string): string {
  return ENDPOINTS.logistOrderComments(orderId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lokal qavat
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_KEY = (orderId: string) => `logist_comments_${orderId}`;

type StoredComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

function readLocal(orderId: string): OrderComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY(orderId));
    if (!raw) return [];
    const list = JSON.parse(raw) as StoredComment[];
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      id: String(item.id),
      author: String(item.author ?? ""),
      text: String(item.text ?? ""),
      createdAt: parseDate(item.createdAt),
      local: true,
    }));
  } catch {
    return [];
  }
}

function writeLocal(orderId: string, comment: StoredComment) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY(orderId));
    const list = raw ? (JSON.parse(raw) as StoredComment[]) : [];
    list.push(comment);
    window.localStorage.setItem(LOCAL_KEY(orderId), JSON.stringify(list));
  } catch {
    // localStorage to'lgan/yopiq bo'lsa — izoh faqat ekranda qoladi.
  }
}

function newLocalId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish / yozish
// ─────────────────────────────────────────────────────────────────────────────

function mapComment(raw: unknown): OrderComment {
  const json = asRecord(raw);
  return {
    id: asString(json.id),
    author: asString(json.author ?? json.author_name ?? json.by),
    text: asString(json.text ?? json.comment ?? json.body ?? json.content ?? json.message),
    createdAt: parseDate(json.created_at),
    local: false,
  };
}

/** Eng eskisi birinchi — yozishma tepadan pastga o'qiladi. */
function sortComments(list: OrderComment[]): OrderComment[] {
  return [...list].sort(
    (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
}

export async function fetchOrderComments(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderComment[]> {
  const local = readLocal(orderId);

  if (isKnownMissing(MISSING_COMMENTS)) return sortComments(local);

  try {
    const raw = await api.get<unknown>(commentsPath(orderId), {
      signal,
      fallbackError: "Izohlarni yuklashda xatolik",
    });
    const server = asPage(raw).items.map(mapComment);
    return sortComments([...server, ...local]);
  } catch (error) {
    if (isEndpointMissing(error)) {
      markEndpointMissing(MISSING_COMMENTS);
      return sortComments(local);
    }
    throw error;
  }
}

export async function addOrderComment(
  orderId: string,
  input: { author: string; text: string },
): Promise<OrderComment> {
  const author = input.author.trim();
  const text = input.text.trim();

  if (!isKnownMissing(MISSING_COMMENTS)) {
    try {
      // Kontrakt: faqat `text`. `author` — token egasi, server o'zi yozadi.
      const raw = await api.post<unknown>(commentsPath(orderId), {
        json: { text },
        fallbackError: "Izoh yozishda xatolik",
      });
      const created = mapComment(raw);
      // Server muallifni qaytarmasa ekranda bo'sh nom turmasin.
      return created.author ? created : { ...created, author };
    } catch (error) {
      if (!isEndpointMissing(error)) throw error;
      markEndpointMissing(MISSING_COMMENTS);
    }
  }

  // Zaxira: qurilmaning o'zida saqlaymiz.
  const stored: StoredComment = {
    id: newLocalId(),
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  writeLocal(orderId, stored);
  return {
    id: stored.id,
    author,
    text,
    createdAt: new Date(stored.createdAt),
    local: true,
  };
}
