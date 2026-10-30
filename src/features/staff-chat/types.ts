import { resolveMediaUrl } from "@/lib/api-constants";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Xodimlar chati — `STAFF_CHAT_FLUTTER.md` §1.
 *
 * Mijoz chatidan (`features/chat`) ataylab alohida: u yerda ikki tomon bor
 * (mijoz ↔ operator) va savol "kim yozdi" degan doimiy jumboq; bu yerda esa
 * suhbat ko'p kishilik va server har bir xabarda kimligini to'liq aytadi
 * (`sender`), o'z xabarini esa o'zi belgilaydi (`is_mine`) — taxmin qilish
 * kerak emas.
 */

/**
 * `group` — xodimlar ichki guruhi; `order` — buyurtma muhokamasi;
 * `team` — logistlar + kuryerlar umumiy guruhi (bitta); `direct` — ikki
 * kishilik shaxsiy chat (`HUDUD_BACKEND_TALABLAR_4.md` §1).
 */
export type StaffChannelKind = "group" | "order" | "team" | "direct";

export type StaffPeerKind = "courier" | "staff";

/** Shaxsiy chatning ikkinchi tomoni — `direct.peer`. */
export type StaffPeer = {
  id: number;
  kind: StaffPeerKind;
  fullName: string;
  /** Kichik rasm (yoki asl); yo'q — bosh harflar. */
  avatarUrl: string | null;
  online: boolean;
  lastSeenAt: string | null;
};

/** Kanalga biriktirilgan buyurtma — `order` turidagi kanallarda. */
export type StaffChannelOrder = {
  id: string;
  orderNumber: string;
  status: string;
  /** Mol summasi — tafsilot. */
  totalAmount: number;
  /** Mijoz to'laydigan summa (`OPERATOR_BALL_FRONTEND.md` §1). */
  payableAmount: number;
  pointsUsed: number;
  pointsDiscount: number;
  /**
   * Buyurtma mijozi — `order.client {full_name, phone}` (2026-10-01 C
   * §13.3): logist chatni MIJOZDAN taniydi, har kanal uchun qo'shimcha
   * so'rov yo'q. `phone` bo'sh satr bo'lishi ATAYLAB (ishonchsiz raqam
   * ko'rsatilmaydi). Ikkalasi ham bo'sh yoki blok yo'q — `null`.
   */
  client: StaffChannelClient | null;
};

export type StaffChannelClient = {
  fullName: string;
  phone: string;
};

export type StaffChannelPreview = {
  text: string;
  /** Kim yozgani — ro'yxatda ism bilan ko'rsatiladi. */
  by: string | null;
  at: string | null;
};

export type StaffChannel = {
  id: number;
  /** `StaffChannelKind`; noma'lum tur ham ro'yxatdan tushib qolmaydi. */
  kind: string;
  title: string;
  order: StaffChannelOrder | null;
  /** Faqat `direct` kanalda — suhbatdosh; boshqalarida `null`. */
  peer: StaffPeer | null;
  unread: number;
  lastMessage: StaffChannelPreview | null;
};

export type StaffSender = {
  userId: number | null;
  operatorId: number | null;
  fullName: string;
  /** `@login` eslatmasi aynan shu bilan yoziladi. */
  username: string;
  /** `operator` · `admin` · `logist` · `courier` — noma'lum rol ham bo'lishi mumkin. */
  role: string;
  /** `team`/`direct` da kuryer ham yozadi (`HUDUD_JAVOBLAR_4` §1). */
  kind: StaffPeerKind;
  /** `sender.avatar` (thumb); yo'q — bosh harflar. */
  avatarUrl: string | null;
};

/**
 * `text` · `image` · `video` · `audio` · `file` · `system`
 *
 * `system` — tizim xabari (status o'zgardi, kuryer biriktirildi): markazda,
 * kulrang qilib chiziladi va unga javob berib/tahrirlab bo'lmaydi.
 */
export type StaffMessageKind =
  "text" | "image" | "video" | "audio" | "file" | "system";

export type StaffFile = {
  url: string;
  name: string | null;
  /** Baytda; backend bermasa `null`. */
  size: number | null;
  /** Ovoz va video uchun — soniyada. */
  duration: number | null;
  mimeType: string | null;
};

/**
 * Xabarni o'qigan xodim.
 *
 * Server ko'pi bilan 10 tasini beradi: buyurtma muhokamasida odam kam
 * (3–10) va ro'yxat to'liq bo'ladi, umumiy guruhda esa 100 ta ismni har
 * xabarga tirkash javobni ham, ekranni ham ko'mib tashlardi — u yerda
 * faqat son ko'rsatiladi.
 */
export type StaffReader = {
  userId: number | null;
  fullName: string;
};

/** Server beradigan ismlar chegarasi — hisobni to'g'rilashda ishlatiladi. */
export const STAFF_READERS_LIMIT = 10;

export type StaffMessageReply = {
  id: number;
  text: string;
  kind: string;
  senderName: string | null;
};

export type StaffMessage = {
  id: number;
  channelId: number;
  kind: string;
  text: string;
  createdAt: string;
  /** `null` bo'lmasa — xabar tahrirlangan, buni aytib qo'yamiz. */
  editedAt: string | null;
  /**
   * O'chirilgan xabar ro'yxatdan **yo'qolmaydi**: matni bo'shaydi va
   * o'rnida "xabar o'chirildi" turadi (hujjat §1.3). Shu sababli suhbat
   * mantiqi buzilmaydi — javoblar va ketma-ketlik joyida qoladi.
   */
  isDeleted: boolean;
  isMine: boolean;
  sender: StaffSender | null;
  replyTo: StaffMessageReply | null;
  file: StaffFile | null;
  /** Eslatilgan loginlar — matnda ajratib ko'rsatish uchun. */
  mentions: string[];
  /**
   * O'z xabaringizni kimdir o'qidimi — ✓✓ shu bo'yicha qo'yiladi.
   *
   * Server buni har xabar uchun alohida qator yozib emas, o'qish
   * kursoridan hisoblaydi: kimning kursori xabar id'sidan katta bo'lsa,
   * o'sha odam o'qigan. Shu sababli jonli yangilanish ham bitta hodisa
   * bilan hamma xabarni yopadi (`staff_read`).
   */
  isRead: boolean;
  /** Nechta xodim o'qigan. */
  readCount: number;
  /** Kim o'qigani — ko'pi bilan `STAFF_READERS_LIMIT` ta. */
  readers: StaffReader[];
  /**
   * Faqat mahalliy: xabar yuborilgan, server javobi hali kelmagan —
   * Telegram'dagi "soat" belgisi. `id` manfiy (vaqtinchalik).
   */
  pending?: boolean;
  /** Faqat mahalliy: yuborish yiqildi — qayta yuborish yoki o'chirish. */
  failed?: boolean;
  /** Yuborilayotgan xabarning kiruvchi ma'lumoti — qayta yuborish uchun. */
  outbox?: StaffOutbox;
};

/**
 * Yuborilayotgan xabarning mahalliy holati.
 *
 * Xabar tugma bosilgan zahoti lentaga tushadi (`pending`), server javobi
 * kelgach o'sha o'rinda haqiqiysi bilan almashadi (`resolvePending`).
 * Yiqilsa pufak qizil bo'lib "qayta yuborish / o'chirish" taklif qiladi.
 * Bu maydonlar serverdan hech qachon kelmaydi va unga yuborilmaydi.
 */
export type StaffOutbox = {
  text: string;
  file: File | null;
  duration: number | null;
  replyToId: number | null;
  /** Yuklangan ulush 0..1; matn uchun va server javobini kutganda `null`. */
  progress: number | null;
  /** Yuborishni bekor qilish — faqat fayl uchun. */
  abort: AbortController | null;
  /** Yiqilgan sabab — pufak ostida ko'rsatiladi. */
  error: string | null;
};

export type StaffMessagesPage = {
  messages: StaffMessage[];
  hasMore: boolean;
  /** Keyingi sahifa uchun kursor (`before_id`); yo'q bo'lsa `null`. */
  oldestId: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// O'qish
// ─────────────────────────────────────────────────────────────────────────────

function mapSender(raw: unknown): StaffSender | null {
  if (!isRecord(raw)) return null;
  return {
    userId: asOptionalInt(raw.user_id ?? raw.id),
    operatorId: asOptionalInt(raw.operator_id),
    fullName: asString(raw.full_name ?? raw.name),
    username: asString(raw.username),
    role: asString(raw.role).toLowerCase(),
    kind: parsePeerKind(raw.kind),
    avatarUrl: mapAvatarUrl(raw.avatar),
  };
}

/** Avatar rangi uchun barqaror id — operator, foydalanuvchi, aks holda 0. */
export function senderAvatarId(sender: StaffSender | null): number {
  return sender?.operatorId ?? sender?.userId ?? 0;
}

function mapFile(raw: unknown): StaffFile | null {
  if (!isRecord(raw)) {
    // Ba'zi javoblarda fayl oddiy manzil satri bo'lib keladi.
    const url = asOptionalString(raw);
    return url
      ? {
          url: resolveMediaUrl(url),
          name: url.split("/").pop()?.split("?")[0] ?? null,
          size: null,
          duration: null,
          mimeType: null,
        }
      : null;
  }

  const url = asString(raw.url ?? raw.file ?? raw.file_url);
  if (!url) return null;

  return {
    url: resolveMediaUrl(url),
    name:
      asOptionalString(raw.name ?? raw.file_name) ??
      (url.split("/").pop()?.split("?")[0] || null),
    size: asOptionalNumber(raw.size ?? raw.file_size),
    duration: asOptionalNumber(raw.duration),
    mimeType: asOptionalString(raw.mime_type ?? raw.content_type),
  };
}

/** Eslatmalar satr ham (`"aziz_op"`), obyekt ham bo'lishi mumkin. */
function mapMentions(raw: unknown): string[] {
  return asArray(raw)
    .map((item) =>
      isRecord(item)
        ? asString(item.username ?? item.login)
        : asString(item).replace(/^@/, ""),
    )
    .filter(Boolean);
}

function mapReaders(raw: unknown): StaffReader[] {
  return asArray(raw)
    .map((item) => {
      const person = asRecord(item);
      return {
        userId: asOptionalInt(person.user_id ?? person.id),
        fullName: asString(person.full_name ?? person.name),
      };
    })
    .filter((person) => person.fullName || person.userId !== null);
}

export function mapStaffMessage(raw: unknown): StaffMessage {
  const json = asRecord(raw);
  const reply = json.reply_to;

  return {
    id: asInt(json.id),
    channelId: asInt(json.channel_id ?? json.channel),
    kind: asString(json.kind) || "text",
    text: asString(json.text),
    createdAt: asString(json.created_at),
    editedAt: asOptionalString(json.edited_at),
    isDeleted: asBool(json.is_deleted),
    isMine: asBool(json.is_mine),
    sender: mapSender(json.sender),
    replyTo: isRecord(reply)
      ? {
          id: asInt(reply.id),
          text: asString(reply.text),
          kind: asString(reply.kind) || "text",
          senderName:
            mapSender(reply.sender)?.fullName ??
            asOptionalString(reply.sender_name),
        }
      : null,
    file: mapFile(json.file),
    mentions: mapMentions(json.mentions),
    isRead: asBool(json.is_read),
    readCount: Math.max(0, asInt(json.read_count)),
    readers: mapReaders(json.readers),
  };
}

/** `order.client {full_name, phone}` (§13.3); ikkalasi bo'sh — `null`. */
function mapChannelClient(
  order: Record<string, unknown>,
): StaffChannelClient | null {
  const client = asRecord(order.client);
  const fullName = asString(client.full_name).trim();
  const phone = asString(client.phone).trim();
  return fullName || phone ? { fullName, phone } : null;
}

export function parsePeerKind(raw: unknown): StaffPeerKind {
  return asString(raw).toLowerCase() === "courier" ? "courier" : "staff";
}

/** `{url, thumb_url}` ham, oddiy satr ham — `javascript:` kabi sxemalar o'tkazilmaydi. */
export function mapAvatarUrl(raw: unknown): string | null {
  const value = isRecord(raw)
    ? asOptionalString(raw.thumb_url) ?? asOptionalString(raw.url)
    : asOptionalString(raw);
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) return null;
  return resolveMediaUrl(trimmed);
}

export function mapStaffPeer(raw: unknown): StaffPeer | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return {
    id,
    kind: parsePeerKind(raw.kind),
    fullName: asString(raw.full_name ?? raw.name),
    avatarUrl: mapAvatarUrl(raw.avatar),
    online: asBool(raw.online),
    lastSeenAt: asOptionalString(raw.last_seen_at),
  };
}

export function mapStaffChannel(raw: unknown): StaffChannel {
  const json = asRecord(raw);
  const order = json.order;
  const last = json.last_message;

  return {
    id: asInt(json.id),
    kind: asString(json.kind) || "order",
    title: asString(json.title),
    order: isRecord(order)
      ? {
          id: asString(order.id),
          orderNumber: asString(order.order_number),
          status: asString(order.status),
          totalAmount: asNumber(order.total_amount),
          payableAmount:
            asOptionalNumber(order.payable_amount) ??
            asNumber(order.total_amount),
          pointsUsed: asInt(order.points_used),
          pointsDiscount: asNumber(order.points_discount),
          client: mapChannelClient(order),
        }
      : null,
    peer: mapStaffPeer(json.peer),
    unread: Math.max(0, asInt(json.unread)),
    lastMessage: mapPreview(last),
  };
}

/**
 * `GET /staff-chat/unread-by-order/` qatori (2026-10-01 C §13.1): faqat
 * buyurtma kanallari, faqat `unread > 0`, tartib — oxirgi xabar.
 */
export type OrderUnreadEntry = {
  orderId: string;
  channelId: number;
  /** Hammasi — odam yozgani ham, tizim xabari ham (kartochka belgisi). */
  unread: number;
  /**
   * Shundan tizim xabarlari ("status o'zgardi"): faqat buyurtmaning o'zida
   * belgilanadi, xodimlar chati hisobiga kirmaydi. Eski server — `0`.
   */
  systemUnread: number;
  lastMessage: StaffChannelPreview | null;
};

export type UnreadByOrder = {
  orders: OrderUnreadEntry[];
  /** = `unread-count/` dagi `order_channels` — "nechta kartochkada gap bor". */
  ordersCount: number;
};

function mapPreview(raw: unknown): StaffChannelPreview | null {
  if (!isRecord(raw)) return null;
  return {
    text: asString(raw.text),
    by: asOptionalString(raw.by),
    at: asOptionalString(raw.at),
  };
}

export function mapUnreadByOrder(raw: unknown): UnreadByOrder {
  const json = asRecord(raw);
  const orders = asArray(json.orders)
    .filter(isRecord)
    .map((item) => ({
      orderId: asString(item.order_id),
      channelId: asInt(item.channel_id),
      unread: Math.max(0, asInt(item.unread)),
      systemUnread: Math.max(0, asInt(item.system_unread)),
      lastMessage: mapPreview(item.last_message),
    }))
    .filter((item) => item.orderId !== "" && item.unread > 0);
  return {
    orders,
    ordersCount: asInt(json.orders_count, orders.length),
  };
}

export function mapStaffMessagesPage(raw: unknown): StaffMessagesPage {
  const json = asRecord(raw);
  return {
    messages: asArray(json.messages).map(mapStaffMessage),
    hasMore: asBool(json.has_more),
    oldestId: asOptionalInt(json.oldest_id),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Qoidalar
// ─────────────────────────────────────────────────────────────────────────────

/** Tahrir oynasi — hujjat §1.3: o'z xabari, 15 daqiqa ichida. */
export const STAFF_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditStaffMessage(
  message: StaffMessage,
  now = Date.now(),
): boolean {
  if (!message.isMine || message.isDeleted) return false;
  // Hali serverga yetmagan xabarni tahrirlab bo'lmaydi — id'si yo'q.
  if (isLocalStaffMessage(message)) return false;
  // Tizim xabari va media — matn tahriri ularga tegishli emas.
  if (message.kind !== "text") return false;

  const created = parseDate(message.createdAt)?.getTime();
  if (created === undefined) return false;
  return now - created < STAFF_EDIT_WINDOW_MS;
}

/**
 * O'chirish: o'z xabari, filial admini esa istalganini (hujjat §1.3).
 * Server baribir tekshiradi — bu faqat menyuni to'g'ri chizish uchun.
 */
export function canDeleteStaffMessage(
  message: StaffMessage,
  isAdmin: boolean,
): boolean {
  if (message.isDeleted || message.kind === "system") return false;
  // Mahalliy xabar serverda yo'q — u o'z tugmasi bilan olib tashlanadi.
  if (isLocalStaffMessage(message)) return false;
  return message.isMine || isAdmin;
}

const ROLE_LABELS: Record<string, string> = {
  operator: "Operator",
  admin: "Admin",
  logist: "Logist",
  courier: "Kuryer",
};

export function staffRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? "";
}

/**
 * Fayl hajmi chegaralari (hujjat §1.3). Server ham tekshiradi
 * (`file_too_large`), lekin 50 MB ni yuborib, keyin rad javobini kutish —
 * behuda vaqt va trafik: chegara bu yerda, tanlangan zahoti aytiladi.
 */
const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  file: 25 * 1024 * 1024,
};

/** Fayl turini `File` dan aniqlaydi — server ham xuddi shunday qiladi. */
export function staffKindForFile(file: File | Blob): StaffMessageKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function staffSizeLimit(kind: string): number {
  return SIZE_LIMITS[kind] ?? SIZE_LIMITS.file;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yuborilayotgan xabar (outbox)
// ─────────────────────────────────────────────────────────────────────────────

/** Hali serverga yetmagan (yoki yetmay yiqilgan) xabar. */
export function isLocalStaffMessage(message: StaffMessage): boolean {
  return message.id <= 0 || Boolean(message.pending || message.failed);
}

/**
 * Vaqtinchalik id — manfiy, ya'ni server id'lari bilan hech qachon
 * to'qnashmaydi. Sahifa ochiq turgan davomida o'sib boradi.
 */
let tempIdCounter = 0;
function nextTempId(): number {
  tempIdCounter += 1;
  return -tempIdCounter;
}

export type PendingStaffInput = {
  channelId: number;
  text: string;
  file: File | null;
  duration: number | null;
  replyTo: StaffMessage | null;
  /** Joriy foydalanuvchi — ketma-ketlik va ism uchun; noma'lum bo'lsa `null`. */
  sender: StaffSender | null;
};

/**
 * Yuborishdan OLDIN lentaga tushadigan mahalliy nusxa.
 *
 * Fayl uchun brauzerning `blob:` manzili beriladi — rasm/video darhol,
 * yuklanmasdan ko'rinadi (Telegram'dagi kabi). Manzil xabar lentadan
 * chiqqanda bo'shatiladi (`releaseLocalStaffFile`).
 */
export function createPendingStaffMessage(
  input: PendingStaffInput,
): StaffMessage {
  const { file } = input;
  const text = input.text.trim();

  return {
    id: nextTempId(),
    channelId: input.channelId,
    kind: file ? staffKindForFile(file) : "text",
    text,
    createdAt: new Date().toISOString(),
    editedAt: null,
    isDeleted: false,
    isMine: true,
    sender: input.sender,
    replyTo: input.replyTo
      ? {
          id: input.replyTo.id,
          text: input.replyTo.text,
          kind: input.replyTo.kind,
          senderName: input.replyTo.isMine
            ? (input.sender?.fullName ?? null)
            : (input.replyTo.sender?.fullName ?? null),
        }
      : null,
    file: file
      ? {
          url: URL.createObjectURL(file),
          name: (file instanceof File && file.name) || "fayl",
          size: file.size,
          duration: input.duration,
          mimeType: file.type || null,
        }
      : null,
    mentions: [],
    isRead: false,
    readCount: 0,
    readers: [],
    pending: true,
    failed: false,
    outbox: {
      text,
      file,
      duration: input.duration,
      replyToId: input.replyTo?.id ?? null,
      progress: file ? 0 : null,
      abort: file ? new AbortController() : null,
      error: null,
    },
  };
}

/** Mahalliy `blob:` manzilni bo'shatadi — xotira oqmasin. */
export function releaseLocalStaffFile(message: StaffMessage): void {
  const url = message.file?.url;
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * Soketdan kelgan o'z xabarimiz shu vaqtinchalik xabarning aks-sadosimi.
 *
 * Aniq bog'lovchi id yo'q (server mijoz id'sini qaytarmaydi), shuning
 * uchun tur va matn bo'yicha, fayl bo'lsa nomi bo'yicha solishtiriladi.
 * Ikki bir xil matn ketma-ket yuborilsa birinchi kutayotgani olinadi —
 * ikkalasi ham baribir yopiladi, faqat tartibi muhim emas.
 */
export function matchesPendingStaffMessage(
  pending: StaffMessage,
  incoming: StaffMessage,
): boolean {
  if (!pending.pending || pending.failed) return false;
  if (pending.channelId !== incoming.channelId) return false;
  if (pending.kind !== incoming.kind) return false;
  if (pending.text !== incoming.text) return false;
  if (pending.kind === "text") return true;

  const sent = pending.file?.name ?? "";
  const got = incoming.file?.name ?? "";
  // Server nomni o'zgartirishi mumkin (`images_x1y2.jpeg`) — bosh qismi yetadi.
  const stem = (name: string) => name.replace(/\.[^.]+$/, "").toLowerCase();
  return !sent || !got || stem(got).startsWith(stem(sent).slice(0, 12));
}
