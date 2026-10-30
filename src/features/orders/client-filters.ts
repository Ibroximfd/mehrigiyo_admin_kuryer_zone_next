/**
 * Tezkor chiplar.
 *
 * Kuryersiz · Bugun yetkaziladi · Kechikkan · Onlayn to'langan — SERVER
 * parametrlari (`server-filters.ts`, 2026-10-01 C §11): doska ustuni 20
 * qatorga qirqiladi, mijozdagi filtr "N more" ichidagini ko'rmasdi.
 *
 * Serverda parametri YO'Q ikkitasi mijozda qoladi va yuklangan kartalar
 * ustida ishlaydi:
 *   "Yangi"       — hali hech kim "Oldim" demagan (`acknowledgement.ts`);
 *   "Yangi xabar" — buyurtma chatida o'qilmagan xabar bor
 *                   (`unread-by-order/` — chegarasiz, §13.1).
 *
 * Sof funksiyalar.
 */

export const QUICK_FILTERS = [
  { value: "fresh", label: "Yangi", tone: "accent", server: false },
  { value: "unread_chat", label: "Yangi xabar", tone: "chat", server: false },
  { value: "no_courier", label: "Bosh kuryersiz", tone: "amber", server: true },
  { value: "due_today", label: "Bugun yetkaziladi", tone: "plain", server: true },
  { value: "late", label: "Kechikkan", tone: "danger", server: true },
  { value: "online_paid", label: "Onlayn to'langan", tone: "plain", server: true },
] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number]["value"];

/** Chip yonidagi son; `null` — son ko'rsatilmaydi (serverda sanalmaydi). */
export type QuickCounts = Record<QuickFilter, number | null>;

export function isServerQuickFilter(value: string | null | undefined): boolean {
  return QUICK_FILTERS.some((chip) => chip.value === value && chip.server);
}

export type ClientQuickFilter = {
  quick?: string | null;
  isFresh?: (orderId: string) => boolean;
  hasUnreadChat?: (orderId: string) => boolean;
};

/** Faqat mijoz chiplari; server chipi yoki chipsiz — `true`. */
export function matchesClientQuick(orderId: string, filter: ClientQuickFilter): boolean {
  if (filter.quick === "fresh") return filter.isFresh?.(orderId) ?? false;
  if (filter.quick === "unread_chat") return filter.hasUnreadChat?.(orderId) ?? false;
  return true;
}

export function hasClientQuick(filter: ClientQuickFilter): boolean {
  return filter.quick === "fresh" || filter.quick === "unread_chat";
}

export function applyClientQuick<TOrder extends { id: string }>(
  orders: TOrder[],
  filter: ClientQuickFilter,
): TOrder[] {
  if (!hasClientQuick(filter)) return orders;
  return orders.filter((order) => matchesClientQuick(order.id, filter));
}

/**
 * Chip sonlari:
 *   "Yangi"       — yuklangan kartalar bo'yicha;
 *   "Yangi xabar" — filialdagi o'qilmagani bor buyurtmalar (server soni);
 *   server chiplari — faqat yoqilganida, javobdagi jami (`serverTotal`);
 *   qolgan holatda son yo'q (yuklangan 20 tadan sanash yolg'on bo'lardi).
 */
export function quickFilterCounts({
  orders,
  active,
  serverTotal,
  isFresh,
  unreadChatOrders,
}: {
  orders: readonly { id: string }[];
  active: string | null;
  serverTotal: number | null;
  isFresh: (orderId: string) => boolean;
  unreadChatOrders: number;
}): QuickCounts {
  let fresh = 0;
  for (const order of orders) if (isFresh(order.id)) fresh += 1;
  const serverCount = (value: QuickFilter) => (active === value ? serverTotal : null);
  return {
    fresh,
    unread_chat: unreadChatOrders,
    no_courier: serverCount("no_courier"),
    due_today: serverCount("due_today"),
    late: serverCount("late"),
    online_paid: serverCount("online_paid"),
  };
}
