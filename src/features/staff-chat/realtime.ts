import type { QueryClient } from "@tanstack/react-query";

import {
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";
import type { SocketEvent } from "@/lib/reconnecting-socket";
import { queryKeys } from "@/lib/query-keys";

import { useAuthStore } from "@/stores/auth-store";

import type { StaffUnread } from "./api";
import { useStaffLiveStore } from "./store";
import { mapStaffMessage } from "./types";
import { bumpOrderChatUnread, clearOrderChatUnread } from "./unread-by-order";
import type { StaffChannel, StaffMessage, StaffSender } from "./types";

/**
 * Xodimlar chatining real vaqti — `STAFF_CHAT_FLUTTER.md` §1.4.
 *
 * Hodisalar **mavjud** operator soketidan keladi (yangi ulanish ochilmaydi),
 * shuning uchun ular panel karkasida qabul qilinadi va shu yerdan
 * tarqatiladi: xabarlar jonli do'konga, hisoblagichlar esa keshga.
 *
 * Hech bir hodisa uchun tarmoqqa chiqilmaydi — hammasi joyida qo'llanadi.
 */

/**
 * Kanal bo'yicha oxirgi `staff_message` qabul qilingan vaqt.
 *
 * `staff_message` va `staff_badge` bitta xabar uchun IKKALASI ham kelishi
 * mumkin (kanalga obuna bo'lgan, lekin uni ochmagan holat). Ikkalasi ham
 * hisoblagichni oshirsa, bitta xabar ikki marta sanalardi. Xabar hodisasi
 * aniqroq — unda id ham, matn ham bor, shuning uchun ustunlik unga
 * beriladi va shu yaqin oradagi badge o'tkazib yuboriladi.
 */
const lastMessageAt = new Map<number, number>();

/** Badge o'sha xabarnikimi — shu oraliqda kelgani takror deb hisoblanadi. */
const BADGE_DEDUPE_MS = 3000;

/**
 * Xabar kimniki — joriy foydalanuvchi bo'yicha aniqlanadi.
 *
 * ⚠️ Soketdagi `is_mine` ga umuman tayanib bo'lmaydi: backend bitta
 * yuklamani kanalning HAMMA obunachisiga yuboradi, ya'ni bayroq qabul
 * qiluvchi uchun hisoblanmagan. U **ikkala tomonga ham** yolg'on
 * bo'lishi mumkin:
 *
 *   `false` bo'lsa — o'z xabaring chapda, begonanikidek chiziladi;
 *   `true` bo'lsa  — hammaning xabari o'ngda, suhbat bir tomonga yopishadi.
 *
 * Shuning uchun tomon shu yerda qaytadan hisoblanadi va **serverning
 * bayrog'i umuman ishlatilmaydi** (`readMessage` ga qarang).
 *
 * `null` — aniqlab bo'lmadi.
 */
function ownershipOf(sender: StaffSender | null): boolean | null {
  if (!sender) return null;

  const user = useAuthStore.getState().user;
  if (!user) return null;

  /*
   * Operator id'si eng ishonchli belgi: u CRM jadvalidan va ikkala
   * tomonda ham bir xil fazoda. Yuboruvchida u bo'lmasa loginga
   * tushamiz — u ham unikal.
   */
  const operatorId = Number(user.id);
  if (
    Number.isFinite(operatorId) &&
    operatorId > 0 &&
    sender.operatorId !== null
  ) {
    return sender.operatorId === operatorId;
  }

  if (user.username && sender.username) {
    return sender.username === user.username;
  }

  return null;
}

/** Xabar `message` kalitida ham, to'g'ridan-to'g'ri ham kelishi mumkin. */
function readMessage(event: SocketEvent): StaffMessage | null {
  const raw = isRecord(event.message) ? event.message : event;
  if (!isRecord(raw) || raw.id === undefined) return null;

  const mapped = mapStaffMessage(raw);
  // `team_message {channel_id, message}` — kanal id'si xabar ichida bo'lmasligi mumkin.
  const outerChannelId = asOptionalInt(event.channel_id);
  const message =
    mapped.channelId <= 0 && outerChannelId !== null
      ? { ...mapped, channelId: outerChannelId }
      : mapped;
  if (message.channelId <= 0) return null;

  /*
   * Aniqlab bo'lmasa — **begona** deb hisoblanadi, serverniki emas.
   * Sabab: o'z xabarimiz baribir POST javobi bilan keladi va u jonli
   * nusxani ustidan yozadi (`upsert`), ya'ni o'zimizniki yo'qolmaydi.
   * Begona xabar esa faqat soketdan keladi — unda `true` bo'lib kelgan
   * bayroq butun suhbatni bir tomonga yopishtirardi.
   */
  const mine = ownershipOf(message.sender) ?? false;
  return mine === message.isMine ? message : { ...message, isMine: mine };
}

/** Umumiy badge — yon paneldagi raqam. */
function bumpUnreadTotal(queryClient: QueryClient, delta: number): void {
  queryClient.setQueryData<StaffUnread>(queryKeys.staffUnread, (current) =>
    current
      ? { ...current, unread: Math.max(0, current.unread + delta) }
      : current,
  );
}

/**
 * Kanallar ro'yxatidagi bitta yozuvni yangilaydi.
 *
 * Ro'yxat bir necha filtr bilan keshlanadi (hammasi, o'qilmaganlar,
 * buyurtmalar), shuning uchun hammasi bo'ylab yuriladi. Kanal topilmasa
 * hech narsa qilinmaydi: `staff_badge` uni alohida yo'l bilan qo'shadi.
 */
function patchChannel(
  queryClient: QueryClient,
  channelId: number,
  patch: (channel: StaffChannel) => StaffChannel,
  /** Yangi xabar — kanal ro'yxat boshiga ko'tariladi (Telegram'dagi kabi). */
  moveToTop = false,
): boolean {
  let found = false;

  queryClient.setQueriesData<StaffChannel[]>(
    { queryKey: ["staff-chat", "channels"] },
    (channels) => {
      if (!Array.isArray(channels)) return channels;
      const index = channels.findIndex((item) => item.id === channelId);
      if (index === -1) return channels;

      found = true;
      const patched = patch(channels[index]);
      if (!moveToTop) {
        return channels.map((item, at) => (at === index ? patched : item));
      }
      return [patched, ...channels.filter((_, at) => at !== index)];
    },
  );

  // Guruh va buyurtma kanallari alohida kalitlarda ham yotadi.
  queryClient.setQueriesData<StaffChannel>(
    { queryKey: ["staff-chat", "channel"] },
    (channel) =>
      isRecord(channel) && (channel as StaffChannel).id === channelId
        ? patch(channel as StaffChannel)
        : channel,
  );

  return found;
}

/**
 * Kanalni keshdan topadi — bildirishnoma matni uchun (nomi, buyurtmasi).
 *
 * Ro'yxat hali yuklanmagan bo'lishi mumkin (xodimlar chati ochilmagan) —
 * o'shanda `null` qaytadi va chaqiruvchi umumiy matn bilan cheklanadi.
 */
export function findStaffChannel(
  queryClient: QueryClient,
  channelId: number,
): StaffChannel | null {
  for (const [, channels] of queryClient.getQueriesData<StaffChannel[]>({
    queryKey: ["staff-chat", "channels"],
  })) {
    const found = Array.isArray(channels)
      ? channels.find((item) => item.id === channelId)
      : null;
    if (found) return found;
  }

  for (const [, channel] of queryClient.getQueriesData<StaffChannel>({
    queryKey: ["staff-chat", "channel"],
  })) {
    if (isRecord(channel) && (channel as StaffChannel).id === channelId) {
      return channel as StaffChannel;
    }
  }

  return null;
}

/**
 * `staff_message` — yangi xabar.
 *
 * Ochiq kanalda hisoblagich oshirilmaydi: operator xabarni ekranda ko'rib
 * turibdi va xona uni o'qilgan deb belgilaydi. O'z xabarimiz ham
 * sanalmaydi.
 */
export function applyStaffMessage(
  queryClient: QueryClient,
  event: SocketEvent,
): StaffMessage | null {
  const message = readMessage(event);
  if (!message) return null;

  lastMessageAt.set(message.channelId, Date.now());

  const store = useStaffLiveStore.getState();
  /*
   * O'z xabarimizning aks-sadosi POST javobidan oldin kelishi mumkin.
   * Lentada o'sha xabarning "soatli" nusxasi turibdi — uni shu yerda
   * yopamiz, aks holda javob kelguncha bir xabar ikki marta ko'rinardi.
   */
  if (!(message.isMine && store.resolvePendingByEcho(message))) {
    store.append(message);
  }

  // Yozayotgan odam xabarni yubordi — indikator o'chadi.
  if (message.sender?.fullName) {
    store.setTyping(message.channelId, message.sender.fullName, false);
  }

  /*
   * Ochiq kanal ham sanaladi, agar tab yashirin bo'lsa: logist xabarni
   * ko'rmayapti, ya'ni yon paneldagi va tab sarlavhasidagi raqam yonishi
   * kerak. Tabga qaytganda xona uni o'qilgan deb belgilaydi va nolga
   * tushiradi (`clearStaffChannelUnread`).
   */
  const isOpen = store.openChannelId === message.channelId;
  const hidden = typeof document !== "undefined" && document.hidden;
  const counts = !message.isMine && (!isOpen || hidden);
  /*
   * Tizim xabari ("status o'zgardi") — faqat buyurtmaning o'zida: karta
   * belgisi yonadi, muhokama ochilganda o'chadi. Xodimlar chatining
   * hisoblagichi, ro'yxatdagi oxirgi xabar va yon panel raqami — faqat
   * odamlar yozgani; aks holda har status o'zgarishi chalg'itardi.
   */
  const system = message.kind === "system";

  const known = patchChannel(
    queryClient,
    message.channelId,
    (channel) =>
      system
        ? channel
        : {
            ...channel,
            unread: counts ? channel.unread + 1 : channel.unread,
            lastMessage: {
              text: message.isDeleted ? "" : message.text,
              by: message.sender?.fullName ?? null,
              at: message.createdAt,
            },
          },
    true,
  );

  if (counts) {
    if (!system) bumpUnreadTotal(queryClient, 1);
    /*
     * Karta belgisi — `order_id` hodisaning o'zida (2026-10-01 C §9.2):
     * kanalni buyurtmaga xaritalash uchun so'rov kerak emas. Guruhda `null`.
     */
    const orderId = asOptionalString(event.order_id);
    if (orderId) {
      bumpOrderChatUnread(queryClient, {
        orderId,
        channelId: message.channelId,
        system,
        lastMessage: {
          text: message.isDeleted ? "" : message.text,
          by: message.sender?.fullName ?? null,
          at: message.createdAt,
        },
      });
    }
  }

  /*
   * Kanal ro'yxatda yo'q — muhokama endi boshlangan. Ro'yxat eskirgan deb
   * belgilanadi, aks holda buyurtma kartochkasidagi belgi faqat sahifa
   * yangilangandan keyin paydo bo'lardi.
   */
  if (!known) {
    void queryClient.invalidateQueries({
      queryKey: ["staff-chat", "channels"],
    });
  }

  return message;
}

export function applyStaffMessageUpdated(event: SocketEvent): boolean {
  const message = readMessage(event);
  if (!message) return false;

  /*
   * Tahrir tomonni o'zgartirmaydi. Jonli nusxa bor bo'lsa (masalan o'z
   * xabarimiz — u POST javobi bilan kelgan va tomoni aniq), tomon
   * o'shandan olinadi; soketdagi hisob esa faqat yangi xabar uchun.
   */
  const store = useStaffLiveStore.getState();
  const known = store.live[message.channelId]?.find(
    (item) => item.id === message.id,
  );
  /*
   * O'qildi holati ham saqlanadi: tahrir hodisasi uni qayta hisoblab
   * yubormaydi, aks holda tahrirlangan xabardan ✓✓ tushib qolardi.
   */
  store.upsert(
    known
      ? {
          ...message,
          isMine: known.isMine,
          isRead: known.isRead || message.isRead,
          readCount: Math.max(known.readCount, message.readCount),
          readers:
            message.readers.length >= known.readers.length
              ? message.readers
              : known.readers,
        }
      : message,
  );
  return true;
}

/**
 * `staff_read` — kimdir kanalni o'qidi.
 *
 * Hodisada bitta kursor keladi (`last_read_message_id`), u o'zidan
 * kichik hamma xabarni yopadi — har xabar uchun alohida hodisa yo'q.
 * Shuning uchun bu yerda faqat kursor saqlanadi, belgilar esa lenta
 * chizilayotganda hisoblanadi (`mergeStaffTimeline`).
 *
 * O'zimizning o'qishimiz o'zimizga qaytmaydi — server yubormaydi.
 */
export function applyStaffRead(event: SocketEvent): boolean {
  const channelId = asOptionalInt(event.channel_id);
  const lastReadMessageId = asOptionalInt(
    event.last_read_message_id ?? event.message_id,
  );
  if (channelId === null || lastReadMessageId === null) return false;

  const user = asRecord(event.user ?? event.reader);
  useStaffLiveStore.getState().setReadCursor(channelId, {
    userId: asOptionalInt(event.user_id ?? user.user_id ?? user.id),
    fullName:
      asOptionalString(event.full_name) ??
      asOptionalString(user.full_name) ??
      asOptionalString(user.username) ??
      "",
    lastReadMessageId,
  });
  return true;
}

/**
 * `staff_channel_read` — `team`/`direct` kanalda kimdir o'qidi
 * (`HUDUD_JAVOBLAR_4` §1): `{channel_id, by{id, kind, full_name}, last_message_id}`.
 *
 * Kuryer o'qisa ham, xodim o'qisa ham — o'z xabarlarimizdagi ✓✓ kursor
 * orqali yonadi. Kuryer id si xodim id lari bilan bir fazoda emas, shuning
 * uchun uning kursori ism bilan saqlanadi (to'qnashmasin). O'qigan o'zimiz
 * bo'lsak (boshqa tab/qurilma) — o'qilmaganlar hisobi nolga tushadi.
 */
export function applyStaffChannelRead(
  queryClient: QueryClient,
  event: SocketEvent,
): boolean {
  const channelId = asOptionalInt(event.channel_id);
  const lastReadMessageId = asOptionalInt(
    event.last_message_id ?? event.last_read_message_id ?? event.message_id,
  );
  if (channelId === null || lastReadMessageId === null) return false;

  const by = asRecord(event.by ?? event.user ?? event.reader);
  const kind = asString(by.kind).toLowerCase() === "courier" ? "courier" : "staff";
  const id = asOptionalInt(by.id ?? by.user_id ?? event.user_id);
  const fullName =
    asOptionalString(by.full_name) ?? asOptionalString(event.full_name) ?? "";

  if (kind === "staff" && id !== null && isCurrentOperator(id)) {
    clearStaffChannelUnread(queryClient, channelId);
    return true;
  }

  useStaffLiveStore.getState().setReadCursor(channelId, {
    userId: kind === "courier" ? null : id,
    fullName: fullName || (kind === "courier" && id !== null ? `Kuryer #${id}` : ""),
    lastReadMessageId,
  });
  return true;
}

function isCurrentOperator(id: number): boolean {
  const operatorId = Number(useAuthStore.getState().user?.id);
  return Number.isFinite(operatorId) && operatorId > 0 && operatorId === id;
}

export function applyStaffMessageDeleted(event: SocketEvent): boolean {
  const channelId = asOptionalInt(event.channel_id);
  const messageId = asOptionalInt(event.message_id ?? event.id);
  if (channelId === null || messageId === null) return false;

  useStaffLiveStore.getState().markDeleted(channelId, messageId);
  return true;
}

/**
 * `staff_typing` — kimdir yozmoqda.
 *
 * O'zimiznikini backend yubormaydi, shuning uchun bu yerda filtr yo'q.
 * Ism topilmasa indikator chizilmaydi: "kimdir yozmoqda" degan yozuv
 * ko'p kishilik kanalda hech narsa demaydi.
 */
export function applyStaffTyping(event: SocketEvent): boolean {
  const channelId = asOptionalInt(event.channel_id);
  if (channelId === null) return false;

  const user = asRecord(event.user ?? event.sender);
  const name =
    asOptionalString(event.full_name) ??
    asOptionalString(user.full_name) ??
    asOptionalString(user.username);
  if (!name) return false;

  useStaffLiveStore
    .getState()
    .setTyping(channelId, name, event.is_typing !== false);
  return true;
}

/**
 * `staff_badge` — ochiq bo'lmagan kanalga xabar tushdi.
 *
 * Kanal ro'yxatda bo'lmasligi mumkin (muhokama endi boshlangan), shunda
 * ro'yxat eskirgan deb belgilanadi — yangi kanal shu yo'l bilan paydo
 * bo'ladi.
 */
/** `staff_badge` tizim xabari uchunmi — `kind` yuqorida yoki `message` ichida. */
function isSystemEvent(event: SocketEvent): boolean {
  const kind =
    asOptionalString(event.kind) ??
    asOptionalString(event.message_kind) ??
    (isRecord(event.message) ? asOptionalString(event.message.kind) : null);
  return kind === "system";
}

export function applyStaffBadge(
  queryClient: QueryClient,
  event: SocketEvent,
): boolean {
  const channelId = asOptionalInt(event.channel_id);
  if (channelId === null) return false;

  // Ochiq kanal uchun badge kelmasligi kerak, lekin kelsa — e'tiborsiz.
  if (useStaffLiveStore.getState().openChannelId === channelId) return true;

  // O'sha xabar uchun `staff_message` allaqachon sanagan bo'lsa — takror.
  const seen = lastMessageAt.get(channelId) ?? 0;
  if (Date.now() - seen < BADGE_DEDUPE_MS) return true;

  const preview = asString(event.preview);
  // Muallif va vaqt serverdan (2026-10-01 C §9.3) — kelgan lahza emas.
  const sender = asRecord(event.sender);
  const by = asOptionalString(sender.full_name);
  const at = asOptionalString(event.created_at) ?? new Date().toISOString();

  // Tizim xabari — faqat buyurtma kartasi (`applyStaffMessage` ga qarang).
  if (isSystemEvent(event)) {
    const systemOrderId = asOptionalString(event.order_id);
    if (systemOrderId) {
      bumpOrderChatUnread(queryClient, {
        orderId: systemOrderId,
        channelId,
        system: true,
        lastMessage: { text: preview, by, at },
      });
    }
    return true;
  }

  const known = patchChannel(
    queryClient,
    channelId,
    (channel) => ({
      ...channel,
      unread: channel.unread + 1,
      lastMessage: {
        text: preview || channel.lastMessage?.text || "",
        by: by ?? (preview ? null : (channel.lastMessage?.by ?? null)),
        at,
      },
    }),
    true,
  );

  bumpUnreadTotal(queryClient, 1);

  // Karta belgisi — `order_id` bilan (guruh kanalida `null`).
  const orderId = asOptionalString(event.order_id);
  if (orderId) {
    bumpOrderChatUnread(queryClient, {
      orderId,
      channelId,
      lastMessage: { text: preview, by, at },
    });
  }

  if (!known) {
    void queryClient.invalidateQueries({
      queryKey: ["staff-chat", "channels"],
    });
  }

  return true;
}

/**
 * Kanal ochilganda hisoblagichni nolga tushiradi.
 *
 * Server so'rovi alohida ketadi (`read/`), bu esa faqat keshni to'g'rilaydi:
 * aks holda badge kanal ochiq turganda ham yonib turardi.
 */
export function clearStaffChannelUnread(
  queryClient: QueryClient,
  channelId: number,
): void {
  let cleared = 0;

  patchChannel(queryClient, channelId, (channel) => {
    cleared = Math.max(cleared, channel.unread);
    return channel.unread === 0 ? channel : { ...channel, unread: 0 };
  });

  if (cleared > 0) bumpUnreadTotal(queryClient, -cleared);
  clearOrderChatUnread(queryClient, channelId);
}
