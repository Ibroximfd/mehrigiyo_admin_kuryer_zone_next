import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Shrift o'lchamlari shkalasi — `globals.css` dagi `--text-*` tokenlari
 * bilan bir xil ro'yxat (`src/lib/utils.test.ts` CSS bilan solishtiradi).
 *
 * ── Nega bu kerak ────────────────────────────────────────────────────────
 * `tailwind-merge` `text-*` klassini ikki guruhga ajratadi: o'lcham va rang.
 * Qaysi guruhga tushishini u qiymat nomidan taxmin qiladi va faqat standart
 * o'lchamlarni (`xs`, `sm`, `lg`, `2xl`, `[14px]`) taniydi.
 *
 * Bizning shkalamiz esa o'z nomlariga ega (`micro`, `dense`, `lg2`…),
 * shuning uchun ular RANG deb hisoblanardi. Natijada
 *
 *     cn("text-micro ... text-gold")
 *
 * ikkita "rang" sifatida to'qnashib, oxirgisi g'olib chiqardi: `PaymentBadge`
 * compact o'lchamini, `PointsBadge` esa rangini jimgina yo'qotardi.
 *
 * Ro'yxatni bu yerga berish bilan ular yana o'lcham guruhiga tushadi va
 * rang bilan hech qachon to'qnashmaydi.
 */
const FONT_SIZES = [
  "micro",
  "fine",
  "meta",
  "dense",
  "body",
  "lg2",
  "title",
  "h1",
  "display",
  "stat",
  "hero",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
