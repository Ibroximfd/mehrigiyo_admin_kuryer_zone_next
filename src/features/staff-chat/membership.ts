import { api, ApiError } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import { asArray, asBool, asOptionalInt, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Zakaz chati a'zoligi — Bitrix usuli (backend C1, 2026-10-30 §D).
 *
 * Chat faqat ishtirokchilarga ko'rinadi. **Admin** — zakazni yaratgan yoki
 * biriktirilgan operator: u yuqori rollarni (logist, bo'lim admini, bosh
 * admin, bosh logist, bosh kuryer) ism bilan qo'shadi. Yuqori rollar zakaz
 * raqami bo'yicha qidirib o'zi qo'shiladi. Kim kimni qo'sha olishini
 * server hal qiladi (`403 chat_member_forbidden`) — UI faqat imkon beradi.
 */
export type ChatRole = "admin" | "member";

export type ChatMember = {
  seatId: number;
  userId: number | null;
  fullName: string;
  roleInChat: ChatRole;
  isAdmin: boolean;
  isLogist: boolean;
  addedBy: string | null;
  joinedAt: Date | null;
};

export function mapChatMembers(raw: unknown): ChatMember[] {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.members ?? json.results);
  return list.flatMap((item) => {
    const row = asRecord(item);
    const seatId = asOptionalInt(row.seat_id ?? row.id);
    if (seatId === null) return [];
    const addedBy = row.added_by;
    return [
      {
        seatId,
        userId: asOptionalInt(row.user_id),
        fullName: asString(row.full_name) || `#${seatId}`,
        roleInChat: asString(row.role_in_chat) === "admin" ? "admin" : "member",
        isAdmin: asBool(row.is_admin),
        isLogist: asBool(row.is_logist),
        addedBy: isRecord(addedBy) ? asOptionalString(addedBy.full_name) : asOptionalString(addedBy),
        joinedAt: parseDate(row.joined_at),
      },
    ];
  });
}

/** Ro'yxat tartibi: admin birinchi, keyin qo'shilgan vaqti bo'yicha. */
export function sortMembers(members: readonly ChatMember[]): ChatMember[] {
  return [...members].sort(
    (a, b) =>
      Number(b.roleInChat === "admin") - Number(a.roleInChat === "admin") ||
      (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0),
  );
}

/** Ishtirokchi yorlig'i: chat admini / logist / admin. */
export function memberRoleLabel(member: Pick<ChatMember, "roleInChat" | "isAdmin" | "isLogist">): string {
  if (member.roleInChat === "admin") return "chat admini";
  if (member.isLogist) return "logist";
  if (member.isAdmin) return "admin";
  return "ishtirokchi";
}

/** Qo'shish uchun nomzod xodim (o'rin). */
export type StaffCandidate = { seatId: number; fullName: string; roleLabel: string };

/**
 * `GET channels/{id}/candidates/?q=` — server faqat shu odam qo'sha
 * oladiganlarni beradi, ishtirokchilarsiz (2026-10-30 §3): sotuvchiga —
 * logist/admin/rahbar, yuqori rolga — filialning faol o'rinlari.
 */
export function mapCandidates(raw: unknown): StaffCandidate[] {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.results);
  return list.flatMap((item) => {
    const row = asRecord(item);
    const seatId = asOptionalInt(row.seat_id);
    if (seatId === null) return [];
    return [
      {
        seatId,
        fullName: asString(row.full_name) || asString(row.username) || `#${seatId}`,
        roleLabel: asString(row.role_label),
      },
    ];
  });
}

export async function fetchChatCandidates(channelId: number, q: string, signal?: AbortSignal): Promise<StaffCandidate[]> {
  const raw = await api.get<unknown>(ENDPOINTS.staffChannelCandidates(channelId), {
    searchParams: q ? { q } : undefined,
    signal,
  });
  return mapCandidates(raw);
}

export type OrderChatHit = {
  orderId: string;
  orderNumber: string;
  status: string;
  clientName: string;
  channelId: number | null;
  joined: boolean;
  canJoin: boolean;
};

export function mapOrderChatHits(raw: unknown): OrderChatHit[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  return list.flatMap((item) => {
    const row = asRecord(item);
    const orderId = asString(row.order_id);
    if (!orderId) return [];
    return [
      {
        orderId,
        orderNumber: asString(row.order_number),
        status: asString(row.status),
        clientName: asString(row.client_name),
        channelId: asOptionalInt(row.channel_id),
        joined: asBool(row.joined),
        canJoin: asBool(row.can_join),
      },
    ];
  });
}

export async function fetchChatMembers(channelId: number, signal?: AbortSignal): Promise<ChatMember[]> {
  return mapChatMembers(await api.get<unknown>(ENDPOINTS.staffChannelMembers(channelId), { signal }));
}

export async function addChatMember(channelId: number, seatId: number): Promise<ChatMember[]> {
  return mapChatMembers(
    await api.post<unknown>(ENDPOINTS.staffChannelMembers(channelId), {
      json: { seat_id: seatId },
      fallbackError: "Ishtirokchi qo'shishda xatolik",
    }),
  );
}

export async function removeChatMember(channelId: number, seatId: number): Promise<ChatMember[]> {
  return mapChatMembers(
    await api.delete<unknown>(ENDPOINTS.staffChannelMember(channelId, seatId), {
      fallbackError: "Ishtirokchini chiqarishda xatolik",
    }),
  );
}

export async function joinChat(channelId: number): Promise<void> {
  await api.post<unknown>(ENDPOINTS.staffChannelJoin(channelId), { fallbackError: "Chatga qo'shilishda xatolik" });
}

/**
 * Qidiruvdan topilgan zakaz chatiga qo'shilish (egasi: ruxsat so'ralmaydi).
 * Kanal bor — `channels/{id}/join/`; hali ochilmagan — `orders/{id}/join/`
 * (kanal yaratiladi va a'zo qilinadi). Keyin chat oddiy yo'l bilan ochiladi.
 */
export async function joinOrderChat(hit: Pick<OrderChatHit, "orderId" | "channelId">): Promise<void> {
  if (hit.channelId !== null) return joinChat(hit.channelId);
  try {
    await api.post<unknown>(ENDPOINTS.staffOrderJoin(hit.orderId), { fallbackError: "Chatga qo'shilishda xatolik" });
  } catch (error) {
    // Yo'l hali serverda yo'q (404) — kanalni zakaz bo'yicha olib, keyin qo'shilamiz.
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    const channel = asOptionalInt(asRecord(await api.get<unknown>(ENDPOINTS.staffOrderChannel(hit.orderId))).id);
    if (channel === null) throw error;
    await joinChat(channel);
  }
}

export async function leaveChat(channelId: number): Promise<void> {
  await api.post<unknown>(ENDPOINTS.staffChannelLeave(channelId), { fallbackError: "Chatdan chiqishda xatolik" });
}

/** Zakaz raqami / ID boshi / mijoz telefoni — qamrov ichida. */
export async function searchOrderChats(q: string, signal?: AbortSignal): Promise<OrderChatHit[]> {
  return mapOrderChatHits(await api.get<unknown>(ENDPOINTS.staffOrderSearch, { searchParams: { q }, signal }));
}
