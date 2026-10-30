import { formatDayHeader, parseDate } from "@/lib/format";

import type { StaffReadCursor } from "./store";
import { STAFF_READERS_LIMIT } from "./types";
import type { StaffMessage, StaffMessagesPage, StaffReader } from "./types";

/**
 * Suhbat lentasi — sahifalar (tarix) va jonli oqim (soket) bitta ro'yxatga.
 *
 * Ikkalasi alohida turadi: tarix kursor bo'yicha sahifalanadi va unga yangi
 * xabar qo'shilsa keyingi `before_id` noto'g'ri bo'lib qolardi. Qo'shilish
 * shu yerda, chizishdan oldin bo'ladi.
 */
export function mergeStaffTimeline(
  pages: readonly StaffMessagesPage[] | undefined,
  live: readonly StaffMessage[] = [],
  deletedIds: readonly number[] = [],
  readCursors: Readonly<Record<string, StaffReadCursor>> = {},
): StaffMessage[] {
  const merged = new Map<number, StaffMessage>();

  for (const page of pages ?? []) {
    for (const message of page.messages) merged.set(message.id, message);
  }

  /*
   * Jonli nusxa mazmun bo'yicha ustun (tahrir o'shanda aks etadi), lekin
   * **tomon tarixdan olinadi**: REST javobidagi `is_mine` aynan so'rovchi
   * uchun hisoblangan, soketdagi esa hamma obunachiga bitta. Xabar
   * kanal yopiq turganda kelib, keyin tarix bilan birga ochilsa — tarix
   * haq, va sahifani yangilash shart bo'lmaydi.
   */
  for (const message of live) {
    const known = merged.get(message.id);
    merged.set(
      message.id,
      known && known.isMine !== message.isMine
        ? {
            ...message,
            isMine: known.isMine,
            sender: message.sender ?? known.sender,
          }
        : message,
    );
  }

  /*
   * O'chirish hodisasida faqat id keladi. Xabarning o'zi tarix sahifasida
   * bo'lishi mumkin, u yerga tegib bo'lmaydi (kursor buziladi) — shuning
   * uchun belgi shu yerda qo'yiladi.
   */
  for (const id of deletedIds) {
    const message = merged.get(id);
    if (message && !message.isDeleted) {
      merged.set(id, { ...message, isDeleted: true, text: "", file: null });
    }
  }

  /*
   * O'qildi belgisi — kursorlardan. Server ham xuddi shunday hisoblaydi
   * (har xabarga qator yozilmaydi), shuning uchun jonli holat va so'rov
   * javobi bir xil qoidaga bo'ysunadi.
   */
  const cursors = Object.values(readCursors);
  if (cursors.length > 0) {
    for (const [id, message] of merged) {
      const updated = applyReadCursors(message, cursors);
      if (updated !== message) merged.set(id, updated);
    }
  }

  /*
   * Yuborilayotgan (mahalliy) xabar har doim **oxirida** turadi. Uning
   * vaqti brauzer soatidan olingan; soat server bilan bir necha soniya
   * farq qilsa, u tasdiqlangan xabarlar orasiga tushib, javob kelganda
   * "sakrab" qo'yardi. Telegram ham yuborilayotganini pastda ushlaydi.
   */
  return [...merged.values()].sort((a, b) => {
    const localA = a.id <= 0;
    const localB = b.id <= 0;
    if (localA !== localB) return localA ? 1 : -1;

    const left = parseDate(a.createdAt)?.getTime() ?? a.id;
    const right = parseDate(b.createdAt)?.getTime() ?? b.id;
    // Mahalliy id'lar manfiy va kamayib boradi — kattasi eskisi.
    return left === right ? (localA ? b.id - a.id : a.id - b.id) : left - right;
  });
}

/** Ro'yxatdagi odamning kaliti — id bo'lmasa ism bo'yicha. */
function readerKey(userId: number | null, fullName: string): string {
  return userId !== null ? `id:${userId}` : `name:${fullName}`;
}

/**
 * Kursorlarni bitta xabarga qo'llaydi.
 *
 * Faqat o'z xabarimizga: begonanikida belgi ko'rsatilmaydi.
 *
 * Hisob ikki xil yo'l bilan chiqadi. Ismlar ro'yxati to'liq bo'lsa
 * (`read_count` ismlar sonidan katta emas — buyurtma muhokamasidagi odatiy
 * holat) yangi odam aniq qo'shiladi. Ro'yxat qirqilgan bo'lsa (100 kishilik
 * guruh, 10 ta ism) kelgan odam allaqachon sanalganmi — bilib bo'lmaydi,
 * shuning uchun hisob faqat pastdan chegaralanadi: ortiqcha sanashdan ko'ra
 * bir oz kechikkani afzal, keyingi so'rov uni baribir to'g'rilaydi.
 */
function applyReadCursors(
  message: StaffMessage,
  cursors: readonly StaffReadCursor[],
): StaffMessage {
  if (!message.isMine || message.id <= 0) return message;

  const authorId = message.sender?.userId ?? null;
  const known = new Map<string, StaffReader>(
    message.readers.map((reader) => [
      readerKey(reader.userId, reader.fullName),
      reader,
    ]),
  );

  let added = 0;
  for (const cursor of cursors) {
    if (cursor.lastReadMessageId < message.id) continue;
    // Muallifning o'z kursori — o'qish emas.
    if (authorId !== null && cursor.userId === authorId) continue;

    const key = readerKey(cursor.userId, cursor.fullName);
    if (known.has(key)) continue;
    known.set(key, { userId: cursor.userId, fullName: cursor.fullName });
    added += 1;
  }

  if (added === 0) return message;

  const complete = message.readCount <= message.readers.length;
  const readCount = complete
    ? message.readCount + added
    : Math.max(message.readCount, known.size);

  return {
    ...message,
    isRead: true,
    readCount,
    readers: [...known.values()].slice(0, STAFF_READERS_LIMIT),
  };
}

export type StaffDayGroup = {
  key: string;
  label: string;
  /** Xabar va uning yonida "ism ko'rsatilsinmi" bayrog'i. */
  rows: Array<{ message: StaffMessage; showSender: boolean }>;
};

/** Ketma-ket kelgan xabarlar bitta odamnikimi. */
function sameAuthor(a: StaffMessage, b: StaffMessage): boolean {
  if (a.kind === "system" || b.kind === "system") return false;
  if (a.isMine !== b.isMine) return false;

  const left = a.sender?.userId ?? a.sender?.username ?? null;
  const right = b.sender?.userId ?? b.sender?.username ?? null;
  return left !== null && left === right;
}

/**
 * Kunlar bo'yicha guruhlaydi va har bir xabar uchun "ism chizilsinmi"
 * degan savolga javob beradi.
 *
 * Ko'p kishilik suhbatda ism har xabarda takrorlansa lenta ism ustuniga
 * aylanadi; umuman bo'lmasa esa kim yozganini bilib bo'lmaydi. Shuning
 * uchun ism faqat **ketma-ketlik boshida** ko'rinadi — bir odam ketma-ket
 * uchta xabar yozsa, ismi bir marta chiziladi.
 */
export function groupStaffByDay(
  messages: readonly StaffMessage[],
): StaffDayGroup[] {
  const groups: StaffDayGroup[] = [];

  messages.forEach((message, index) => {
    const date = parseDate(message.createdAt);
    const key = date ? date.toDateString() : "unknown";
    const label = date ? formatDayHeader(date) : "";

    const previous = messages[index - 1];
    const showSender = !previous || !sameAuthor(previous, message);

    const last = groups.at(-1);
    if (last && last.key === key) {
      // Kun almashgan joyda ism qaytadan chiziladi — sarlavha oralab
      // ketgan ikki xabar bir-biriga ulanib ko'rinmasin.
      last.rows.push({ message, showSender });
    } else {
      groups.push({ key, label, rows: [{ message, showSender: true }] });
    }
  });

  return groups;
}

/**
 * "Yangi xabarlar" ajratgichi qaysi xabardan oldin turadi.
 *
 * Kanal ochilgan paytdagi o'qilmaganlar soni (`unread`) ma'lum, xabar
 * id'lari esa yo'q — shuning uchun ajratgich **begona** server
 * xabarlarining oxirgi `unread` tasining birinchisiga qo'yiladi. O'z
 * xabarimiz va yuborilayotganlar sanalmaydi: ular o'qilmagan bo'lolmaydi.
 * `null` — ajratgich kerak emas.
 */
export function findFirstUnreadId(
  messages: readonly StaffMessage[],
  unread: number,
): number | null {
  if (unread <= 0) return null;
  const foreign = messages.filter(
    (message) => message.id > 0 && !message.isMine,
  );
  if (foreign.length === 0) return null;
  return foreign[Math.max(0, foreign.length - unread)].id;
}
