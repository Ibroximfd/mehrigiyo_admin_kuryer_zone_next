import type { Dictionary } from "../matcher";

/**
 * Bitrix oqimi va dostavka xatolari (2026-10-27): Dostavka/Baza doskalari,
 * eshikdagi o'zgarish so'rovlari, to'xtashlar va kuryer haqi, "xato
 * bosildi" (qaytarish) hisoboti.
 */
export const PIPELINE: Dictionary = {
  // «Yetkazildi» ustuni — 24 soatdan keyin Bazaga (B4)
  "Hammasi yetkazilgan — 24 soatdan keyin Bazaga o'tadi": "Всё доставлено — через 24 часа перейдёт в Базу",
  "Bazaga o'tishiga qolgan vaqt": "Осталось до перехода в Базу",
  "Bazaga o'tmoqda": "Переходит в Базу",
  "Bazaga {x} daq": "В Базу через {x} мин",
  "Bazaga {x} soat {x} daq": "В Базу через {x} ч {x} мин",
  // ── Navigatsiya ─────────────────────────────────────────────────────────
  "Dostavka va Baza": "Доставка и База",
  Dostavka: "Доставка",
  Baza: "База",
  Lidlar: "Лиды",
  Manzillar: "Адреса",
  Manzil: "Адрес",
  "Manzil #": "Адрес #",
  "Bir manzil": "Один адрес",

  // ── Dostavka / Baza doskasi ─────────────────────────────────────────────
  "Mijoz kartalari — har mijozning hamma zakazi bitta kartada":
    "Карточки клиентов — все заказы клиента в одной карточке",
  "Bo'lim": "Раздел",
  "Faqat ko'rish": "Только просмотр",
  "Ism, telefon yoki buyurtma raqami": "Имя, телефон или номер заказа",
  "Oflayn — oxirgi saqlangan holat ko'rsatilmoqda":
    "Офлайн — показано последнее сохранённое состояние",
  "Dostavka va Baza backend'ni kutmoqda": "Доставка и База ожидают бэкенд",
  "Bitrix oqimi test serverda chiqarilgan — prodga chiqishi bilan bu yerda lid kartalari ko'rinadi.":
    "Новый поток выпущен на тестовом сервере — после выхода в прод здесь появятся карточки лидов.",
  "Internet yo'q — ulanish tiklangach qayta urinib ko'ring":
    "Нет интернета — повторите, когда связь восстановится",
  "«{x}» bo'yicha karta yo'q — boshqa so'z bilan qidiring.":
    "По «{x}» карточек нет — попробуйте другое слово.",
  "Dostavkada karta yo'q": "В Доставке карточек нет",
  "Bazada karta yo'q": "В Базе карточек нет",
  "Operator zakaz ochishi bilan mijoz kartasi shu yerga tushadi.":
    "Как только оператор откроет заказ, карточка клиента появится здесь.",
  "Buyurtma yetkazilgach mijoz kartasi Bazaga o'tadi.":
    "После доставки заказа карточка клиента перейдёт в Базу.",
  "Dostavka va Baza doskalari uchun backend hali chiqmagan":
    "Бэкенд для досок Доставка и База ещё не выпущен",
  "Davomini yuklashda xatolik": "Ошибка загрузки продолжения",
  "Bo'sh": "Пусто",
  "Yana {n} ta": "Ещё {n}",
  "+{n} ta buyurtma": "+{n} {n|заказ|заказа|заказов}",

  // ── Boyitilgan karta ────────────────────────────────────────────────────
  "Shu ustunda turgan vaqt": "Время в этой колонке",
  "{n} kun": "{n} {n|день|дня|дней}",
  "O'zgarish kutilmoqda": "Ожидает изменения",
  "1 manzil · {n} zakaz": "1 адрес · {n} {n|заказ|заказа|заказов}",
  "+{n} zakaz · jami {x}": "+{n} {n|заказ|заказа|заказов} · всего {x}",
  "{n} ta mahsulot": "{n} {n|товар|товара|товаров}",
  "Kuryer yo'q": "Нет курьера",
  "· kechikdi": "· просрочено",
  "Yetkazish: {x}": "Доставка: {x}",

  // ── Lid kartasi detali ──────────────────────────────────────────────────
  "Lid kartasi": "Карточка лида",
  "Lid kartasi topilmadi": "Карточка лида не найдена",
  "Lid kartasini yuklashda xatolik": "Ошибка загрузки карточки лида",
  "Faqat ko'rish — buyurtmani ochib ishlaysiz":
    "Только просмотр — работайте, открыв заказ",
  "Bu karta sizga yopiq": "Эта карточка вам недоступна",
  "Karta Lidlar bo'limiga qaytgan — logist faqat Dostavka va Bazani ko'radi.":
    "Карточка вернулась в раздел Лиды — логист видит только Доставку и Базу.",
  "Telefonni nusxalash": "Скопировать телефон",
  "Buyurtmalar · {n}": "Заказы · {n}",
  "Buyurtma yo'q": "Заказов нет",

  // ── Eshikdagi o'zgarish so'rovi ─────────────────────────────────────────
  "Mahsulot qo'shish": "Добавить товар",
  "Mahsulotni olib tashlash": "Убрать товар",
  "Boshqa o'zgarish": "Другое изменение",
  "Rad etildi": "Отклонено",
  "Kuryer bekor qildi": "Курьер отменил",
  "Kuryer so'rovi: {x}": "Запрос курьера: {x}",
  "O'zgarish so'rovi": "Запрос на изменение",
  "Eshikdagi o'zgarish": "Изменение у двери",
  "Kuryer kutmoqda": "Курьер ждёт",
  "Avvalgi so'rovlar": "Предыдущие запросы",
  "So'rovni qabul qilishda xatolik": "Ошибка при принятии запроса",
  "So'rovni rad etishda xatolik": "Ошибка при отклонении запроса",
  "So'rovlarni yuklashda xatolik": "Ошибка загрузки запросов",
  "Taxmin — yakuniy summani server hisoblaydi":
    "Оценка — итоговую сумму рассчитает сервер",
  "Izoh kuryerga (ixtiyoriy)": "Комментарий курьеру (необязательно)",
  "masalan: mijozga yangi summani ayting": "например: сообщите клиенту новую сумму",
  "Rasmni ochish": "Открыть фото",
  "Ilova buyurtmasi, lid egasi yo'q — komissiya kimga yozilishini tanlang va qayta qabul qiling":
    "Заказ из приложения, у лида нет владельца — выберите, кому начислить комиссию, и примите снова",
  "Operatorlar yuklanmoqda…": "Загрузка операторов…",
  "Operatorlar ro'yxati yo'q": "Список операторов недоступен",
  "Operatorni tanlang": "Выберите оператора",
  "· lid egasi": "· владелец лида",
  "#{x}: so'rov qabul qilindi · yangi summa {y}":
    "#{x}: запрос принят · новая сумма {y}",
  "#{x}: so'rov rad etildi": "#{x}: запрос отклонён",
  "Kuryer o'zgarish so'radi": "Курьер запросил изменение",
  "O'zgarish so'roviga javob berildi": "На запрос изменения ответили",
  "Kuryer mijoz oldida javobingizni kutmoqda": "Курьер у клиента ждёт вашего ответа",

  // ── «Yetkazildi» tasdig'i (A4) va tahrir sababi ─────────────────────────
  "#{x} yetkazildimi?": "#{x} доставлен?",
  "Kuryerning o'zgarish so'rovi javob kutmoqda — avval uni qabul qiling yoki rad eting, aks holda summa eskicha qoladi.":
    "Запрос курьера на изменение ждёт ответа — сначала примите или отклоните его, иначе сумма останется прежней.",
  "Tasdiqlansa karta Bazaga o'tadi va komissiya yoziladi. Xato bo'lsa — buyurtmani ochib, sabab bilan orqaga qaytarasiz.":
    "После подтверждения карточка перейдёт в Базу и начислится комиссия. Если ошибка — откройте заказ и верните его с причиной.",
  "Ha, yetkazildi": "Да, доставлен",
  "O'zgarish sababi (majburiy — buyurtma yetkazilgan)":
    "Причина изменения (обязательно — заказ доставлен)",
  "Yetkazilgan buyurtmani o'zgartirish sababi yozilishi shart":
    "Для изменения доставленного заказа нужно указать причину",

  // ── Xato kodlari ────────────────────────────────────────────────────────
  "Naqd pul kassaga topshirilgan — buyurtmani qaytarib bo'lmaydi, pul qaytarishni rasmiylashtiring":
    "Наличные уже сданы в кассу — заказ нельзя вернуть, оформите возврат денег",
  "So'rov allaqachon yopilgan — ro'yxatni yangilang": "Запрос уже закрыт — обновите список",
  "So'rov topilmadi — ro'yxatni yangilang": "Запрос не найден — обновите список",
  "Buyurtma yopilgan — so'rovni qabul qilib bo'lmaydi":
    "Заказ закрыт — запрос нельзя принять",
  "Bir manzilga birlashtirish uchun kamida ikkita buyurtma tanlang":
    "Для объединения в один адрес выберите минимум два заказа",
  "Buyurtmalar bitta kuryerda bo'lishi kerak": "Заказы должны быть у одного курьера",
  "Buyurtmalarning yetkazish kuni bir xil bo'lishi kerak":
    "У заказов должен быть один день доставки",
  "Buyurtmalarning manzili bir xil bo'lishi kerak": "У заказов должен быть один адрес",
  "Buyurtmalardan biri allaqachon boshqa manzilda":
    "Один из заказов уже в другом адресе",
  "Manzil topilmadi — ro'yxatni yangilang": "Адрес не найден — обновите список",
  "Stavkani faqat bosh filial logisti belgilaydi":
    "Ставку устанавливает только логист головного филиала",
  "Birlashtirish uchun buyurtmalarga avval kuryer biriktiring":
    "Для объединения сначала назначьте заказам курьера",
  "Buyurtmalardan biri yopilgan — faqat ochiq buyurtmalar birlashtiriladi":
    "Один из заказов закрыт — объединяются только открытые заказы",
  "Faqat ochiq buyurtmalar birlashtiriladi": "Объединяются только открытые заказы",
  // v2: band buyurtma to'xtashga kirmaydi.
  "Buyurtmalardan biri band (kuryerning o'zgarish so'rovi yoki onlayn to'lov kutilmoqda) — uni chiqarib, qolganlarini birlashtiring":
    "Один из заказов занят (запрос курьера на изменение или ожидается онлайн-оплата) — уберите его и объедините остальные",
  "#{x} band — {y}": "#{x} занят — {y}",
  "kuryerning o'zgarish so'rovi javob kutmoqda": "запрос курьера на изменение ждёт ответа",
  "onlayn to'lov kutilmoqda": "ожидается онлайн-оплата",
  "onlayn to'lov jarayonda": "онлайн-оплата в процессе",
  "Qisman yopildi: {n} tasi yetkazildi, {n2} tasi band — kuryer alohida yopadi":
    "Закрыта частично: доставлено {n}, занято {n2} — курьер закроет отдельно",

  // ── To'xtashlar sahifasi ────────────────────────────────────────────────
  Ochiq: "Открытые",
  Tarqatilgan: "Расформированные",
  "Bir manzil — bir borish — bir to'lov": "Один адрес — одна поездка — одна оплата",
  Kun: "День",
  "Manzillar uchun backend hali chiqmagan": "Бэкенд для адресов ещё не выпущен",
  "Manzillar backend'ni kutmoqda": "Адреса ожидают бэкенд",
  "Manzillar va kuryer haqi test serverda — prodga chiqishi bilan shu yerda ishlaydi.":
    "Адреса и оплата курьеров на тестовом сервере — после выхода в прод заработают здесь.",
  "Manzillarni yuklashda xatolik": "Ошибка загрузки адресов",
  "Takliflarni yuklashda xatolik": "Ошибка загрузки предложений",
  "Bu holatda manzil yo'q": "Адресов в этом статусе нет",
  "Bu kunda birlashtirilgan manzil yo'q": "В этот день объединённых адресов нет",
  "Boshqa holatni tanlang yoki «Hammasi» ni ko'ring.":
    "Выберите другой статус или посмотрите «Все».",
  "Bir manzilga ikki zakaz bo'lsa — yuqoridagi takliflardan birlashtiring yoki doskada belgilab «Bir manzil» bosing.":
    "Если на один адрес два заказа — объедините из предложений выше или отметьте на доске и нажмите «Один адрес».",
  "Hammasini ko'rsatish": "Показать все",
  "Manzil #{n} birlashtirildi": "Адрес #{n} объединён",
  "Manzil birlashtirildi": "Адрес объединён",
  "Manzilni birlashtirishda xatolik": "Ошибка объединения адреса",
  "{n} ta manzil birlashtirildi": "Объединено адресов: {n}",
  "Birlashtiradigan guruh qolmadi": "Групп для объединения не осталось",
  "Avto-birlashtirishda xatolik": "Ошибка автообъединения",
  "{x} chiqarildi — manzil #{n} tarqatildi": "{x} исключён — адрес #{n} расформирован",
  "{x} manzildan chiqarildi": "{x} исключён из адреса",
  "Buyurtmani ajratishda xatolik": "Ошибка при исключении заказа",
  "{x} ni manzildan chiqarish": "Исключить {x} из адреса",
  "yetkazildi {x}": "доставлено {x}",
  "Bir manzilga birga yetkaziladi — kuryer haqi bitta":
    "Доставляется вместе на один адрес — оплата курьеру одна",
  "Birlashtirish mumkin · {n}": "Можно объединить · {n}",
  "Birlashtirish mumkin ·": "Можно объединить ·",
  "Hammasini birlashtirish": "Объединить все",
  Birlashtirish: "Объединить",
  "{n} ta buyurtma": "{n} {n|заказ|заказа|заказов}",
  "{n} to'xtash": "{n} {n|остановка|остановки|остановок}",

  // ── Kuryer haqi ─────────────────────────────────────────────────────────
  "Kuryer haqi": "Оплата курьеру",
  "Stavkani yuklashda xatolik": "Ошибка загрузки ставки",
  Belgilanmagan: "Не задана",
  "/ to'xtash": "/ остановка",
  "1 manzilga bir borish = 1 to'lov, ikki zakaz bo'lsa ham.":
    "1 поездка на адрес = 1 оплата, даже если заказов два.",
  "Stavka tarixi": "История ставки",
  "{x} dan": "с {x}",
  "Yangi stavka: {x} / to'xtash": "Новая ставка: {x} / остановка",
  "Stavkani saqlashda xatolik": "Ошибка сохранения ставки",
  "Stavka butun musbat son bo'lsin": "Ставка должна быть целым положительным числом",
  "Stavka, so'm": "Ставка, сум",
  "Amal qilish sanasi": "Дата начала действия",
  Stavka: "Ставка",
  "Jami haq": "Итого оплата",
  "1 manzilga bir borish = 1 to'lov · to'xtash × stavka":
    "1 поездка на адрес = 1 оплата · остановки × ставка",
  "Stavka belgilanmagan — «Manzillar» bo'limida bosh filial belgilaydi":
    "Ставка не задана — её задаёт головной филиал в разделе «Адреса»",
  "Bu davrda to'xtash yo'q": "За период остановок нет",
  "Orqaga qaytarishlar": "Возвраты",
  "«Yetkazildi» yoki «Bekor» xato bosilib qaytarilgani":
    "Ошибочно нажатые «Доставлен» или «Отказ», которые вернули",
  "Bu davrda qaytarish bo'lmadi": "За период возвратов не было",
  marta: "раз",

  // ── Manzillar: telefon+manzil takliflari (2026-10-29) ───────────────────
  "Telefon bir xil": "Телефон совпадает",
  "{n} ta guruhda manzil va mijoz telefoni bir xil — tekshirib, bitta manzilga birlashtiring.":
    "В {n} {n|группе|группах|группах} совпадают адрес и телефон клиента — проверьте и объедините в один адрес.",
  "Zakazlar har xil kuryerda — avval bitta kuryer biriktiring":
    "Заказы у разных курьеров — сначала назначьте одного курьера",
  "Zakazlarga avval kuryer biriktiring": "Сначала назначьте заказам курьера",
};
