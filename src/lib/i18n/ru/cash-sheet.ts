import type { Dictionary } from "../matcher";

/**
 * «Sotuv jadvali › Pul olish» va Kassa — filialga topshirish (hujjat 85 §2–§3).
 * Atamalar logist saytidagi Kassa bilan bir xil («Получил», «Сдал», «Долг»).
 */
export const CASH_SHEET: Dictionary = {
  // ── Pul olish: tab va holatlar ──────────────────────────────────────────
  "Pul olish": "Приём денег",
  "Kuryerdan pul olish": "Приём денег у курьеров",
  Tenglama: "Расчёт",
  "Pul olish sizga ochilmagan": "Приём денег вам не открыт",
  "Pul olish — server hali chiqarmagan": "Приём денег — сервер ещё не выпустил",
  "Sotuv jadvali ishlayapti. Kuryerdan pul olish raqamlari backend yangilanishi chiqishi bilan shu yerda ko'rinadi.":
    "Таблица продаж работает. Цифры приёма денег у курьеров появятся здесь, как только выйдет обновление бэкенда.",
  "Oraliqda — faqat yig'indi. Skidka yozish va «Oldim» — bitta kun tanlanganda.":
    "В диапазоне — только суммы. Скидку и «Получил» можно вносить, когда выбран один день.",
  "Pul qabul qilish dopuski yo'q — faqat ko'rasiz. Dopuskni bosh logist beradi.":
    "Нет допуска на приём денег — только просмотр. Допуск выдаёт главный логист.",

  // ── Pul olish: tenglama va ustunlar ─────────────────────────────────────
  "Umumiy sotuv": "Общая продажа",
  Skidka: "Скидка",
  "O'tgan qarz": "Прошлый долг",
  "Davr boshidagi qarz": "Долг на начало периода",
  "Olinishi kerak": "Нужно получить",
  Olindi: "Получено",
  "Skidka (o'zingiz yozasiz)": "Скидка (вписываете сами)",
  "Qarz (ertaga)": "Долг (на завтра)",
  "Davr oxiridagi qarz": "Долг на конец периода",
  Qarz: "Долг",
  "{n} manzil · {n2} atkaz": "адресов: {n} · отказов: {n2}",
  "Bu kuryer bo'yicha pul hisobi kelmadi": "По этому курьеру денежный расчёт не пришёл",
  "{x}: olingan pullar": "{x}: полученные деньги",
  "✓ olindi": "✓ получено",

  // ── Pul olish: skidka ───────────────────────────────────────────────────
  "+ tizimda {n} (ball)": "+ в системе {n} (баллы)",
  "{x}: skidka, so'm": "{x}: скидка, сум",
  "{x}: skidka o'chirildi": "{x}: скидка удалена",
  "{x}: skidka saqlandi": "{x}: скидка сохранена",
  "Skidkani saqlab bo'lmadi": "Не удалось сохранить скидку",
  "Pul olish serverda hali yoqilmagan": "Приём денег на сервере ещё не включён",
  "Yozuv topilmadi — jadvalni yangilang": "Запись не найдена — обновите таблицу",

  // ── Pul olish: «Oldim» oynasi ───────────────────────────────────────────
  "— pul olish": "— приём денег",
  "{x} · olinishi kerak {x2}": "{x} · нужно получить {x2}",
  "olinishi kerak {x}": "нужно получить {x}",
  "· olindi {x} · qoldi {x2}": "· получено {x} · осталось {x2}",
  "olindi {x}": "получено {x}",
  "qoldi {x}": "осталось {x}",
  "{x} olindi": "Получено: {x}",
  "Kam olindi: {x} — qarz bo'lib ertangi kunga qo'shiladi": "Получено меньше на {x} — разница станет долгом и перейдёт на следующий день",
  "Olinishi kerakdan {x} ko'p — ortig'i ertangi qarzdan ayriladi": "На {x} больше, чем нужно получить — излишек вычтется из долга следующего дня",
  "Pulni yozib bo'lmadi": "Не удалось записать деньги",
  "Olingan pullar": "Полученные деньги",
  "Bekor qilinsinmi?": "Отменить?",
  "Ha, bekor qilish": "Да, отменить",
  "{x} so'm yozuvi bekor qilindi": "Запись на {x} сум отменена",
  "Yozuvni bekor qilib bo'lmadi": "Не удалось отменить запись",
  "Faqat bugun va o'zingiz yozgan yozuv bekor qilinadi": "Отменить можно только сегодняшнюю запись, внесённую вами",

  // ── Pul olish: izoh ─────────────────────────────────────────────────────
  "— sotilgan zakazlar summasi; sovg'a unga kirmaydi (jadvalda ma'lumot uchun)":
    "— сумма проданных заказов; подарки в неё не входят (в таблице — для справки)",
  "= umumiy sotuv − onlayn − skidka − kuryer xizmati + o'tgan qarz":
    "= общая продажа − онлайн − скидка − услуга курьера + прошлый долг",
  "= olinishi kerak − olindi; ertangi kunning «O'tgan qarz»iga o'zi qo'shiladi":
    "= нужно получить − получено; сам добавляется в «Прошлый долг» следующего дня",

  // ── Kassa ───────────────────────────────────────────────────────────────
  "Filialga qancha pul berishingiz kerak: nima sotildi, naqd, onlayn, sovg'a va skidka — topshiriladigan va topshirilgan summa":
    "Сколько денег нужно сдать в филиал: что продано, наличные, онлайн, подарки и скидки — сумма к сдаче и сданная сумма",
  "Pulni topshirish dopuski yo'q — kassani faqat ko'rasiz. Dopuskni bosh logist beradi.":
    "Нет допуска на сдачу денег — кассу только просматриваете. Допуск выдаёт главный логист.",
  "Kuryerdan pul endi shu bo'limda olinadi:": "Деньги у курьеров теперь принимаются в этом разделе:",
  "Sotuv jadvali › Pul olish": "Таблица продаж › Приём денег",
  "Kassa jadvalini yuklashda xatolik": "Ошибка загрузки таблицы кассы",
  "Kassa jadvali sizga ochilmagan": "Таблица кассы вам не открыта",
  "Kassa jadvali — server hali chiqarmagan": "Таблица кассы — сервер ещё не выпустил",
  "Bu davrda sotuv ham, topshiriladigan pul ham yo'q": "За этот период нет ни продаж, ни денег к сдаче",
  "Boshqa kunni yoki kengroq davrni tanlang.": "Выберите другой день или более широкий период.",
  "Nima sotildi": "Что продано",
  Sotildi: "Продано",
  "Bu davrda mahsulot sotilmagan.": "За этот период товар не продавался.",
  "Umumiy sotuv − onlayn − skidka (+ o'tgan qarz) = topshirishi kerak":
    "Общая продажа − онлайн − скидка (+ прошлый долг) = нужно сдать",
  "Bu davrda filialga topshiriladigan pul yo'q.": "За этот период денег к сдаче в филиал нет.",
  "Topshirishi kerak": "Нужно сдать",
  Topshirgan: "Сдано",
  "Qoldi (qarz)": "Осталось (долг)",
  "o'tgan qarz {n}": "прошлый долг {n}",
  "tasdiqlangan {n}": "подтверждено {n}",
  "tasdiq kutilmoqda": "ждёт подтверждения",
  "✓ topshirildi": "✓ сдано",
  "{x}: topshirdim": "{x}: сдал",
  "«Topshirdim» — summani kiritasiz; filial (logist) Kassa'da «Oldim» bilan tasdiqlaydi":
    "«Сдал» — вводите сумму; филиал (логист) подтверждает в своей Кассе кнопкой «Получил»",
  "Kam topshirilsa — qarz bo'lib ertangi kunga o'tadi": "Если сдано меньше — разница станет долгом и перейдёт на следующий день",
  "Naqd — kuryerlardan «Sotuv jadvali › Pul olish»da olingan pul": "Наличные — деньги, принятые у курьеров в «Таблица продаж › Приём денег»",
};
