import type { QueryClient } from "@tanstack/react-query";

import { api, errorFields } from "@/lib/api-client";
import { ENDPOINTS, resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import { asPage } from "@/lib/paginate";
import {
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
} from "@/lib/parse";
import { queryKeys } from "@/lib/query-keys";

/**
 * Buyurtma bo'yicha kuryer bilan chat (`KURYER_SAYTLAR_LOGIST_OPERATOR.md`
 * §2.5). Bitta lenta: matn, kuryerning ovozli xabari va tizim yozuvlari
 * ("yo'lga chiqdi", "yetkazdi"). `id` — butun va o'suvchi.
 */
export type CourierMessageRole = "courier" | "logist" | "system";

export type CourierMessageKind = "text" | "voice" | "image" | "file" | "system";

export type CourierMessage = {
  id: number;
  kind: CourierMessageKind;
  /** Matn yoki rasm/fayl izohi. */
  text: string;
  audioUrl: string | null;
  durationMs: number | null;
  /** `image`/`file`: fayl, rasmning kichik nusxasi (faylda yo'q bo'lishi mumkin). */
  url: string | null;
  thumb: string | null;
  fileName: string;
  fileSize: number | null;
  createdAt: Date | null;
  /** Qarshi tomon o'qigan payt ("✓✓"). */
  readAt: Date | null;
  authorName: string;
  role: CourierMessageRole;
  /** Tizim yozuvi hodisasi (`delivered`, `on_the_way`…). */
  event: string | null;
  photoCount: number;
};

const KINDS = new Set<string>(["text", "voice", "image", "file", "system"]);

export function mapCourierMessage(raw: unknown): CourierMessage {
  const json = asRecord(raw);
  const author = asRecord(json.author);
  const kind = asString(json.kind, "text");
  const role = asString(author.role);
  const audio = asOptionalString(json.audio_url);
  const url = asOptionalString(json.url);
  const thumb = asOptionalString(json.thumb);
  return {
    id: asInt(json.id),
    kind: KINDS.has(kind) ? (kind as CourierMessageKind) : "text",
    text: asString(json.text),
    audioUrl: audio ? resolveMediaUrl(audio) : null,
    durationMs: asOptionalInt(json.duration_ms),
    url: url ? resolveMediaUrl(url) : null,
    thumb: thumb ? resolveMediaUrl(thumb) : null,
    fileName: asString(json.name),
    fileSize: asOptionalInt(json.size),
    createdAt: parseDate(json.created_at),
    readAt: parseDate(json.read_at),
    authorName: asString(author.name),
    role:
      kind === "system" || role === "system"
        ? "system"
        : role === "courier"
          ? "courier"
          : "logist",
    event: asOptionalString(json.event),
    photoCount: asInt(json.photo_count),
  };
}

/** Ro'yxatga qo'shish: id bo'yicha almashtiradi, tartibni saqlaydi. */
export function mergeCourierMessages(
  current: CourierMessage[],
  incoming: CourierMessage[],
): CourierMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export async function fetchCourierMessages(
  orderId: string,
  signal?: AbortSignal,
): Promise<CourierMessage[]> {
  const raw = await api.get<unknown>(ENDPOINTS.logistOrderMessages(orderId), {
    signal,
    fallbackError: "Chatni yuklashda xatolik",
  });
  return mergeCourierMessages([], asPage(raw).items.map(mapCourierMessage));
}

export async function sendCourierMessage(
  orderId: string,
  text: string,
): Promise<CourierMessage> {
  const raw = await api.post<unknown>(ENDPOINTS.logistOrderMessages(orderId), {
    json: { kind: "text", text },
    fallbackError: "Xabarni yuborishda xatolik",
  });
  return mapCourierMessage(asRecord(raw).message ?? raw);
}

/**
 * Logist yuklashi chegaralari (§2.5 "Rasm, fayl va ovoz"). Rasm ham `file`
 * sifatida yuklanadi (5 MB gacha) va `image` xabari bo'lib ketadi —
 * backend `image` uchun `file` turidagi rasmni qabul qiladi.
 */
export const COURIER_UPLOAD_LIMITS = {
  voice: 2 * 1024 * 1024,
  file: 5 * 1024 * 1024,
} as const;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".xlsx"];

/** `<input accept>` uchun. */
export const COURIER_ATTACH_ACCEPT =
  ".pdf,.docx,.xlsx,.jpg,.jpeg,.png,image/jpeg,image/png";

export type AttachmentCheck =
  | { ok: true; kind: "image" | "file" }
  | { ok: false; error: string };

/** Fayl yuborilishidan oldin tekshiruv — server rad etadiganini oldindan aytadi. */
export function checkCourierAttachment(file: File): AttachmentCheck {
  const name = file.name.toLowerCase();
  const isImage = IMAGE_TYPES.has(file.type) || /\.(jpe?g|png)$/.test(name);
  const isDocument =
    DOCUMENT_TYPES.has(file.type) ||
    DOCUMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
  if (!isImage && !isDocument) {
    return {
      ok: false,
      error: "Bu turdagi fayl yuborilmaydi: PDF, Word, Excel yoki rasm (JPEG/PNG)",
    };
  }
  if (file.size > COURIER_UPLOAD_LIMITS.file) {
    return { ok: false, error: "Fayl juda katta — 5 MB gacha" };
  }
  return { ok: true, kind: isImage ? "image" : "file" };
}

/** `POST .../logist/uploads/` → `upload_id`. */
export async function uploadCourierChatFile(
  file: File,
  kind: "voice" | "file",
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("kind", kind);
  const raw = await api.upload<unknown>(ENDPOINTS.logistUploads, body, {
    onProgress,
    fallbackError: "Faylni yuklashda xatolik",
  });
  const json = asRecord(raw);
  const id = asString(json.upload_id ?? json.id);
  if (!id) throw new Error("Server yuklangan fayl id sini qaytarmadi");
  return id;
}

/** Ovozli xabar: avval yuklash, keyin xabar. */
export async function sendCourierVoice(
  orderId: string,
  file: File,
  durationMs: number,
): Promise<CourierMessage> {
  if (file.size > COURIER_UPLOAD_LIMITS.voice) {
    throw new Error("Ovozli xabar juda uzun — 2 MB gacha");
  }
  const uploadId = await uploadCourierChatFile(file, "voice");
  const raw = await api.post<unknown>(ENDPOINTS.logistOrderMessages(orderId), {
    json: { kind: "voice", audio_upload_id: uploadId, duration_ms: durationMs },
    fallbackError: "Ovozli xabarni yuborishda xatolik",
  });
  return mapCourierMessage(asRecord(raw).message ?? raw);
}

/** Rasm yoki hujjat: avval yuklash, keyin `image`/`file` xabari. */
export async function sendCourierAttachment(
  orderId: string,
  file: File,
  kind: "image" | "file",
  caption: string,
  onProgress?: (fraction: number) => void,
): Promise<CourierMessage> {
  const uploadId = await uploadCourierChatFile(file, "file", onProgress);
  const text = caption.trim();
  const raw = await api.post<unknown>(ENDPOINTS.logistOrderMessages(orderId), {
    json: {
      kind,
      attachment_upload_id: uploadId,
      ...(text ? { text } : {}),
    },
    fallbackError: "Faylni yuborishda xatolik",
  });
  return mapCourierMessage(asRecord(raw).message ?? raw);
}

export async function markCourierMessagesRead(
  orderId: string,
  upToId: number,
): Promise<void> {
  await api.post(ENDPOINTS.logistOrderMessagesRead(orderId), {
    json: { up_to_id: upToId },
    fallbackError: "O'qilgan deb belgilashda xatolik",
  });
}

/** Kuryerga shoshilinch signal (yuqori ustuvorlikdagi push + WS). */
export async function sendUrgentPing(
  orderId: string,
  text: string,
): Promise<void> {
  await api.post(ENDPOINTS.logistOrderUrgentPing(orderId), {
    json: { text },
    fallbackError: "Signal yuborishda xatolik",
  });
}

/** Signal matni chegarasi (backend: 200 belgi). */
export const URGENT_PING_MAX = 200;
/** Chat xabari chegarasi (backend: 4096 belgi — `HUDUD_3` javobi §3). */
export const COURIER_MESSAGE_MAX = 4096;

/**
 * Matn maydoni xatosi — kompozer ostida ko'rsatiladi, toast emas:
 * `400 {fields: {text: ["Ruxsatsiz havola"]}}` (`javascript:` /
 * `data:text/html` havolasi) yoki chegaradan uzun matn. Boshqa xato — `null`.
 */
export function courierMessageTextError(error: unknown): string | null {
  return errorFields(error).text?.[0]?.trim() || null;
}

/**
 * `order_messages_read` (JAVOBLAR_5): `by: "courier"` — kuryer logist
 * xabarlarini o'qidi → "✓✓"; `by: "logist"` — logist o'zi (boshqa tab yoki
 * boshqa logist) o'qidi → "✓✓" yo'q, kuryerdan kelganlar belgisi `unread`
 * bo'yicha yangilanadi. `by` yo'q eski shakl — kuryer o'qidi deb olinadi.
 */
export function readEventEffect(payload: Record<string, unknown>): {
  markLogistMessagesRead: boolean;
  clearInbox: boolean;
} {
  const by = asString(payload.by);
  if (by === "logist") {
    const unread = typeof payload.unread === "number" ? payload.unread : asNumber(payload.unread);
    return { markLogistMessagesRead: false, clearInbox: unread === 0 };
  }
  return { markLogistMessagesRead: true, clearInbox: false };
}

/**
 * Filial soketidagi chat hodisalari (§2.8): `order_message_created` —
 * xabar lentaga qo'shiladi; `order_messages_read` — kuryer o'qidi, logist
 * xabarlarida "✓✓". Chat ochilmagan bo'lsa kesh yo'q — hech narsa qilinmaydi.
 */
export function applyCourierMessageEvent(
  queryClient: QueryClient,
  type: string,
  payload: Record<string, unknown>,
): void {
  const orderId = asString(payload.order_id);
  if (!orderId) return;
  const key = queryKeys.orderCourierMessages(orderId);

  if (type === "order_message_created") {
    const message = mapCourierMessage(payload.message);
    if (!message.id) return;
    queryClient.setQueryData<CourierMessage[]>(key, (current) =>
      current ? mergeCourierMessages(current, [message]) : current,
    );
    return;
  }

  if (type === "order_messages_read") {
    if (!readEventEffect(payload).markLogistMessagesRead) return;
    const upTo = asNumber(payload.up_to_id);
    const at = parseDate(payload.at) ?? new Date();
    queryClient.setQueryData<CourierMessage[]>(key, (current) =>
      current?.map((message) =>
        message.role === "logist" && message.id <= upTo && !message.readAt
          ? { ...message, readAt: at }
          : message,
      ),
    );
  }
}

/** Xabarnoma va belgi uchun qisqa matn. */
export function courierMessagePreview(message: CourierMessage): string {
  if (message.kind === "voice") return "🎤 Ovozli xabar";
  if (message.kind === "image") return message.text.trim() || "🖼 Rasm";
  if (message.kind === "file") return `📎 ${message.fileName || "Fayl"}`;
  const text = message.text.trim().replace(/\s+/g, " ");
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/**
 * Buyurtma raqamini mavjud keshdan topadi (doska, ro'yxat, detal) — so'rov
 * yubormasdan. Topilmasa `null`.
 */
export function findOrderNumberInCache(
  queryClient: QueryClient,
  orderId: string,
): string | null {
  for (const [, data] of queryClient.getQueriesData({ queryKey: ["orders"] })) {
    const found = searchOrderNumber(data, orderId, 0);
    if (found) return found;
  }
  return null;
}

function searchOrderNumber(
  value: unknown,
  orderId: string,
  depth: number,
): string | null {
  if (depth > 5 || value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = searchOrderNumber(item, orderId, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.id === orderId && typeof record.orderNumber === "string") {
    return record.orderNumber || null;
  }
  for (const child of Object.values(record)) {
    if (child !== null && typeof child === "object") {
      const found = searchOrderNumber(child, orderId, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
