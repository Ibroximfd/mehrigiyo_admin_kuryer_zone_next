/**
 * Buyurtma teglari — logistning tez belgilari (LOGIST-PLAN §14).
 *
 * To'plam ataylab yopiq va qisqa: erkin matn emas, to'rtta aniq holat.
 * Ranglar mavzu tokenlaridan — light/dark o'zi moslashadi.
 *
 * Saqlash — serverda: buyurtmaning `tags` maydoni (BACKEND-LOGIST §4.13),
 * PATCH bilan to'liq ro'yxat qayta yoziladi. Backend maydonni yubormasa
 * komponent qurilma xotirasiga tushadi (`stores/tags-store.ts`).
 */
export const ORDER_TAGS = [
  { value: "recall", label: "Qayta qo'ng'iroq", color: "var(--warn)" },
  { value: "payment", label: "To'lov muammosi", color: "var(--danger)" },
  { value: "big", label: "Yirik zakaz", color: "var(--info)" },
  { value: "urgent", label: "Shoshilinch", color: "var(--brand)" },
] as const;

export type OrderTag = (typeof ORDER_TAGS)[number]["value"];

export function tagInfo(value: string) {
  return (
    ORDER_TAGS.find((tag) => tag.value === value) ?? {
      value,
      label: value,
      color: "var(--ink-muted)",
    }
  );
}
