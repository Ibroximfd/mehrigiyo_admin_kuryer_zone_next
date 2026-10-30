import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Interfeys sozlamalari — brauzerda saqlanadi, shuning uchun logist panelni
 * yig'ib qo'ysa yoki ovozni o'chirsa, ertasi kuni ham shundayligicha ochiladi.
 */
type UiState = {
  sidebarCollapsed: boolean;
  /** Yangi buyurtma/transfer kelganda ovozli signal. */
  soundEnabled: boolean;
  /** Brauzer bildirishnomalari (boshqa tabda ishlayotganda). */
  desktopAlertsEnabled: boolean;
  /** Sokin soatlar: yoqilgan bo'lsa shu oraliqda ovoz chalinmaydi. */
  quietEnabled: boolean;
  quietFrom: string;
  quietTo: string;
  /** Buyurtmalar sahifasi: ustunlar doskasi yoki jadval. */
  ordersView: OrdersView;
  /**
   * Doska va ro'yxat tartibi (`features/orders/order-sort.ts`). Satr
   * sifatida saqlanadi — noma'lum qiymat o'qishda sukutga tushadi.
   */
  ordersSort: string;
  /**
   * Doskada yashirilgan ustunlar (status kalitlari, `review` ham). Logist
   * o'zi ishlaydigan ustunlarni qoldiradi — keyingi kun ham shunday.
   */
  hiddenBoardColumns: string[];
  /** Qator balandligi. Kun bo'yi jadval ko'radiganlar `compact` ni tanlaydi. */
  density: Density;
  /**
   * Bezak darajasini qo'lda belgilash. `null` — mashinaga qarab o'zi
   * aniqlanadi (`layout.tsx` dagi boot skripti).
   */
  perfOverride: PerfTier | null;

  toggleSidebar: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDesktopAlertsEnabled: (enabled: boolean) => void;
  setQuietHours: (input: {
    enabled: boolean;
    from?: string;
    to?: string;
  }) => void;
  setOrdersView: (view: OrdersView) => void;
  setOrdersSort: (sort: string) => void;
  setHiddenBoardColumns: (columns: string[]) => void;
  setDensity: (density: Density) => void;
  setPerfOverride: (tier: PerfTier | null) => void;
};

export type OrdersView = "board" | "list";
export type Density = "comfortable" | "compact";
export type PerfTier = "low" | "medium" | "high";

/**
 * Atributni `<html>` ga yozadi. Boot skripti buni birinchi chizishdan
 * oldin bir marta qiladi; bu yerdagisi — foydalanuvchi sozlamani
 * o'zgartirganda, sahifani yangilamasdan.
 */
function applyAttribute(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (value === null) document.documentElement.removeAttribute(name);
  else document.documentElement.setAttribute(name, value);
}

/** Mashinaga qarab pog'onani aniqlaydi — boot skripti bilan bir xil mantiq. */
export function detectPerfTier(): PerfTier {
  if (typeof navigator === "undefined") return "low";
  const cores = navigator.hardwareConcurrency || 2;
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 2;
  const reduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || cores <= 4 || memory <= 4) return "low";
  if (cores >= 8 && memory >= 8) return "high";
  return "medium";
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      soundEnabled: true,
      desktopAlertsEnabled: true,
      quietEnabled: false,
      quietFrom: "21:00",
      quietTo: "09:00",
      ordersView: "board",
      ordersSort: "status",
      hiddenBoardColumns: [],
      density: "comfortable",
      perfOverride: null,

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setDesktopAlertsEnabled: (desktopAlertsEnabled) =>
        set({ desktopAlertsEnabled }),
      setQuietHours: ({ enabled, from, to }) =>
        set({
          quietEnabled: enabled,
          ...(from ? { quietFrom: from } : {}),
          ...(to ? { quietTo: to } : {}),
        }),
      setOrdersView: (ordersView) => set({ ordersView }),
      setOrdersSort: (ordersSort) => set({ ordersSort }),
      setHiddenBoardColumns: (hiddenBoardColumns) => set({ hiddenBoardColumns }),

      setDensity: (density) => {
        applyAttribute("data-density", density);
        set({ density });
      },

      setPerfOverride: (perfOverride) => {
        applyAttribute("data-perf", perfOverride ?? detectPerfTier());
        set({ perfOverride });
      },
    }),
    { name: "mehrigiyo-logist-ui" },
  ),
);

/**
 * Hozir sokin soatlar ichidamizmi. Oraliq yarim tunni kesib o'tishi mumkin
 * (21:00–09:00) — shunda "dan katta YOKI dan kichik" mantiqi ishlaydi.
 */
export function isQuietNow(): boolean {
  const { quietEnabled, quietFrom, quietTo } = useUiStore.getState();
  if (!quietEnabled) return false;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const parse = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const from = parse(quietFrom);
  const to = parse(quietTo);

  if (from === to) return false;
  return from < to
    ? current >= from && current < to
    : current >= from || current < to;
}
