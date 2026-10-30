"use client";

import { create } from "zustand";

import { matchesPendingStaffMessage, releaseLocalStaffFile } from "./types";
import type { StaffMessage } from "./types";

/**
 * Bitta xodimning kanaldagi o'qish kursori.
 *
 * `staff_read` hodisasi aynan shuni beradi: "Vali 502-xabargacha o'qidi".
 * Har xabar uchun alohida belgi kelmaydi — bitta kursor undan kichik
 * hamma xabarni yopadi.
 */
export type StaffReadCursor = {
  userId: number | null;
  fullName: string;
  lastReadMessageId: number;
};

/**
 * Xodimlar chatining "jonli" qismi — soketdan kelgan xabarlar va yozish
 * indikatori.
 *
 * Nega React Query keshida emas: xabarlar kursor bo'yicha sahifalanadi
 * (`useInfiniteQuery`), ya'ni yangi xabarni "birinchi sahifa"ga qo'shish
 * kursorni buzadi — keyingi `before_id` noto'g'ri bo'lib qoladi. Shuning
 * uchun tarix (so'rov) va jonli oqim (soket) alohida turadi va ekranda
 * qo'shiladi — mijoz chatidagi bilan bir xil naqsh.
 *
 * Yozish indikatori esa umuman keshga tegishli emas: u bir necha soniya
 * yashaydigan holat.
 */

/** Indikator oxirgi hodisadan keyin shuncha vaqt turadi. */
const TYPING_TTL_MS = 4000;

/**
 * Kanal bo'yicha saqlanadigan jonli xabarlar chegarasi.
 *
 * Umumiy guruhga obuna avtomatik: xabarlar sahifa ochilmagan bo'lsa ham
 * kelib turadi. Kun bo'yi ochiq turgan CRM'da ular cheksiz to'planib
 * ketmasligi kerak — eng eskisi tashlab yuboriladi va kerak bo'lsa
 * tarixdan qaytadan yuklanadi.
 */
const MAX_LIVE_PER_CHANNEL = 200;

type StaffLiveState = {
  /** `channelId` → o'sha kanalning jonli xabarlari (eskidan yangiga). */
  live: Record<number, StaffMessage[]>;
  /** `channelId` → `{ism: qachongacha ko'rinadi}`. */
  typing: Record<number, Record<string, number>>;
  /**
   * O'chirilgan xabarlarning id'lari — kanal bo'yicha.
   *
   * O'chirish hodisasida faqat id keladi, xabarning o'zi esa tarix
   * sahifasida (so'rov keshida) yotgan bo'lishi mumkin. Uni o'sha yerda
   * o'zgartirish kursorni buzadi, shuning uchun id shu yerda eslab
   * qolinadi va lenta chizilayotganda qo'llanadi.
   */
  deleted: Record<number, number[]>;
  /**
   * `channelId` → `userId` → o'qish kursori.
   *
   * O'chirilgan id'lar kabi bu ham keshda emas, shu yerda: tarix
   * sahifalari kursor bo'yicha olinadi va ularni joyida o'zgartirish
   * `before_id` ni buzadi. Belgilar lenta chizilayotganda qo'llanadi.
   */
  reads: Record<number, Record<string, StaffReadCursor>>;
  /**
   * Ayni damda ochiq turgan kanal.
   *
   * Real vaqt qatlami shu bo'yicha qaror qiladi: ochiq kanalda o'qilmagan
   * hisoblagichni oshirish noto'g'ri bo'lardi — operator xabarni ekranda
   * ko'rib turibdi.
   */
  openChannelId: number | null;
  /**
   * Obuna rad etilgan kanal (`staff_subscribe_denied`).
   *
   * Hodisa panel karkasiga keladi, kanalni yopish esa ekranning ishi —
   * shu bayroq ikkalasini bog'laydi.
   */
  deniedChannelId: number | null;

  setOpenChannel: (channelId: number | null) => void;
  setDeniedChannel: (channelId: number | null) => void;
  append: (message: StaffMessage) => void;
  /** Bor bo'lsa almashtiradi, bo'lmasa qo'shadi (tahrirlangan tarix xabari). */
  upsert: (message: StaffMessage) => void;
  markDeleted: (channelId: number, messageId: number) => void;
  /** `staff_read` — kursor faqat oldinga suriladi. */
  setReadCursor: (channelId: number, cursor: StaffReadCursor) => void;
  /**
   * Kanal yopilganda yoki tarix qayta yuklanganda.
   *
   * Yuborilayotgan va yiqilgan xabarlar **qoladi**: ular serverda yo'q,
   * tarix ularni qaytarib bermaydi va operator ularni yo'qotib qo'yardi.
   */
  reset: (channelId: number) => void;

  // ── Yuborilayotgan xabarlar (outbox) ──────────────────────────────────
  /** Tugma bosildi — vaqtinchalik xabar lentaga tushadi. */
  addPending: (message: StaffMessage) => void;
  /** Fayl yuklanish ulushi (0..1) yoki `null` — server javobi kutilmoqda. */
  setPendingProgress: (
    channelId: number,
    tempId: number,
    progress: number | null,
  ) => void;
  /** POST javobi keldi — vaqtinchalik o'rniga haqiqiysi. */
  resolvePending: (
    channelId: number,
    tempId: number,
    message: StaffMessage,
  ) => void;
  /**
   * Soket aks-sadosi: o'z xabarimiz kelgan bo'lsa, mos vaqtinchalikni
   * yopadi. `true` — yopildi (chaqiruvchi endi `append` qilmaydi).
   */
  resolvePendingByEcho: (message: StaffMessage) => boolean;
  failPending: (channelId: number, tempId: number, error: string) => void;
  /** Qayta yuborish oldidan — yana "yuborilmoqda" holatiga. */
  restartPending: (
    channelId: number,
    tempId: number,
    abort: AbortController | null,
  ) => void;
  /** Yiqilgan xabarni lentadan olib tashlash. */
  removePending: (channelId: number, tempId: number) => void;
  setTyping: (channelId: number, name: string, isTyping: boolean) => void;
  /** Muddati o'tganlarini olib tashlaydi; o'zgarish bo'lmasa tegmaydi. */
  pruneTyping: () => void;
};

/**
 * Vaqtinchalik xabar o'rniga haqiqiysini qo'yadi.
 *
 * Haqiqiysi soket orqali allaqachon kelgan bo'lishi mumkin (aks-sado POST
 * javobidan tez) — unda takror qo'shilmaydi, bori almashtiriladi.
 */
function settlePending(
  current: StaffMessage[],
  tempId: number,
  message: StaffMessage,
): StaffMessage[] {
  const temp = current.find((item) => item.id === tempId);
  if (temp) releaseLocalStaffFile(temp);

  const rest = current.filter((item) => item.id !== tempId);
  return rest.some((item) => item.id === message.id)
    ? rest.map((item) => (item.id === message.id ? message : item))
    : [...rest, message];
}

export const useStaffLiveStore = create<StaffLiveState>()((set, get) => ({
  live: {},
  typing: {},
  deleted: {},
  reads: {},
  openChannelId: null,
  deniedChannelId: null,

  setOpenChannel: (openChannelId) => set({ openChannelId }),
  setDeniedChannel: (deniedChannelId) => set({ deniedChannelId }),

  append: (message) =>
    set((state) => {
      const current = state.live[message.channelId] ?? [];
      // Takror — soket va POST javobi bir vaqtda yetib kelishi mumkin.
      if (current.some((item) => item.id === message.id)) return state;

      const next = [...current, message];
      return {
        live: {
          ...state.live,
          [message.channelId]:
            next.length > MAX_LIVE_PER_CHANNEL
              ? next.slice(next.length - MAX_LIVE_PER_CHANNEL)
              : next,
        },
      };
    }),

  upsert: (message) =>
    set((state) => {
      const current = state.live[message.channelId] ?? [];
      const next = current.some((item) => item.id === message.id)
        ? current.map((item) => (item.id === message.id ? message : item))
        : [...current, message];
      return { live: { ...state.live, [message.channelId]: next } };
    }),

  markDeleted: (channelId, messageId) =>
    set((state) => {
      const ids = state.deleted[channelId] ?? [];
      if (ids.includes(messageId)) return state;
      return {
        deleted: { ...state.deleted, [channelId]: [...ids, messageId] },
      };
    }),

  setReadCursor: (channelId, cursor) =>
    set((state) => {
      const key =
        cursor.userId !== null
          ? `id:${cursor.userId}`
          : `name:${cursor.fullName}`;
      const current = state.reads[channelId] ?? {};
      const known = current[key];
      // Kursor orqaga qaytmaydi — kechikib kelgan hodisa zarar qilmasin.
      if (known && known.lastReadMessageId >= cursor.lastReadMessageId) {
        return state;
      }
      return {
        reads: {
          ...state.reads,
          [channelId]: { ...current, [key]: cursor },
        },
      };
    }),

  reset: (channelId) =>
    set((state) => {
      const live = { ...state.live };
      const typing = { ...state.typing };
      const deleted = { ...state.deleted };
      const reads = { ...state.reads };
      const kept = (live[channelId] ?? []).filter(
        (item) => item.pending || item.failed,
      );
      if (kept.length > 0) live[channelId] = kept;
      else delete live[channelId];
      delete typing[channelId];
      delete deleted[channelId];
      delete reads[channelId];
      return { live, typing, deleted, reads };
    }),

  // ── Yuborilayotgan xabarlar ───────────────────────────────────────────
  addPending: (message) =>
    set((state) => ({
      live: {
        ...state.live,
        [message.channelId]: [
          ...(state.live[message.channelId] ?? []),
          message,
        ],
      },
    })),

  setPendingProgress: (channelId, tempId, progress) =>
    set((state) => {
      const current = state.live[channelId] ?? [];
      const target = current.find((item) => item.id === tempId);
      if (!target?.outbox || target.outbox.progress === progress) return state;
      return {
        live: {
          ...state.live,
          [channelId]: current.map((item) =>
            item.id === tempId && item.outbox
              ? { ...item, outbox: { ...item.outbox, progress } }
              : item,
          ),
        },
      };
    }),

  resolvePending: (channelId, tempId, message) =>
    set((state) => ({
      live: {
        ...state.live,
        [channelId]: settlePending(
          state.live[channelId] ?? [],
          tempId,
          message,
        ),
      },
    })),

  resolvePendingByEcho: (message) => {
    const current = get().live[message.channelId] ?? [];
    const match = current.find((item) =>
      matchesPendingStaffMessage(item, message),
    );
    if (!match) return false;
    set((state) => ({
      live: {
        ...state.live,
        [message.channelId]: settlePending(
          state.live[message.channelId] ?? [],
          match.id,
          message,
        ),
      },
    }));
    return true;
  },

  failPending: (channelId, tempId, error) =>
    set((state) => ({
      live: {
        ...state.live,
        [channelId]: (state.live[channelId] ?? []).map((item) =>
          item.id === tempId && item.outbox
            ? {
                ...item,
                pending: false,
                failed: true,
                outbox: { ...item.outbox, error, progress: null, abort: null },
              }
            : item,
        ),
      },
    })),

  restartPending: (channelId, tempId, abort) =>
    set((state) => ({
      live: {
        ...state.live,
        [channelId]: (state.live[channelId] ?? []).map((item) =>
          item.id === tempId && item.outbox
            ? {
                ...item,
                pending: true,
                failed: false,
                outbox: {
                  ...item.outbox,
                  error: null,
                  progress: item.outbox.file ? 0 : null,
                  abort,
                },
              }
            : item,
        ),
      },
    })),

  removePending: (channelId, tempId) =>
    set((state) => {
      const current = state.live[channelId] ?? [];
      const target = current.find((item) => item.id === tempId);
      if (!target) return state;
      releaseLocalStaffFile(target);
      return {
        live: {
          ...state.live,
          [channelId]: current.filter((item) => item.id !== tempId),
        },
      };
    }),

  setTyping: (channelId, name, isTyping) =>
    set((state) => {
      const current = { ...(state.typing[channelId] ?? {}) };

      if (isTyping) current[name] = Date.now() + TYPING_TTL_MS;
      else delete current[name];

      return { typing: { ...state.typing, [channelId]: current } };
    }),

  pruneTyping: () =>
    set((state) => {
      const now = Date.now();
      let changed = false;
      const typing: StaffLiveState["typing"] = {};

      for (const [channelId, people] of Object.entries(state.typing)) {
        const kept: Record<string, number> = {};
        for (const [name, until] of Object.entries(people)) {
          if (until > now) kept[name] = until;
          else changed = true;
        }
        typing[Number(channelId)] = kept;
      }

      return changed ? { typing } : state;
    }),
}));

/*
 * Barqaror bo'sh qiymatlar: har renderda yangi massiv qaytarilsa zustand
 * selektori "o'zgardi" deb hisoblab, lentani sababsiz qayta chizardi.
 */
const EMPTY_MESSAGES: StaffMessage[] = [];
const EMPTY_IDS: number[] = [];
const EMPTY_TYPING: Record<string, number> = {};
const EMPTY_READS: Record<string, StaffReadCursor> = {};

export function useStaffLiveMessages(channelId: number): StaffMessage[] {
  return useStaffLiveStore((state) => state.live[channelId] ?? EMPTY_MESSAGES);
}

export function useStaffDeletedIds(channelId: number): number[] {
  return useStaffLiveStore((state) => state.deleted[channelId] ?? EMPTY_IDS);
}

export function useStaffTyping(channelId: number): Record<string, number> {
  return useStaffLiveStore((state) => state.typing[channelId] ?? EMPTY_TYPING);
}

export function useStaffReadCursors(
  channelId: number,
): Record<string, StaffReadCursor> {
  return useStaffLiveStore((state) => state.reads[channelId] ?? EMPTY_READS);
}
