import type { Dictionary } from "../matcher";

/**
 * 136-javob «Markazlar, bitta logistika»: «Markaz» filtri (sotgan call-markaz),
 * Sotuv jadvalidagi «umumiy» izohi va Telegram sarlavhasi.
 */
export const CENTERS_136: Dictionary = {
  Markaz: "Центр",
  "Hamma markaz": "Все центры",
  "Markaz bo'yicha:": "По центру:",
  "Umumiy (markazga bo'linmaydi):": "Общее (не делится по центрам):",
  "sotuv, sovg'a, naqd va onlayn pul, skidka, manzillar.": "продажи, подарки, наличные и онлайн-деньги, скидки, адреса.",
  "sklad qoldig'i, kuryer xizmati, pul topshirig'i va qarz — ular hamma markaz uchun birga. Tahrir va «Oldim» — «Hamma markaz» ko'rinishida.":
    "остаток склада, оплата курьера, сдача денег и долг — они общие для всех центров. Правки и «Получил» — в режиме «Все центры».",
  "Markazlar ro'yxatini yuklashda xatolik": "Ошибка загрузки списка центров",
  umumiy: "общее",
};
