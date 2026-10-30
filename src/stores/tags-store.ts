import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Buyurtma teglari — **zaxira** qavat.
 *
 * Asosiy manba serverda (buyurtmaning `tags` maydoni, BACKEND-LOGIST
 * §4.13). Bu store faqat backend o'sha maydonni yubormagan javoblar uchun
 * ishlaydi — sayt eski javob bilan ham teglarni yo'qotmaydi. Bo'sh
 * ro'yxatli yozuvlar saqlanmaydi — xotira o'smaydi.
 */
type TagsState = {
  /** orderId → teg qiymatlari ro'yxati. */
  byOrder: Record<string, string[]>;

  toggle: (orderId: string, tag: string) => void;
};

export const useTagsStore = create<TagsState>()(
  persist(
    (set, get) => ({
      byOrder: {},

      toggle: (orderId, tag) => {
        const current = get().byOrder[orderId] ?? [];
        const next = current.includes(tag)
          ? current.filter((item) => item !== tag)
          : [...current, tag];

        const byOrder = { ...get().byOrder };
        if (next.length === 0) delete byOrder[orderId];
        else byOrder[orderId] = next;
        set({ byOrder });
      },
    }),
    { name: "mehrigiyo-logist-tags" },
  ),
);

/** Bitta buyurtmaning teglari — komponentlar shu selektordan o'qiydi. */
const EMPTY: string[] = [];
export function useOrderTags(orderId: string): string[] {
  return useTagsStore((state) => state.byOrder[orderId] ?? EMPTY);
}
