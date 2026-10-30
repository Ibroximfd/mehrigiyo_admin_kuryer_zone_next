import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Kuryerdan kelgan, logist hali ochmagan chat xabarlari — buyurtma bo'yicha.
 *
 * Backend logist uchun buyurtma bo'yicha o'qilmagan sonini bermaydi, shuning
 * uchun hisob soket hodisasidan (`order_message_created`) yig'iladi va
 * brauzerda saqlanadi: sahifa yangilansa ham belgi yo'qolmaydi. Buyurtmaning
 * chati ochilishi bilan yozuv o'chadi.
 */
export type CourierInboxEntry = {
  orderId: string;
  /** Buyurtma raqami — keshda bo'lsa; bo'lmasa keyin to'ldiriladi. */
  orderNumber: string | null;
  courierName: string;
  /** Oxirgi xabar matni yoki "Ovozli xabar". */
  preview: string;
  count: number;
  /** Oxirgi xabar vaqti (ms). */
  at: number;
};

/** Eskilari tozalanadi — localStorage cheksiz o'smasin. */
const MAX_ENTRIES = 100;

type CourierInboxState = {
  entries: Record<string, CourierInboxEntry>;
  add: (entry: Omit<CourierInboxEntry, "count">) => void;
  setOrderNumber: (orderId: string, orderNumber: string) => void;
  clear: (orderId: string) => void;
};

export const useCourierInboxStore = create<CourierInboxState>()(
  persist(
    (set, get) => ({
      entries: {},

      add: (entry) => {
        const current = get().entries[entry.orderId];
        const next: Record<string, CourierInboxEntry> = {
          ...get().entries,
          [entry.orderId]: {
            ...entry,
            orderNumber: entry.orderNumber ?? current?.orderNumber ?? null,
            count: (current?.count ?? 0) + 1,
          },
        };
        set({ entries: trimmed(next) });
      },

      setOrderNumber: (orderId, orderNumber) => {
        const current = get().entries[orderId];
        if (!current || current.orderNumber === orderNumber) return;
        set({
          entries: { ...get().entries, [orderId]: { ...current, orderNumber } },
        });
      },

      clear: (orderId) => {
        if (!get().entries[orderId]) return;
        const next = { ...get().entries };
        delete next[orderId];
        set({ entries: next });
      },
    }),
    { name: "mehrigiyo-logist-courier-inbox" },
  ),
);

function trimmed(
  entries: Record<string, CourierInboxEntry>,
): Record<string, CourierInboxEntry> {
  const list = Object.values(entries);
  if (list.length <= MAX_ENTRIES) return entries;
  return Object.fromEntries(
    list
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_ENTRIES)
      .map((entry) => [entry.orderId, entry]),
  );
}

/** Buyurtma bo'yicha yozuv (yo'q bo'lsa `undefined`). */
export function useCourierInboxFor(
  orderId: string,
): CourierInboxEntry | undefined {
  return useCourierInboxStore((state) => state.entries[orderId]);
}

/** Kuryer xabari kutayotgan buyurtmalar soni. */
export function useCourierInboxCount(): number {
  return useCourierInboxStore((state) => Object.keys(state.entries).length);
}
