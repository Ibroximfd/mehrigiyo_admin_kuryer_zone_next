import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * "Oldim" belgisi — **zaxira** qavat (backend `acknowledged_by` chiqquncha).
 *
 * Logist akkaunti bo'yicha ajratilgan: bitta brauzerda ikki logist
 * navbatma-navbat kirsa, biri olgan buyurtma ikkinchisida "yangi" bo'lib
 * qolaveradi. `seen` — logist buyurtmani oxirgi ko'rgan payt ("ko'rilmagan
 * o'zgarish" nuqtasi uchun, server rejimida ham ishlatiladi).
 *
 * Xotira o'smasin: har ro'yxatda eng yangi `MAX_ENTRIES` ta qoladi.
 */
const MAX_ENTRIES = 600;

type UserAcks = {
  baselineAt: number;
  acks: Record<string, number>;
  seen: Record<string, number>;
};

type AckStoreState = {
  byUser: Record<string, UserAcks>;
  /** Birinchi ochilish — shu paytdan oldingi buyurtmalar "yangi" emas. */
  ensureBaseline: (userId: string, now: number) => void;
  acknowledge: (userId: string, orderId: string, at: number) => void;
  markSeen: (userId: string, orderId: string, at: number) => void;
};

function trimmed(record: Record<string, number>): Record<string, number> {
  const entries = Object.entries(record);
  if (entries.length <= MAX_ENTRIES) return record;
  return Object.fromEntries(
    entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_ENTRIES),
  );
}

function userOf(state: AckStoreState, userId: string, now: number): UserAcks {
  return state.byUser[userId] ?? { baselineAt: now, acks: {}, seen: {} };
}

export const useAckStore = create<AckStoreState>()(
  persist(
    (set, get) => ({
      byUser: {},

      ensureBaseline: (userId, now) => {
        if (get().byUser[userId]) return;
        set({ byUser: { ...get().byUser, [userId]: userOf(get(), userId, now) } });
      },

      acknowledge: (userId, orderId, at) => {
        const user = userOf(get(), userId, at);
        set({
          byUser: {
            ...get().byUser,
            [userId]: {
              ...user,
              acks: trimmed({ ...user.acks, [orderId]: at }),
              seen: trimmed({ ...user.seen, [orderId]: at }),
            },
          },
        });
      },

      markSeen: (userId, orderId, at) => {
        const user = userOf(get(), userId, at);
        set({
          byUser: {
            ...get().byUser,
            [userId]: { ...user, seen: trimmed({ ...user.seen, [orderId]: at }) },
          },
        });
      },
    }),
    { name: "mehrigiyo-logist-acks" },
  ),
);
