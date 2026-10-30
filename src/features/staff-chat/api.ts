import { api } from "@/lib/api-client";
import type { UploadOptions } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asArray, asInt, asOptionalInt, asRecord, isRecord } from "@/lib/parse";

import { mapTeamMembers } from "./team";
import type { PeerRef, TeamMember } from "./team";
import {
  mapStaffChannel,
  mapStaffMessage,
  mapStaffMessagesPage,
  mapUnreadByOrder,
} from "./types";
import type {
  StaffChannel,
  StaffMessage,
  StaffMessagesPage,
  UnreadByOrder,
} from "./types";

/** `STAFF_CHAT_FLUTTER.md` §1.2 va §1.3. */

/** Bir sahifada nechta xabar — kursorli sahifalash uchun. */
export const STAFF_PAGE_SIZE = 30;

export type StaffChannelFilters = {
  /** `order` — faqat buyurtma muhokamalari; berilmasa hammasi. */
  kind?: string | null;
  /**
   * Faqat o'qilmagani borlar. ⚠️ Server uni `limit` dan KEYIN qo'llaydi
   * (§13.3) — "hamma o'qilmaganlar" emas; belgi uchun `unread-by-order/`.
   */
  unread?: boolean;
  /** Sukut 30, maksimum 100 (ko'pi jimgina 100 ga tushadi). */
  limit?: number;
  /**
   * Server qidiruvi (2026-10-01 C §13.3): buyurtma raqami, mijoz ismi yoki
   * telefoni (faqat raqamlar bo'yicha). Kirill ism registrga sezgir —
   * ishonchli kalit raqam va telefon.
   */
  q?: string | null;
};

/**
 * Kanallar ro'yxati.
 *
 * Ro'yxatda faqat **muhokama boshlangan** kanallar bo'ladi — bo'sh
 * buyurtma chatlari bilan to'lib ketmaydi (hujjat §1.2). Ya'ni ro'yxatda
 * yo'q buyurtmaning ham kanali bo'lishi mumkin: u birinchi so'rovda
 * yaratiladi.
 */
export async function fetchStaffChannels(
  filters: StaffChannelFilters = {},
  signal?: AbortSignal,
): Promise<StaffChannel[]> {
  const raw = await api.get<unknown>(ENDPOINTS.staffChannels, {
    searchParams: {
      kind: filters.kind ?? undefined,
      unread: filters.unread ? "true" : undefined,
      limit: Math.min(filters.limit ?? 50, 100),
      q: filters.q?.trim() || undefined,
    },
    signal,
    fallbackError: "Kanallarni yuklashda xatolik",
  });

  const json = asRecord(raw);
  const items = Array.isArray(raw) ? raw : asArray(json.channels);
  return items.map(mapStaffChannel);
}

/** Javob `{success, channel}` ham, kanalning o'zi ham bo'lishi mumkin. */
function toChannel(raw: unknown): StaffChannel {
  const json = asRecord(raw);
  return mapStaffChannel(isRecord(json.channel) ? json.channel : raw);
}

/** Xodimlar guruhi — hamma ko'radi, obuna avtomatik. */
export async function fetchStaffGroupChannel(
  signal?: AbortSignal,
): Promise<StaffChannel> {
  const raw = await api.get<unknown>(ENDPOINTS.staffGroupChannel, {
    signal,
    fallbackError: "Guruh kanalini yuklashda xatolik",
  });
  return toChannel(raw);
}

/**
 * Buyurtma muhokamasi.
 *
 * Kanal **birinchi ochilganda yaratiladi** (hujjat §1.1) — oldindan
 * yaratish shart emas, shunchaki so'rov yuboriladi.
 */
export async function fetchStaffOrderChannel(
  orderId: string,
  signal?: AbortSignal,
): Promise<StaffChannel> {
  const raw = await api.get<unknown>(ENDPOINTS.staffOrderChannel(orderId), {
    signal,
    fallbackError: "Muhokamani ochishda xatolik",
  });
  return toChannel(raw);
}

/**
 * Xabarlar sahifasi.
 *
 * Sahifa raqami **yo'q** — kursor: javobdagi `oldest_id` keyingi so'rovga
 * `before_id` bo'lib ketadi. Sabab hujjatda: chatga yangi xabar kelib
 * turadi va raqamli sahifa har safar siljib ketardi.
 */
export async function fetchStaffMessages(
  channelId: number,
  options: { beforeId?: number | null; signal?: AbortSignal } = {},
): Promise<StaffMessagesPage> {
  const raw = await api.get<unknown>(
    ENDPOINTS.staffChannelMessages(channelId),
    {
      searchParams: {
        limit: STAFF_PAGE_SIZE,
        before_id: options.beforeId ?? undefined,
      },
      signal: options.signal,
      fallbackError: "Xabarlarni yuklashda xatolik",
    },
  );
  return mapStaffMessagesPage(raw);
}

/** Javob `{success, message}` ham, xabarning o'zi ham bo'lishi mumkin. */
function toMessage(raw: unknown): StaffMessage {
  const json = asRecord(raw);
  return mapStaffMessage(isRecord(json.message) ? json.message : raw);
}

export async function sendStaffMessage(input: {
  channelId: number;
  text: string;
  replyToId?: number | null;
}): Promise<StaffMessage> {
  const json: Record<string, unknown> = { text: input.text };
  if (input.replyToId) json.reply_to = input.replyToId;

  const raw = await api.post<unknown>(
    ENDPOINTS.staffChannelMessages(input.channelId),
    { json, fallbackError: "Xabar yuborishda xatolik" },
  );
  return toMessage(raw);
}

/**
 * Fayl / rasm / video / ovozli xabar.
 *
 * Tur fayldan **serverda** aniqlanadi, shuning uchun bu yerda yuborilmaydi.
 * `duration` esa faqat ovoz va video uchun — mijoz tomonda o'lchanadi.
 */
export async function sendStaffFile(
  input: {
    channelId: number;
    file: File | Blob;
    fileName: string;
    text?: string | null;
    duration?: number | null;
    replyToId?: number | null;
  },
  /** Yuklash jarayoni va bekor qilish — pufakdagi halqa uchun. */
  options: Pick<UploadOptions, "onProgress" | "signal"> = {},
): Promise<StaffMessage> {
  const body = new FormData();
  body.append("file", input.file, input.fileName);
  if (input.text?.trim()) body.append("text", input.text.trim());
  if (input.duration)
    body.append("duration", String(Math.round(input.duration)));
  if (input.replyToId) body.append("reply_to", String(input.replyToId));

  const raw = await api.upload<unknown>(
    ENDPOINTS.staffChannelMessages(input.channelId),
    body,
    { ...options, fallbackError: "Fayl yuborishda xatolik" },
  );
  return toMessage(raw);
}

/** Tahrir — faqat o'z xabari va 15 daqiqa ichida (`edit_window_closed`). */
export async function editStaffMessage(
  messageId: number,
  text: string,
): Promise<StaffMessage> {
  const raw = await api.patch<unknown>(ENDPOINTS.staffMessage(messageId), {
    json: { text },
    fallbackError: "Xabarni tahrirlashda xatolik",
  });
  return toMessage(raw);
}

/**
 * O'chirish. Xabar ro'yxatdan yo'qolmaydi — `is_deleted: true` bo'ladi va
 * matni bo'shaydi, ya'ni javoblar zanjiri buzilmaydi.
 */
export async function deleteStaffMessage(messageId: number): Promise<void> {
  await api.delete(ENDPOINTS.staffMessage(messageId), {
    fallbackError: "Xabarni o'chirishda xatolik",
  });
}

/** O'qildi kursori. Faqat **oldinga** suriladi — orqaga qaytmaydi. */
export async function markStaffChannelRead(
  channelId: number,
  messageId?: number | null,
): Promise<void> {
  await api.post(ENDPOINTS.staffChannelRead(channelId), {
    json: messageId ? { message_id: messageId } : {},
    fallbackError: "O'qilgan deb belgilashda xatolik",
  });
}

export type StaffUnread = {
  /** Jami o'qilmagan xabarlar (200 ta eng yangi kanal bo'yicha). */
  unread: number;
  /** Nechta kanalda o'qilmagani bor (guruh ham; 200 ta chegara). */
  channels: number;
  /**
   * O'qilmagani bor BUYURTMA kanallari — chegarasiz (2026-10-01 C §13.2);
   * eski deploy bermasa `null`. Doska belgisi baribir `unread-by-order/` dan.
   */
  orderChannels: number | null;
};

/** Umumiy badge — yon paneldagi raqam shundan (§1.2). */
export async function fetchStaffUnread(
  signal?: AbortSignal,
): Promise<StaffUnread> {
  const raw = await api.get<unknown>(ENDPOINTS.staffUnreadCount, {
    signal,
    fallbackError: "O'qilmaganlar sonini olishda xatolik",
  });
  const json = asRecord(raw);
  return {
    unread: asInt(json.unread),
    channels: asInt(json.channels),
    orderChannels: asOptionalInt(json.order_channels),
  };
}

/**
 * O'qilmagani bor HAMMA buyurtma — chegarasiz, sahifalashsiz (§13.1).
 * Karta, ustun va menyu belgisining yagona manbai: kartochkalar soni
 * nechta bo'lmasin, bitta so'rov.
 */
export async function fetchUnreadByOrder(
  signal?: AbortSignal,
): Promise<UnreadByOrder> {
  const raw = await api.get<unknown>(ENDPOINTS.staffUnreadByOrder, {
    signal,
    fallbackError: "O'qilmagan xabarlarni olishda xatolik",
  });
  return mapUnreadByOrder(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Jamoa chati (`HUDUD_BACKEND_TALABLAR_4.md` §1)
// ─────────────────────────────────────────────────────────────────────────────

/** Jamoa va shaxsiy chatlar — `?kind=team,direct`. */
export const TEAM_CHANNEL_KINDS = "team,direct";

/** Logistlar + kuryerlar umumiy guruhi — bitta, server yaratadi. */
export async function fetchStaffTeamChannel(
  signal?: AbortSignal,
): Promise<StaffChannel> {
  const raw = await api.get<unknown>(ENDPOINTS.staffTeamChannel, {
    signal,
    fallbackError: "Jamoa guruhini yuklashda xatolik",
  });
  return toChannel(raw);
}

/** Guruh a'zolari — ro'yxat qisqa (filial), qidiruv mijozda ham ishlaydi. */
export async function fetchTeamMembers(
  search: string | null = null,
  signal?: AbortSignal,
): Promise<TeamMember[]> {
  const raw = await api.get<unknown>(ENDPOINTS.staffTeamMembers, {
    searchParams: { search: search?.trim() || undefined },
    signal,
    fallbackError: "A'zolarni yuklashda xatolik",
  });
  return mapTeamMembers(raw);
}

/** Shaxsiy chat — ochadi yoki mavjudini qaytaradi (server ham idempotent). */
export async function openDirectChannel(peer: PeerRef): Promise<StaffChannel> {
  const raw = await api.post<unknown>(ENDPOINTS.staffDirectChannel, {
    json: { peer_kind: peer.kind, peer_id: peer.id },
    fallbackError: "Shaxsiy chatni ochishda xatolik",
  });
  return toChannel(raw);
}
