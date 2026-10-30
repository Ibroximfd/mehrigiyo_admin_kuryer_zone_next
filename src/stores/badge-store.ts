import { create } from "zustand";

/**
 * Soketdan kelgan yangi hodisalar hisoblagichi — sidebar badge'lari va
 * tab sarlavhasi/favicon shu yerdan o'qiydi.
 *
 *   newOrders         — yangi `confirmed` buyurtmalar (logist ishi boshlanadi);
 *   incomingTransfers — javob kutayotgan kiruvchi transferlar.
 *
 * Tegishli bo'lim ochilganda hisob nolga tushadi — hodisa "ko'rildi".
 */
type BadgeState = {
  newOrders: number;
  incomingTransfers: number;

  incrementOrders: () => void;
  clearOrders: () => void;
  incrementTransfers: () => void;
  clearTransfers: () => void;
};

export const useBadgeStore = create<BadgeState>()((set) => ({
  newOrders: 0,
  incomingTransfers: 0,

  incrementOrders: () => set((state) => ({ newOrders: state.newOrders + 1 })),
  clearOrders: () => set({ newOrders: 0 }),
  incrementTransfers: () =>
    set((state) => ({ incomingTransfers: state.incomingTransfers + 1 })),
  clearTransfers: () => set({ incomingTransfers: 0 }),
}));
