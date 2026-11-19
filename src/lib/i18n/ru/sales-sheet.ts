import type { Dictionary } from "../matcher";

/**
 * Sotuv jadvali va berish rejasi (hujjat 83) — bosh kuryerning kunlik «SOTUV»
 * jadvali. Atamalar logist saytidagi sheet hisoboti bilan bir xil
 * («Курьерская услуга», «Отказ на месте», «По дням»).
 */
export const SALES_SHEET: Dictionary = {
  // ── Bo'lim va tablar ────────────────────────────────────────────────────
  "Sotuv jadvali": "Таблица продаж",
  "Sotuv jadvali bo'limlari": "Разделы таблицы продаж",
  "Berish rejasi": "План выдачи",
  "Har kuryer bo'yicha: berildi → sotildi → sovg'a → qoldi. Qoldiq ertangi kunga o'zi o'tadi.":
    "По каждому курьеру: выдано → продано → подарок → осталось. Остаток сам переходит на следующий день.",

  // ── Davr ────────────────────────────────────────────────────────────────
  Oraliq: "Диапазон",
  "Oldingi kun": "Предыдущий день",
  "Keyingi kun": "Следующий день",
  "Oldingi kunni ko'rish": "Открыть предыдущий день",

  // ── Holatlar ────────────────────────────────────────────────────────────
  "Sotuv jadvalini yuklashda xatolik": "Ошибка загрузки таблицы продаж",
  "Berish rejasini yuklashda xatolik": "Ошибка загрузки плана выдачи",
  "Yuklashda xatolik": "Ошибка загрузки",
  "Sotuv jadvali sizga ochilmagan": "Таблица продаж вам не открыта",
  "Berish rejasi sizga ochilmagan": "План выдачи вам не открыт",
  "Sotuv jadvali — server hali chiqarmagan": "Таблица продаж — сервер ещё не выпустил",
  "Berish rejasi — server hali chiqarmagan": "План выдачи — сервер ещё не выпустил",
  "Backend yangilanishi chiqishi bilan raqamlar shu yerda ko'rinadi. Qolgan bo'limlar odatdagidek ishlaydi.":
    "Как только выйдет обновление бэкенда, цифры появятся здесь. Остальные разделы работают как обычно.",
  "Internet aloqasi yo'q": "Нет интернета",
  "Ulanish tiklanishi bilan ma'lumot o'zi yuklanadi.": "Данные загрузятся сами, как только связь восстановится.",
  "Yangilab bo'lmadi — ko'rsatilgani oxirgi yuklangan holat": "Не удалось обновить — показано последнее загруженное состояние",
  "Bu davrda sotuv yo'q": "За этот период продаж нет",
  "Kuryerlarga mol berilmagan va yetkazilgan zakaz yo'q. Boshqa kunni yoki kengroq oraliqni tanlang.":
    "Курьерам не выдавали товар, и доставленных заказов нет. Выберите другой день или более широкий диапазон.",

  // ── Asosiy raqamlar ─────────────────────────────────────────────────────
  "kuryerlar qo'lda olgan": "курьеры получили на руки",
  oldindan: "предоплата",
  "yetkazilgan manzillar": "доставленные адреса",
  "manzilga borib, rad etilgan": "приехали — клиент отказался",
  "Kuryer xizmati": "Курьерская услуга",
  "bosh kuryer qo'lda yozgan": "старший курьер вписал вручную",
  "Kassaga topshiriladi": "Сдаётся в кассу",
  "naqd − kuryer xizmati": "наличные − курьерская услуга",

  // ── Jadval ──────────────────────────────────────────────────────────────
  Qator: "Строка",
  Berilgan: "Выдано",
  Sotilgan: "Продано",
  Qolgan: "Осталось",
  "Tuzatish / qaytarish": "Корректировка / возврат",
  "Borganda atkaz": "Отказ на месте",
  "Kuryer xizmati (qo'lda)": "Курьерская услуга (вручную)",
  "Topshiradi (naqd − xizmat)": "Сдаёт (наличные − услуга)",
  "Boshida {x} + berildi {x2}": "На начало {x} + выдано {x2}",
  "{n} ta zakaz qoldi": "заказов осталось: {n}",
  "{n} ta kuryer": "курьеров: {n}",
  // Karobka + dona katagi («2 kar. 1 dona»): o'rinlar nomi har xil bo'lishi shart — bir xil
  // nomli ikki o'rin (`{x} … {x}`) tarjimada oxirgi qiymatni ikki marta qo'yadi.
  "{n} kar. {n2} dona": "{n} кор. {n2} шт.",
  "Zakazlarini ochish": "Открыть его заказы",
  "Kunma-kun": "По дням",
  "{x} kunini ochish": "Открыть день {x}",
  "qo'lda olgan": "получил на руки",
  "qo'lda yozilgan": "вписано вручную",
  "kunma-kun yoziladi": "вносится по дням",
  kassaga: "в кассу",
  "kassaga topshiriladi": "сдаётся в кассу",

  // ── Viloyatlar kesimi va yangi ustunlar (egasi, 2026-11-19) ─────────────
  // «{viloyat} jami» — viloyat nomi ham lug'atdan o'giriladi.
  "{x} jami": "{x} — итого",
  "ball + qo'lda": "баллы + вручную",
  "kerak {x}": "нужно {x}",
  "— «Pul olish»da kuryerdan olingan; «kerak» — olinishi kerak (o'tgan qarz bilan)":
    "— получено от курьера в «Приёме денег»; «нужно» — сколько нужно получить (с прошлым долгом)",

  // ── Tasdiqlanmagan sotuv (hujjat 97 §3) ────────────────────────────────
  "Logist hali tasdiqlamagan sotuv: {x}": "Продажи, ещё не подтверждённые логистом: {x}",
  "shundan naqd {x}": "из них наличными {x}",
  "Sotilgan sonlarga kuryer «yetkazdim» bosgan kuni kirdi. Naqd va «Kassaga topshiriladi» — logist tasdiqlagandan keyin.":
    "В проданное количество вошли в день, когда курьер нажал «доставил». Наличные и «Сдаётся в кассу» — после подтверждения логистом.",

  // ── Telegram matni ──────────────────────────────────────────────────────
  "Telegram matni": "Текст для Telegram",
  "Telegram uchun matn": "Текст для Telegram",
  "Nol qatorlar matnga kirmaydi.": "Нулевые строки в текст не попадают.",
  "Qaysi qism": "Какая часть",
  "Telegram matnini nusxalash": "Скопировать текст для Telegram",
  "Nusxa olish": "Копировать",
  "Sotuv hisoboti": "Отчёт о продажах",

  // ── Kuryer xizmati — qo'lda ─────────────────────────────────────────────
  "{x}: kuryer xizmati, so'm": "{x}: курьерская услуга, сум",
  "so'm, o'zingiz yozasiz": "сум, вписываете сами",
  "{x}: kuryer xizmati saqlandi": "{x}: курьерская услуга сохранена",
  "{x}: kuryer xizmati o'chirildi": "{x}: курьерская услуга удалена",
  "Kuryer xizmatini saqlab bo'lmadi": "Не удалось сохранить курьерскую услугу",
  "Kuryer xizmatini yozish serverda hali yoqilmagan": "Запись курьерской услуги на сервере ещё не включена",
  "Kuryer topilmadi — jadvalni yangilang": "Курьер не найден — обновите таблицу",
  "Bu kuryer sizga biriktirilmagan": "Этот курьер за вами не закреплён",

  // ── Ogohlantirishlar ────────────────────────────────────────────────────
  "Daftar va zakazlar farqi": "Расхождение журнала и заказов",
  "Sklad daftari zakazlardagi sotuvdan farq qiladi — {n} ta qator": "Журнал склада расходится с продажами по заказам — строк: {n}",
  "Jadval raqamlari daftar bo'yicha. Sabab odatda — qo'lda tuzatish; farqni bosh logist bilan tekshiring.":
    "Цифры таблицы — по журналу. Причина обычно — ручная корректировка; сверьте расхождение с главным логистом.",
  "daftarda {x}, zakazlarda {x2}": "в журнале {x}, в заказах {x2}",
  "Bu davrda tuzatish yoki qaytarish bor": "В этом периоде есть корректировка или возврат",
  "«Qolgan» shu harakat bilan yopiladi — jadvaldagi «Tuzatish / qaytarish» qatoriga qarang.":
    "«Осталось» сходится с учётом этого движения — смотрите строку «Корректировка / возврат» в таблице.",

  // ── Qatorlar izohi ──────────────────────────────────────────────────────
  "= davr boshidagi qoldiq + davrda ombordan berilgan (katak ustida — alohida)":
    "= остаток на начало периода + выдано со склада за период (при наведении на ячейку — по отдельности)",
  "— kuryer ilovada «yetkazdim» qilgan zakazlardan, o'zi yoziladi":
    "— из заказов, которые курьер отметил в приложении «доставил», записывается само",
  "— sovg'a qilib berilgan": "— отдано в подарок",
  "= berilgan − sotilgan − sovg'a; ertangi kunga o'zi o'tadi": "= выдано − продано − подарок; само переходит на следующий день",

  // ── Excel ───────────────────────────────────────────────────────────────
  "Excel yuklab olish": "Скачать Excel",
  "Yuklab olindi: {x}": "Скачано: {x}",
  "Excel faylini yuklab bo'lmadi": "Не удалось скачать файл Excel",
  "Excel serverda hali yoqilmagan": "Excel на сервере ещё не включён",
  "Faylni yuklab bo'lmadi": "Не удалось скачать файл",

  // ── Berish rejasi ───────────────────────────────────────────────────────
  "Berish rejasi — {x}": "План выдачи — {x}",
  "Kuryer qo'lida nima bor, zakazlariga nima kerak va yana nechta berish kerak.":
    "Что у курьера на руках, что нужно для его заказов и сколько ещё выдать.",
  "Bugunga berish rejasi yo'q": "На сегодня плана выдачи нет",
  "Kuryerlaringizda yetkazilmagan zakaz ham, qoldiq ham yo'q. Zakaz biriktirilgach reja shu yerda chiqadi.":
    "У ваших курьеров нет ни недоставленных заказов, ни остатка. План появится здесь, когда назначите заказы.",
  "Kechadan o'tgan zakazlar": "Заказы, перешедшие со вчера",
  "yetkazilmay qolgan": "остались недоставленными",
  "Yangi biriktirilgan": "Новые назначенные",
  "reja kunidagi zakazlar": "заказы дня плана",
  "Yana berish kerak": "Нужно выдать ещё",
  "omboringizdan kuryerlarga": "с вашего склада курьерам",
  "Omborda yetmaydi": "На складе не хватает",
  "logistdan mol so'rang": "запросите товар у логиста",
  "hammasi yetadi": "всего хватает",
  "— {x} berish kerak, omboringizda {x2}, {x3} yetmaydi": "— нужно выдать {x}, на вашем складе {x2}, не хватает {x3}",
  "Qo'lida (qoldiq)": "На руках (остаток)",
  "Zakazlarga kerak": "Нужно для заказов",
  Ortiqcha: "Лишнее",
  "Omboringizda bor": "Есть на вашем складе",
  Yetmaydi: "Не хватает",
  Amal: "Действие",
  "Kechadan o'tgan: {n} ta zakaz": "Со вчера: заказов {n}",
  "Yangi biriktirilgan: {n} ta zakaz": "Новых назначено: заказов {n}",
  "Berish:": "Выдать:",
  "Skladda berish": "Выдать на складе",
  "{x}: skladda berish": "{x}: выдать на складе",
  "Berish shart emas": "Выдавать не нужно",
  "Zakazlarini ko'rish": "Посмотреть его заказы",
  "— kuryer skladining hozirgi qoldig'i": "— текущий остаток на складе курьера",
  "— kechadan o'tgan va yangi biriktirilgan zakazlardagi mahsulotlar": "— товары из заказов, перешедших со вчера и назначенных заново",
  "= kerak − qo'lida (manfiy bo'lmaydi)": "= нужно − на руках (не бывает отрицательным)",
  "— zakazlarga kerak bo'lmagani, omborga qaytadi yoki turadi": "— то, что не нужно для заказов: возвращается на склад или остаётся",
};
