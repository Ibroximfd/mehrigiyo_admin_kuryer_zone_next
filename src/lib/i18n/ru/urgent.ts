import type { Dictionary } from "../matcher";

/** Shoshilinch zakaz (hujjat 123): banner, «Zakazlar»dagi bo'lim, detal, tarix. */
export const URGENT: Dictionary = {
  "Shoshilinch zakaz": "Срочный заказ",
  "Shoshilinch zakazlar": "Срочные заказы",
  "Shoshilinch zakazlar: {n}": "Срочные заказы: {n}",
  // Tab sarlavhasi.
  "Shoshilinch: {n}": "Срочные: {n}",
  "Shoshilinch edi": "Был срочным",
  hozirgina: "только что",
  "Yana {n} ta shoshilinch zakaz qabul qilinmagan": "Ещё не принято срочных заказов: {n}",
  "{n} tasi qabul qilinmagan": "не принято: {n}",
  "{n} daqiqada qabul qilinmasa logistga xabar boradi":
    "Если не принять за {n} {n|минуту|минуты|минут}, логист получит уведомление",
  "Hali qabul qilinmagan": "Ещё не принят",
  "Qabul qilindi": "Принят",
  // Ikki nuqta bilan alohida: aks holda «Qabul {x}» shabloni ilib ketadi.
  "Qabul qilindi:": "Принят:",
  "Qabul qilindi — kuryerga bering": "Принят — передайте курьеру",
  "Qabul qilishda xatolik": "Ошибка при принятии",
  "Zakaz endi shoshilinch emas yoki sizda emas": "Заказ больше не срочный или уже не у вас",
  // ── Tarix (§8) ──────────────────────────────────────────────────────────
  "Shoshilinch qilindi": "Отмечен срочным",
  "Shoshilinch — qabul qilindi": "Срочный — принят",
  "Shoshilinch — takror ogohlantirish": "Срочный — повторное напоминание",
  "Shoshilinch belgisi olib tashlandi": "Срочность снята",
};
