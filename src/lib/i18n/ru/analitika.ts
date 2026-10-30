import type { Dictionary } from "../matcher";

/** Analitika: voronka, kunlar, otkaz sabablari, lid manbalari, operatorlar. */
export const ANALITIKA: Dictionary = {
  Analitika: "Аналитика",
  "Lid → buyurtma → dostavka → yetkazildi · otkaz sabablari va manbalar":
    "Лид → заказ → доставка → доставлено · причины отказов и источники",
  "Analitika bo'limi backend'ni kutmoqda": "Раздел аналитики ожидает бэкенд",
  "Analitika API chiqishi bilan bu yerda voronka va kunlar ko'rinadi.":
    "После выпуска API аналитики здесь появятся воронка и дни.",
  "Analitika uchun backend hali chiqmagan": "Бэкенд для аналитики ещё не выпущен",
  "Analitikani yuklashda xatolik": "Ошибка загрузки аналитики",
  Voronka: "Воронка",
  "Har qadam birinchi qadamga nisbatan; orasida o'tish foizi":
    "Каждый шаг относительно первого; между ними процент перехода",
  Dostavka: "Доставка",
  "Lid → buyurtma": "Лид → заказ",
  "(o'tgan davr {x}%, {x})": "(прошлый период {x}%, {x})",
  "Yo'lda": "В пути",
  "· {x} ta 2 kundan oshdi": "· {x} дольше 2 дней",
  "Yetkazildi; ustun ustida tushum": "Доставлено; над столбцом выручка",
  "{x}: lid {x} · buyurtma {x} · yetkazildi {x} · otkaz {x} · {x}":
    "{x}: лиды {x} · заказы {x} · доставлено {x} · отказы {x} · {x}",
  Kun: "День",
  "Otkaz sabablari": "Причины отказов",
  "{x} otkaz": "{x} {x|отказ|отказа|отказов}",
  "Bu davrda otkaz yo'q": "За этот период отказов нет",
  "Lid manbalari": "Источники лидов",
  "{x} lid": "{x} {x|лид|лида|лидов}",
  "Manba ma'lumoti yo'q — lid modelida manba bo'lmasa bo'sh":
    "Нет данных об источнике — пусто, если в модели лида нет источника",
  "Nomi bosilsa — Moliya › operator sahifasi": "По имени — Финансы › страница оператора",
  "Bu davrda operator faoliyati yo'q.": "За этот период активности операторов нет.",
  "Liddan yetkazishgacha": "От лида до доставки",
  "Chapdan o'ngga: qancha lid keldi, nechtasi buyurtma bo'ldi, nechtasi yetkazildi. Har qadamda yo'qotish ko'rinadi.": "Слева направо: сколько пришло лидов, сколько стало заказами, сколько доставлено. Потери видны на каждом шаге.",
  "Yetkazildi bo'yicha": "По доставленным",
  "Otkaz foizi": "Процент отказов",
  "Otkaz %": "Отказ %",
  "Foizi": "Процент",
  "Ko'k ustun — lid, yashil — yetkazildi; orasidagi farq yo'qotish": "Синий столбец — лиды, зелёный — доставлено; разница — потери",
  "{x}: lid {x} · buyurtma {x} · yetkazildi {x} · otkaz {x}": "{x}: лиды {x} · заказы {x} · доставлено {x} · отказы {x}",
  "lid": "лиды",
  "yetkazildi": "доставлено",
  "Lid → yetkazildi": "Лид → доставлено",
  "Lid qayerdan keldi": "Откуда пришли лиды",
  "Operatorlar bo'yicha": "По операторам",
  "— hali yetkazilmagan": "— ещё не доставлены",
  ", {x} tasi 2 kundan oshdi": ", {x} из них дольше 2 дней",
  "— o'tgan davr {x}% ({x}{x}).": "— прошлый период {x}% ({x}{x}).",
  "{x} lid, {x} yetkazildi.": "{x} лидов, {x} доставлено.",
  "Lid berildi": "Лид передан",
};
