import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ActivityEntry } from "@/features/activity/types";

/**
 * Harakatlar lentasi — filialda kim nima qilganining **jonli** qatlami.
 *
 * Bir vaqtda bir necha logist (har biri o'z profili bilan) bitta ma'lumot
 * ustida ishlaydi. Backend har o'zgarishni filial guruhiga WS orqali
 * yuboradi (`BACKEND-LOGIST.md` §4.9, `order_status_changed` da `changed_by`
 * bor) — shu hodisalar shu yerga yoziladi va "ko'rilmagan" hisoblagichini
 * yoqadi (yon paneldagi nuqta).
 *
 * To'liq tarix serverdan keladi (§4.11, `features/activity/api.ts`); bu
 * store esa ikki ish qiladi: hodisani darhol ko'rsatadi va jurnal endpointi
 * bo'lmasa yagona manba bo'lib qoladi. `localStorage`da oxirgi 120 ta yozuv
 * saqlanadi — sahifa yangilanganda lenta bo'shab qolmaydi.
 */
export type { ActivityEntry };

const LIMIT = 120;

type ActivityState = {
  entries: ActivityEntry[];
  /** Panel oxirgi ochilgan vaqt — undan keyingilar "yangi" hisoblanadi. */
  lastSeenAt: string;
  /** Yon panel ochiq-yopiqligi (saqlanmaydi). */
  open: boolean;

  record: (entry: Omit<ActivityEntry, "id" | "at">) => void;
  setOpen: (open: boolean) => void;
  markSeen: () => void;
  clear: () => void;
};

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      entries: [],
      lastSeenAt: new Date(0).toISOString(),
      open: false,

      record: (entry) => {
        const full: ActivityEntry = {
          ...entry,
          id: newId(),
          at: new Date().toISOString(),
        };
        // Eng yangisi birinchi; ro'yxat chegaralangan — xotira o'smaydi.
        set({ entries: [full, ...get().entries].slice(0, LIMIT) });
      },

      setOpen: (open) => {
        set({ open });
        // Panel ochilganda hammasi "ko'rildi" bo'ladi.
        if (open) set({ lastSeenAt: new Date().toISOString() });
      },

      markSeen: () => set({ lastSeenAt: new Date().toISOString() }),

      clear: () => set({ entries: [] }),
    }),
    {
      name: "mehrigiyo-logist-activity",
      // `open` saqlanmaydi — sahifa har doim yopiq panel bilan ochiladi.
      partialize: (state) => ({
        entries: state.entries,
        lastSeenAt: state.lastSeenAt,
      }),
    },
  ),
);

/** Ko'rilmagan yozuvlar soni — sidebar badge'i shu bilan yonadi. */
export function useUnseenActivityCount(): number {
  return useActivityStore((state) => {
    const seen = state.lastSeenAt;
    let count = 0;
    for (const entry of state.entries) {
      if (entry.at > seen) count += 1;
      else break; // ro'yxat yangidan eskiga tartiblangan
    }
    return count;
  });
}
