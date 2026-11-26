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
  // Qo'shimcha manzil «Borganda atkaz» ichida (2026-11-26, egasi).
  "shundan qo'shimcha": "из них дополнительные",
  "shundan qo'shimcha manzil: {x}": "из них дополнительных адресов: {x}",
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

  // ── Yagona ish joyi (egasi, 2026-11-20): pul olish va berish jadvalda ──
  "Har kuryer: berildi → sotildi → sovg'a → qoldi, berish kerak; pul — topshirishi kerak va topshirdi. Qoldiq ertangi kunga o'zi o'tadi.":
    "По каждому курьеру: выдано → продано → подарок → осталось, нужно выдать; деньги — нужно сдать и сдал. Остаток сам переходит на следующий день.",
  "Umumiy summa": "Общая сумма",
  "Click / onlayn": "Click / онлайн",
  "Click / onlayn (qo'lda)": "Click / онлайн (вручную)",
  "Skidka (qo'lda)": "Скидка (вручную)",
  "sovg'asiz": "без подарков",
  "sovg'a qo'shilmaydi": "подарки не входят",
  "qo'lda + ilovada oldindan": "вручную + предоплата в приложении",
  "kuryerlar topshiradigan pul": "деньги, которые сдают курьеры",
  "kuryerlardan olingan": "получено от курьеров",
  "kuryer topshiradi": "сдаёт курьер",
  "o'tgan qarz {x} bilan": "с прошлым долгом {x}",
  "to'liq": "полностью",
  "{x}: pul oldim": "{x}: деньги получил",
  "+ ilovada {x}": "+ в приложении {x}",
  "{x}: Click, so'm": "{x}: Click, сум",
  "Click summasini saqlab bo'lmadi": "Не удалось сохранить сумму Click",
  "Bu amal serverda hali yoqilmagan": "Это действие на сервере ещё не включено",
  "Berish kerak": "Нужно выдать",
  "Zakazlarga kerak {x}, qo'lida {x}": "Нужно для заказов {x}, на руках {x}",
  "Zakazlarga kerak {x}, qo'lida {x}, omborda {x} — yetmaydi": "Нужно для заказов {x}, на руках {x}, на складе {x} — не хватает",
  "Omboringizda {x}": "На вашем складе {x}",
  "Bugun harakati yo'q kuryerlar": "Курьеры без движения сегодня",
  "harakat yo'q": "нет движения",
  "{x}: jadvalda {x}, qo'lida {x}": "{x}: в таблице {x}, на руках {x}",
  "Qoldiq skladdan farq qiladi: {x} ta": "Остаток отличается от склада: {x}",
  "Sotilgan sonlarga kuryer «yetkazdim» bosgan kuni kirdi. Pul — logist tasdiqlagandan keyin «Topshirishi kerak»ga qo'shiladi.":
    "В проданное вошло в день, когда курьер нажал «доставил». Деньги добавятся в «Нужно сдать» после подтверждения логиста.",
  "Omboringizda yetmaydi — logistdan mol so'rang": "На вашем складе не хватает — запросите товар у логиста",
  "Kuryerlarning mol so'rovlari": "Заявки курьеров на товар",
  "kutilayotgani yo'q": "ожидающих нет",
  "— sovg'a qilib berilgan; pulga qo'shilmaydi": "— отдано в подарок; в деньги не входит",
  "= zakazlarga kerak − qo'lida; «Berish» bosilsa shu sonlar bilan ochiladi, o'zgartirsa bo'ladi":
    "= нужно для заказов − на руках; «Выдать» открывается с этими числами, их можно изменить",
  "= umumiy summa − Click − skidka − kuryer xizmati + o'tgan qarz": "= общая сумма − Click − скидка − курьерская услуга + прошлый долг",
  "— «Oldim» bilan kuryerdan olingan; qolgani ertangi kunga qarz bo'lib o'tadi":
    "— получено от курьера через «Получил»; остаток переходит долгом на следующий день",
  "Boshida {x} + berildi {x2}, qaytarish va tuzatish {x3}": "На начало {x} + выдано {x2}, возврат и корректировка {x3}",
  "= davr boshidagi qoldiq + davrda berilgan − kuryerdan qaytarilgan ± tuzatish (katak ustida — tafsiloti)":
    "= остаток на начало + выдано за период − возвращено курьером ± корректировка (подробно — при наведении на ячейку)",
  "{x}: mol berildi": "{x}: товар выдан",
  "Avval nimadan nechta berishni yozing": "Сначала укажите, что и сколько выдать",
  "Qizil maydondagi sonni tuzating — skladga butun karobka bo'lib yoziladi": "Исправьте число в красном поле — на склад записываются только целые коробки",
  "Omborda qoldiq minusga tushdi — logistdan mol so'rang": "Остаток на складе ушёл в минус — запросите товар у логиста",
  "= zakazlarga kerak − qo'lida; sonni o'zgartirsa bo'ladi, «Berish» bosilsa darhol beriladi":
    "= нужно для заказов − на руках; число можно изменить, по «Выдать» товар выдаётся сразу",
  "Logist tasdig'ini kutayotgan manzillar bor": "Есть адреса, ожидающие подтверждения логиста",
  "Kutilmoqda: {x} ta yetkazilgan manzil, {x2} ta borganda atkaz": "Ожидают: доставленных адресов — {x}, отказов на месте — {x2}",
  "Sotuv va pul kuryer «yetkazdim» bosgan zahoti hisoblangan. Manzil soni va borganda atkaz — logist tasdiqlagandan keyin qo'shiladi.":
    "Продажа и деньги учтены сразу, как курьер нажал «доставил». Число адресов и отказы на месте добавятся после подтверждения логиста.",
  "Sotilgan sonlarga kuryer «yetkazdim» bosgan kuni kirdi. Pul — server yangilanmaguncha logist tasdiqlagandan keyin «Topshirishi kerak»ga qo'shiladi.":
    "В проданное вошло в день, когда курьер нажал «доставил». Деньги — пока сервер не обновлён — добавятся в «Нужно сдать» после подтверждения логиста.",
  "Manzil soni / borganda atkaz": "Число адресов / отказ на месте",
  "— logist tasdiqlagandan keyin qo'shiladi; sotuv va pul — kuryer «yetkazdim» bosgan zahoti":
    "— добавляются после подтверждения логиста; продажа и деньги — сразу, как курьер нажал «доставил»",
  "Pul hisobi {x} dan yangidan boshlangan — bu kunga Click, skidka va «Oldim» yozilmaydi.":
    "Денежный учёт начат заново с {x} — за этот день Click, скидку и «Получил» не записать.",
  // Hujjat 108: manzil soni kuryer bosgan zahoti (sukut 1), logist tasdig'ida aniqlashadi.
  "shundan {x} tasdiqlanmagan": "из них {x} не подтверждено",
  "— manzil kuryer «yetkazdim» bosgan zahoti 1 bo'lib qo'shiladi, logist tasdiqlaganda o'z soniga almashadi; borganda atkaz — logist tasdiqlagandan keyin":
    "— адрес добавляется как 1, как только курьер нажал «доставил», при подтверждении логиста заменяется его числом; отказ на месте — после подтверждения логиста",
  "Manzil kuryer bosgan zahoti hisoblangan, logist tasdig'ida aniqlashadi":
    "Адрес засчитан, как только курьер нажал «доставил»; уточнится при подтверждении логиста",
  "Tasdiqlanmagan: {x} ta yetkazilgan manzil (soniga kirgan), {x2} ta borganda atkaz":
    "Не подтверждено: доставленных адресов — {x} (уже в счёте), отказов на месте — {x2}",
  "Sotuv, pul va manzil soni kuryer «yetkazdim» bosgan zahoti hisoblangan — manzil soni logist tasdig'ida aniqlashadi. Borganda atkaz — logist tasdiqlagandan keyin qo'shiladi.":
    "Продажа, деньги и число адресов засчитаны, как только курьер нажал «доставил» — число адресов уточнится при подтверждении логиста. Отказ на месте — добавляется после подтверждения логиста.",
  // Qo'shimcha manzil (2026-11-26): kuryer borgan, zakaz topshirilmagan.
  "Qo'shimcha": "Доп. адреса",
  "Qo'shimcha manzil": "Дополнительный адрес",
  "Kuryer borgan, zakaz topshirilmagan — logist izoh bilan qo'shgan": "Курьер приезжал, заказ не вручён — логист добавил с комментарием",
};
