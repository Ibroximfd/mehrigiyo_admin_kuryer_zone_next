import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Eslatmalar — "mijoz 15:00da qayta qo'ng'iroq dedi" (LOGIST-PLAN §14).
 *
 * Qurilmada saqlanadi; vaqti kelganda `panel-shell` tekshiruvchisi toast +
 * desktop bildirishnoma chiqaradi. Yonib bo'lgan eslatma (`fired`) ro'yxatda
 * qoladi — logist ko'rib o'chirmaguncha yo'qolmaydi.
 */
export type Reminder = {
  id: string;
  orderId: string;
  orderNumber: string;
  /** ISO vaqt — qachon eslatish. */
  at: string;
  note: string;
  /** Signal allaqachon berilganmi (takror jiringlamasin). */
  fired: boolean;
};

type RemindersState = {
  list: Reminder[];

  add: (input: Omit<Reminder, "id" | "fired">) => void;
  remove: (id: string) => void;
  markFired: (id: string) => void;
};

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      list: [],

      add: (input) =>
        set({
          list: [...get().list, { ...input, id: newId(), fired: false }].sort(
            (a, b) => a.at.localeCompare(b.at),
          ),
        }),

      remove: (id) =>
        set({ list: get().list.filter((item) => item.id !== id) }),

      markFired: (id) =>
        set({
          list: get().list.map((item) =>
            item.id === id ? { ...item, fired: true } : item,
          ),
        }),
    }),
    { name: "mehrigiyo-logist-reminders" },
  ),
);

/** Buyurtmaga qo'yilgan (hali yonmagan) eslatma bormi — kartadagi belgi. */
export function useOrderHasReminder(orderId: string): boolean {
  return useRemindersStore((state) =>
    state.list.some((item) => item.orderId === orderId && !item.fired),
  );
}
