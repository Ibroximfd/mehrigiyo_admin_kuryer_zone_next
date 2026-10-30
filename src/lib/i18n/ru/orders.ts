import type { Dictionary } from "../matcher";

/** Buyurtmalar: doska, ro'yxat, kartochka, tahrir, dialoglar, statuslar. */
export const ORDERS: Dictionary = {
  Tezkor: "Быстрые",
  "Ro'yxat ko'rinishi": "Вид списка",
  // ── Statuslar (02 §2.1) ─────────────────────────────────────────────────
  Kutilmoqda: "Ожидает",
  Tasdiqlangan: "Подтверждён",
  "Yo'lga chiqarilgan": "В пути",
  Yetkazilmoqda: "В пути",
  "Yo'lda": "В пути",
  "Yo'l": "В пути",
  Yetkazilgan: "Доставлен",
  Yetkazildi: "Доставлен",
  "Bekor qilingan": "Отменено",
  Atkaz: "Отказ",
  YANGI: "НОВЫЙ",
  Yangi: "Новый",
  yangi: "новый",
  "Noma'lum": "Неизвестно",

  // ── Doska / ro'yxat ─────────────────────────────────────────────────────
  "{n} ta buyurtma CSVga yuklandi": "В CSV выгружено заказов: {n}",
  "Eksportda xatolik": "Ошибка экспорта",
  "Ustun summasi — to'lanadigan summa · jonli":
    "Сумма колонки — сумма к оплате · онлайн",
  "Filtr bo'yicha doskada buyurtma topilmadi.":
    "По фильтру на доске заказов не найдено.",
  "Filtrlarni tozalash": "Сбросить фильтры",
  "Filtr qo'llangan": "Фильтр применён",
  "Filtr qo'llangan: {n} ta buyurtma ko'rsatilmoqda":
    "Фильтр применён: показано {n} {n|заказ|заказа|заказов}",
  "Shu yerga tashlang": "Перетащите сюда",
  "Bo'sh": "Пусто",
  "bo'sh": "свободен",
  "Bu amal uchun backend hali chiqmagan — logist endpointlari kutilmoqda":
    "Бэкенд для этого действия ещё не выпущен — ожидаются эндпоинты логиста",
  "Statusni o'zgartirishda xatolik": "Ошибка смены статуса",
  "Doskani yuklashda xatolik": "Ошибка загрузки доски",
  "Yangilash muvaffaqiyatsiz tugadi — doskadagi ma'lumot eskirgan bo'lishi mumkin":
    "Не удалось обновить — данные на доске могут быть устаревшими",
  Yana: "Ещё",
  "ta — ro'yxatda ochish": "— открыть списком",
  "Yana {n} ta — ro'yxatda ochish": "Ещё {n} — открыть списком",
  "Tashlang — sabab so'raladi": "Отпустите — будет запрошена причина",
  "Ustunni yig'ish": "Свернуть колонку",
  "{n} ta buyurtmani hali hech kim olmagan":
    "Заказов, которые ещё никто не взял: {n}",
  "Muhokamada {n} ta yangi xabar": "Новых сообщений в обсуждении: {n}",
  "yangi buyurtma": "новый заказ",
  "Ustun tepasida": "Вверху колонки",
  "ta yangi buyurtma": "новых заказов",
  "Ustun tepasida {n} ta yangi buyurtma": "Вверху колонки новых заказов: {n}",
  "{x}: {n} ta{y} — ustunni ochish": "{x}: {n}{y} — развернуть колонку",
  "{x}: {n} ta, {n2} yangi — ustunni ochish":
    "{x}: {n}, новых {n2} — развернуть колонку",
  "{x}: {n} ta — ustunni ochish": "{x}: {n} — развернуть колонку",
  ", {n} yangi": ", новых {n}",
  "{n} yangi": "новых: {n}",
  "{x} — mijoz tasdig'i kutilmoqda. Bosib oching.":
    "{x} — ожидается подтверждение клиента. Нажмите, чтобы открыть.",
  "Kuryer biriktirilmagan": "Курьер не назначен",
  "Eslatma qo'yilgan": "Напоминание установлено",
  "O'tkazilmoqda": "Передаётся",
  "Orqaga qaytarish…": "Вернуть назад…",
  "Tiklash…": "Восстановить…",
  "tarixda saqlanadi": "сохраняется в истории",
  "{x} ni tanlash": "Выбрать {x}",
  "Yetk. sana": "Дата дост.",
  Urinishlar: "Попытки",
  "Kechikkan ·": "Просрочен ·",
  "⚠ Manzil aniqlanmagan": "⚠ Адрес не уточнён",
  "Manzil aniqlanmagan": "Адрес не уточнён",
  "{n} quti": "{n} {n|коробка|коробки|коробок}",

  // ── «Oldim» belgisi ─────────────────────────────────────────────────────
  Oldim: "Взял",
  "Oldi: {x}": "Взял: {x}",
  "Belgi hozircha faqat shu qurilmada saqlanadi":
    "Отметка пока сохраняется только на этом устройстве",
  "Filialdagi boshqa logistlar ham ko'radi":
    "Другие логисты филиала тоже увидят",
  "Olgandan keyin boshqa joyda o'zgargan":
    "Изменён в другом месте после того, как вы взяли",
  "Olgandan keyin boshqa joyda o'zgargan — ochib ko'ring":
    "Изменён в другом месте после того, как вы взяли — откройте и проверьте",
  "Hali hech kim olmagan — ishga olsangiz «Oldim» ni bosing":
    "Ещё никто не взял — если берёте в работу, нажмите «Взял»",
  "belgi shu qurilmada": "отметка на этом устройстве",
  "«Oldim» belgisini saqlab bo'lmadi": "Не удалось сохранить отметку «Взял»",

  // ── Mijoz filtrlari / tezkor chiplar ────────────────────────────────────
  "Mijoz o'zi": "Сам клиент",
  "Ilova bor": "Есть приложение",
  "Ilova yo'q": "Нет приложения",
  "ilova bor": "есть приложение",
  "ilova yo'q": "нет приложения",
  "O'tib ketgan": "Просрочено",
  "Sana yo'q": "Без даты",
  Kuryersiz: "Без курьера",
  kuryersiz: "без курьера",
  "Bugun yetkaziladi": "Доставка сегодня",
  Kechikkan: "Просрочен",
  "Onlayn to'langan": "Оплачен онлайн",
  "Buyurtma filtrlari": "Фильтры заказов",
  Status: "Статус",
  "Kuryer qidirish...": "Поиск курьера...",
  Ilova: "Приложение",
  "Viloyat qidirish...": "Поиск области...",
  Guruhlash: "Группировка",
  Belgi: "Отметка",
  Manzilsiz: "Без адреса",
  Dublikat: "Дубликат",
  Holati: "Статус",
  Turi: "Тип",
  "Aniq oraliq": "Точный диапазон",
  "Tezkor filtrlar": "Быстрые фильтры",
  "Filtr bo'yicha buyurtma topilmadi": "По фильтру заказов не найдено",
  "Filtrlarni yumshating yoki tozalang.": "Ослабьте или сбросьте фильтры.",
  "Hozircha buyurtma yo'q": "Заказов пока нет",
  "Yangi buyurtmalar ilova va CRMdan real vaqtda tushadi.":
    "Новые заказы поступают из приложения и CRM в реальном времени.",
  "Yana yuklash": "Загрузить ещё",
  "Barchasini tanlash": "Выбрать все",
  "Yuklangan buyurtmalar bo'yicha, bekor qilinganlarsiz":
    "По загруженным заказам, без отменённых",
  "Filtrga tushgan barcha buyurtmalar": "Все заказы по фильтру",
  "to'lanmagan": "не оплачено",
  "To'lanmaganlarni ko'rsatish": "Показать неоплаченные",
  "Barcha filtrlarni tozalash": "Сбросить все фильтры",
  "Faol buyurtmalar yo'l varaqalari": "Путевые листы активных заказов",
  "Joriy filtr bo'yicha CSVga yuklab olish":
    "Выгрузить в CSV по текущему фильтру",
  Kanban: "Канбан",
  "Ko'rinish": "Вид",
  "{x} amallari": "Действия: {x}",
  "Yo'l varaqasi": "Путевой лист",
  "⚠ manzilsiz": "⚠ без адреса",
  manzilsiz: "без адреса",
  "Yana {n} ta telefon raqam": "Ещё {n} {n|номер|номера|номеров} телефона",
  "Barcha telefonlar": "Все телефоны",
  "Viloyat ko'rsatilmagan": "Область не указана",

  // ── Ommaviy amallar ─────────────────────────────────────────────────────
  "Ommaviy amallar": "Массовые действия",
  "ta tanlandi": "выбрано",
  "{n} ta tanlandi": "Выбрано: {n}",
  "{x} tanlandi": "Выбрано: {x}",
  "hammasini (": "все (",
  "hammasini ({n})": "все ({n})",
  "Yo'lga chiqarish": "Отправить в путь",
  Varaqa: "Лист",
  Bekor: "Отмена",
  "{n} ta buyurtmaga kuryer biriktirildi":
    "Курьер назначен на {n} {n|заказ|заказа|заказов}",
  "Kuryer biriktirishda xatolik": "Ошибка назначения курьера",
  "Kuryer biriktirish": "Назначить курьера",
  "Kuryer tanlang": "Выберите курьера",
  "Faol kuryer yo'q": "Нет активных курьеров",
  "«{x}» — {n} ta buyurtmaga qo'shildi":
    "«{x}» — добавлен к {n} {n|заказу|заказам|заказам}",
  Teg: "Тег",
  "Mahsulotlar soni tarkibga mos": "Количество товаров соответствует составу",
  "Manzillar aniq va to'liq": "Адреса точные и полные",
  "Mijoz telefonlari tekshirildi": "Телефоны клиентов проверены",
  "Yo'lga chiqarish ·": "Отправить в путь ·",
  "Yo'lga chiqarish · {n} ta": "Отправить в путь · {n}",
  "Bitta kuryer biriktiriladi va har buyurtma navbat bilan yuboriladi.":
    "Назначается один курьер, и каждый заказ отправляется по очереди.",
  "{n} ta buyurtma «Tasdiqlangan» emas — o'tkaziladi.":
    "{n} {n|заказ|заказа|заказов} не в статусе «Подтверждён» — будут пропущены.",
  "yo'lga chiqdi": "отправлен в путь",
  "ta buyurtmada manzil aniqlanmagan — kuryerga oldindan ayting.":
    "— столько заказов без уточнённого адреса, предупредите курьера заранее.",
  "{n} ta buyurtmada manzil aniqlanmagan — kuryerga oldindan ayting.":
    "В {n} {n|заказе|заказах|заказах} не уточнён адрес — предупредите курьера заранее.",
  "Kuryerlar yuklanmadi": "Курьеры не загрузились",
  "o'tkaziladi": "пропускается",
  "To'xtatish": "Остановить",
  "ta buyurtma": "заказов",
  "{n} ta buyurtma": "{n} {n|заказ|заказа|заказов}",
  "{n} ta buyurtma {x}": "{n} {n|заказ|заказа|заказов} — {x}",
  "{n} ta: {x}": "{n} шт.: {x}",
  "bugun {n} ta": "сегодня: {n}",
  "{n} buyurtma": "{n} {n|заказ|заказа|заказов}",
  ilova: "приложение",
  "ta buyurtma yuborilmadi — jarayon to'xtatildi.":
    "заказов не отправлено — процесс остановлен.",
  "{n} ta buyurtma yuborilmadi — jarayon to'xtatildi.":
    "{n} {n|заказ не отправлен|заказа не отправлено|заказов не отправлено} — процесс остановлен.",

  // ── Bekor qilish / tasdiqlash / tiklash ─────────────────────────────────
  "Kuryer:": "Курьер:",
  "Mijozga push, operatorga xabar + «qayta qo'ng'iroq» dela. Tarixda saqlanadi, keyin tiklash mumkin.":
    "Клиенту — push, оператору — сообщение и дело «перезвонить». Сохраняется в истории, потом можно восстановить.",
  "{x} ({n} urinish)": "{x} ({n} {n|попытка|попытки|попыток})",
  "Boshqa (izoh majburiy)": "Другое (комментарий обязателен)",
  "Izoh: kuryer 3 marta bordi, telefon o'chiq…":
    "Комментарий: курьер приезжал 3 раза, телефон выключен…",
  "Atkaz qilish": "Оформить отказ",
  "Atkaz qilish…": "Оформить отказ…",
  "Kim bilan, qachon gaplashildi — qisqacha": "С кем и когда говорили — кратко",
  "Tasdiqlash → kuryer tanlash": "Подтвердить → выбрать курьера",
  "To'lov": "Оплата",
  "o'tadi — mijoz onlayn to'lamagan, pulni kuryer oladi.":
    "— клиент не оплатил онлайн, деньги получит курьер.",
  "o'tadi — mijoz onlayn to'lamagan, pulni kuryer oladi. Tasdiqni qaytarsangiz ham to'lov naqdligicha qoladi.":
    "— клиент не оплатил онлайн, деньги получит курьер. Даже если отмените подтверждение, оплата останется наличными.",
  "{x}: tasdiq qaytarildi, lekin to'lov naqdligicha qoldi — kerak bo'lsa tahrirdan usulni o'zgartiring.":
    "{x}: подтверждение отменено, но оплата осталась наличными — при необходимости измените способ в редактировании.",
  naqdga: "переходит на наличные",
  "To'lov o'zgarmaydi:": "Оплата не меняется:",
  Tasdiq: "Подтверждение",
  "Tasdiq tarixga sizning nomingiz va sabab bilan yoziladi.":
    "Подтверждение записывается в историю с вашим именем и причиной.",
  "tarixga sizning nomingiz va sabab bilan yoziladi.":
    "записывается в историю с вашим именем и причиной.",
  "Keyingi qadam — kuryer tanlab yo'lga chiqarish.":
    "Следующий шаг — выбрать курьера и отправить в путь.",
  "Mijoz onlayn to'lovni tugatmagan. Tasdiqlasangiz buyurtma naqd to'lovga o'tadi — pulni kuryer oladi.":
    "Клиент не завершил онлайн-оплату. Если подтвердите, заказ перейдёт на оплату наличными — деньги получит курьер.",
  "Mijozda ilova bor — odatda u o'zi tasdiqlaydi. Faqat mijoz bilan gaplashgan bo'lsangiz tasdiqlang.":
    "У клиента есть приложение — обычно он подтверждает сам. Подтверждайте, только если говорили с клиентом.",
  "Nima bo'lgani — qisqacha": "Что произошло — кратко",
  Tiklash: "Восстановить",
  "Bekor qilingan buyurtma oqimga qaytadi; atkaz sababi tarixda saqlanadi.":
    "Отменённый заказ вернётся в поток; причина отказа сохранится в истории.",
  "to'lov olingan": "оплата получена",
  "{x} da": "{x}",
  "«Yetkazilgan» deb belgilangan": "отмечен как «Доставлен»",
  ". Qaytarsangiz to'lov holati o'zgarmaydi (olingan pul olingan bo'lib qoladi), statistika qayta hisoblanadi.":
    ". Если вернёте, статус оплаты не изменится (полученные деньги остаются полученными), статистика будет пересчитана.",
  "Izoh (majburiy)": "Комментарий (обязательно)",
  Qaytarish: "Вернуть",
  "⤺ Qaytarish": "⤺ Вернуть",
  "Qaytarib bo'lmadi": "Не удалось вернуть",
  "Sababni tanlang va izoh yozing — tarixda saqlanadi.":
    "Выберите причину и напишите комментарий — сохранится в истории.",

  // ── Dashboard ───────────────────────────────────────────────────────────
  "Tanlangan davrda buyurtma yo'q.": "За выбранный период заказов нет.",
  Jami: "Итого",
  "Jami: {x}": "Итого: {x}",
  Summa: "Сумма",
  "Doskadagi yuklangan buyurtmalar bo'yicha — to'liq kesim statistikada.":
    "По загруженным на доску заказам — полный срез в статистике.",
  "Kunlik hisobot (A4)": "Дневной отчёт (A4)",
  "Marshrut varaqalari": "Маршрутные листы",
  "Yo'ldagi kuryerlar": "Курьеры в пути",
  "Yo'lda buyurtmasi bor kuryer yo'q": "Нет курьеров с заказами в пути",
  "{x} · marshrut varag'i tayyor": "{x} · маршрутный лист готов",
  "Oqim ({n})": "Поток ({n})",
  Oqim: "Поток",
  "kanbanga →": "на канбан →",
  "Tasdiq → jo'natish o'rtacha:": "Подтверждение → отправка в среднем:",
  "Jo'natish → yetkazish:": "Отправка → доставка:",
  "Mijoz tasdiqlash ulushi:": "Доля подтверждений клиентом:",
  "mijoz tasdig'i kutilmoqda": "ожидается подтверждение клиента",
  "Tasdiqlangan · kuryersiz": "Подтверждён · без курьера",
  "jo'natish kerak": "нужно отправить",
  "{n} ta kechikkan": "Просрочено: {n}",
  "kechikish yo'q": "просрочек нет",
  "Bugun yetkazildi": "Доставлено сегодня",
  "sabablar yo'q": "причин нет",
  "Naqd yig'iladi": "Будет собрано наличных",
  "{n} kuryer · topshirilmagan": "{n} {n|курьер|курьера|курьеров} · не сдано",
  "kuryerlar bo'limi kutilmoqda": "раздел курьеров ожидается",
  "Kuryerlar bo'limi kutilmoqda": "Раздел курьеров ожидается",
  Boshqa: "Другое",
  Naqd: "Наличные",
  naqd: "наличные",
  Karta: "Карта",
  Sababsiz: "Без причины",

  // ── Yetkazib bo'lmadi (urinish) ─────────────────────────────────────────
  "Urinish belgilandi — buyurtma yetkazilmoqda holatida qoladi":
    "Попытка отмечена — заказ остаётся в статусе «В пути»",
  "Urinishni belgilashda xatolik": "Ошибка отметки попытки",
  "Sabab yozib qo'yiladi, buyurtma holati o'zgarmaydi — qarorni CRM chiqaradi.":
    "Причина записывается, статус заказа не меняется — решение принимает CRM.",
  Sabab: "Причина",
  "Sabab: {x}": "Причина: {x}",
  Izoh: "Комментарий",
  "Masalan: 2 marta qo'ng'iroq qilindi": "Например: звонили 2 раза",
  Belgilash: "Отметить",

  // ── Tahrir ──────────────────────────────────────────────────────────────
  Ism: "Имя",
  "Buyurtma raqami (telefon)": "Номер для заказа (телефон)",
  "Ro'yxat": "Список",
  "Raqam tanlang": "Выберите номер",
  asosiy: "основной",
  "+ yangi raqam…": "+ новый номер…",
  Yetkazish: "Доставка",
  Viloyat: "Область",
  "Ko'rsatilmagan": "Не указано",
  "Yetkaziladigan sana · oyna": "Дата доставки · окно",
  "Yetkazish oynasi": "Окно доставки",
  Oynasiz: "Без окна",
  Manzil: "Адрес",
  "Buyurtma operator tavsiyasi orqali kelgan — tarkibni o'zgartirish uchun komissiya egasini tanlang":
    "Заказ пришёл по рекомендации оператора — чтобы изменить состав, выберите владельца комиссии",
  "Backend hali bu maydonlarni tahrirlashga ruxsat bermayapti (field_not_allowed) — faqat ruxsatlilarini o'zgartiring yoki backend yangilanishini kuting.":
    "Бэкенд пока не разрешает редактировать эти поля (field_not_allowed) — измените только разрешённые или дождитесь обновления бэкенда.",
  "Tahrir endpointi hali chiqmagan yoki buyurtma topilmadi — keyinroq urinib ko'ring.":
    "Эндпоинт редактирования ещё не выпущен или заказ не найден — попробуйте позже.",
  "Saqlashda xatolik": "Ошибка сохранения",
  "{x} · {n} maydon o'zgardi{y}": "{x} · изменено полей: {n}{y}",
  "{x} · {n} maydon o'zgardi": "{x} · изменено полей: {n}",
  "komissiya: {x}": "комиссия: {x}",
  "Noto'g'ri qiymat": "Неверное значение",
  "ni tahrirlash": "— редактирование",
  "#{x} ni tahrirlash": "Редактирование заказа #{x}",
  "Istalgan bosqichda tahrirlash — har o'zgarish tarixga tushadi":
    "Редактирование на любом этапе — каждое изменение попадает в историю",
  "maydon o'zgardi": "полей изменено",
  "{n} maydon o'zgardi": "Изменено полей: {n}",
  "O'zgarish sababi (tarix uchun)": "Причина изменения (для истории)",
  "masalan: mijoz qo'ng'iroq qilib so'radi":
    "например: клиент позвонил и попросил",
  "O'zgarganlar: {x}": "Изменено: {x}",
  "Hali o'zgarish yo'q": "Изменений пока нет",
  "Buyurtma hozirgina boshqa joyda o'zgardi:":
    "Заказ только что изменили в другом месте:",
  ". Siz tegmagan maydonlar yuborilmaydi.":
    ". Поля, которые вы не трогали, не отправляются.",
  "Siz tegmagan maydonlar yuborilmaydi.":
    "Поля, которые вы не трогали, не отправляются.",
  "Siz ham o'zgartirgan:": "Вы тоже изменили:",
  "— saqlasangiz sizning qiymatingiz yoziladi.":
    "— при сохранении будет записано ваше значение.",
  "Yangi qiymatlarni olish (tahriringiz tashlanadi)":
    "Получить новые значения (ваши правки будут сброшены)",
  "Buyurtmani yuklab bo'lmadi": "Не удалось загрузить заказ",
  "Buyurtmani yuklashda xatolik": "Ошибка загрузки заказа",
  "Buyurtma yuklanmoqda…": "Заказ загружается…",
  Tarkib: "Состав",
  "Buyurtma onlayn to'langan — tarkib va summa qulflangan. Izoh, manzil va sanani o'zgartirish mumkin.":
    "Заказ оплачен онлайн — состав и сумма заблокированы. Комментарий, адрес и дату изменить можно.",
  "sovg'a": "подарок",
  "Sovg'a": "Подарок",
  "(sovg'a)": "(подарок)",
  // Sovg'a manbasi (`gift_source`) — `features/orders/gift-source.ts`.
  "Aksiya sovg'asi": "Подарок акции",
  "Mijoz sovg'asi": "Подарок клиенту",
  "Operator qo'shgan": "Добавил оператор",
  // Qator chegirma/aksiya belgisi va tahrir narx katagi — `features/orders/item-pricing.ts`.
  Aksiya: "Акция",
  // Katalog narxi (`features/products/components/product-price-text.tsx`).
  "Narxi yo'q": "Нет цены",
  "Soni o'zgardi — yangi summa pastda, serverdan": "Количество изменилось — новая сумма ниже, с сервера",
  "{x} ni o'chirish": "Удалить {x}",
  "Qutilar soni": "Количество коробок",
  "Qo'shimcha mahsulot": "Дополнительный товар",
  "Sovg'a / izoh": "Подарок / комментарий",
  "{x}: kamaytirish": "{x}: уменьшить",
  "{x}: ko'paytirish": "{x}: увеличить",
  "Yangi summa hisoblanmoqda…": "Новая сумма рассчитывается…",
  "Yangi summa (server):": "Новая сумма (сервер):",
  "Yangi summa saqlangach serverda hisoblanadi.":
    "Новая сумма будет рассчитана на сервере после сохранения.",
  Logistika: "Логистика",
  Biriktirilmagan: "Не назначен",
  "Logist izohi (kuryer ko'radi)": "Комментарий логиста (видит курьер)",
  "Komissiya egasi (operator)": "Владелец комиссии (оператор)",
  "Buyurtma operator tavsiyasi orqali kelgan — tarkib o'zgarsa komissiya shu operatorga yoziladi. Odatda o'zgartirish shart emas.":
    "Заказ пришёл по рекомендации оператора — при изменении состава комиссия начисляется этому оператору. Обычно менять не нужно.",
  "Operator #{x}": "Оператор #{x}",
  "Operator ID, masalan 7": "ID оператора, например 7",
  "Operatorni tanlang": "Выберите оператора",
  "ID ni qo'lda kiritish…": "Ввести ID вручную…",
  "To'lov usuli": "Способ оплаты",
  "Mijoz onlayn to'lovni boshlagan — to'lov usulini o'zgartirib bo'lmaydi (pul ikki marta yechilmasin).":
    "Клиент начал онлайн-оплату — способ оплаты изменить нельзя (чтобы деньги не списались дважды).",
  "Onlayn tanlansa mijozga to'lov havolasi push bilan boradi; to'lanmaguncha buyurtma jo'natilmaydi.":
    "Если выбрать онлайн, клиенту придёт push со ссылкой на оплату; до оплаты заказ не отправляется.",
  "Mahsulot qo'shish…": "Добавить товар…",
  "Nomi bo'yicha qidirish": "Поиск по названию",
  "Mahsulot qidirish": "Поиск товара",
  Mahsulotlar: "Товары",
  Mahsulot: "Товар",
  "Mahsulotlarni yuklab bo'lmadi": "Не удалось загрузить товары",
  "«{x}» bo'yicha mahsulot topilmadi": "По запросу «{x}» товары не найдены",
  "Katalog bo'sh": "Каталог пуст",
  "Naqd · olganda": "Наличные · при получении",
  olganda: "при получении",
  "Kamida 1 dona": "Минимум 1 шт.",
  "Ism kamida 2 harf": "Имя — минимум 2 буквы",
  "Telefon raqam noto'g'ri": "Неверный номер телефона",
  "Sana noto'g'ri": "Неверная дата",
  "Tarkibda kamida bitta mahsulot bo'lsin":
    "В составе должен быть хотя бы один товар",
  "Butun son kiriting": "Введите целое число",
  "to'lov": "оплата",
  "to'lov: {x}": "оплата: {x}",
  "logist izohi": "комментарий логиста",

  // ── Kiruvchi o'tkazmalar ────────────────────────────────────────────────
  "Kiruvchi buyurtma takliflari": "Входящие предложения заказов",
  "Qabul qilsangiz buyurtma doskangizga tushadi":
    "Если примете, заказ попадёт на вашу доску",
  "{x} filialingizga qabul qilindi": "{x} принят в ваш филиал",
  "Qabul qilishda xatolik": "Ошибка при приёме",
  "Rad etish": "Отклонить",
  "Qabul qilish": "Принять",
  "Taklif rad etildi — buyurtma yuboruvchida qoladi":
    "Предложение отклонено — заказ остаётся у отправителя",
  "Rad etishda xatolik": "Ошибка при отклонении",
  "Taklifni rad etish": "Отклонить предложение",
  "— sabab yuboruvchi filialga ko'rinadi va buyurtma o'sha yerda qoladi.":
    "— причину увидит филиал-отправитель, и заказ останется там.",
  "Sababsiz rad etib bo'lmaydi": "Нельзя отклонить без причины",
  "Sababni yozing": "Укажите причину",
  "Masalan: manzil bizning hududda emas": "Например: адрес не в нашем районе",

  // ── Tafsilot ekrani ─────────────────────────────────────────────────────
  "Telefon ko'rsatilmagan": "Телефон не указан",
  Manba: "Источник",
  Yaratdi: "Создал",
  "Mijoz izohi": "Комментарий клиента",
  "qo'shimcha": "дополнительный",
  "Telefon raqamni nusxalash": "Скопировать номер телефона",
  "Telefon raqami nusxalandi": "Номер телефона скопирован",
  "{x} · buyurtma shu raqamga": "{x} · заказ на этот номер",
  "buyurtma shu raqamga": "заказ на этот номер",
  "lid mas'uli: {x}": "ответственный за лид: {x}",
  "📞 Qo'ng'iroq qilindi": "📞 Звонок совершён",
  "Qo'ng'iroq belgilandi": "Звонок отмечен",
  Belgilanmadi: "Не отмечено",
  "📞 Qo'ng'iroq qilindi deb belgilash": "📞 Отметить, что звонок совершён",
  "Kuryer saqlandi": "Курьер сохранён",
  "Kuryer tanlang…": "Выберите курьера…",
  "Logist izohi saqlandi": "Комментарий логиста сохранён",
  "Kuryer uchun eslatma…": "Заметка для курьера…",
  "Logist izohi": "Комментарий логиста",
  "Teglar saqlandi": "Теги сохранены",
  "xaritada ochish": "открыть на карте",
  "Manzilni nusxalash": "Скопировать адрес",
  "Manzil nusxalandi": "Адрес скопирован",
  "⚠ Ko'rsatilmagan — mijozdan aniqlang": "⚠ Не указан — уточните у клиента",
  "Qabul qiluvchi": "Получатель",
  "qabul qiluvchi": "получатель",
  "Buyurtma raqamini nusxalash": "Скопировать номер заказа",
  "Buyurtma raqami nusxalandi": "Номер заказа скопирован",
  "Chop etish": "Печать",
  Muhokama: "Обсуждение",
  "Kuryerga ▾": "Курьеру ▾",
  Kuryerga: "Курьеру",
  "Matn nusxalandi": "Текст скопирован",
  "Matnni nusxalash": "Скопировать текст",
  "Telegram orqali": "Через Telegram",
  "SMS orqali": "Через SMS",
  Javobda: "В ответе",
  "ta qator keldi, buyurtmada esa": "строк(и), а в заказе",
  "ta — tarkib to'liq emas.": "— состав неполный.",
  "Javobda {n} ta qator keldi, buyurtmada esa {n2} ta — tarkib to'liq emas.":
    "В ответе {n} {n|строка|строки|строк}, а в заказе {n2} — состав неполный.",
  "{n} dona mahsulot bor, lekin javobda tarkib kelmadi.":
    "В заказе {n} шт. товара, но состав в ответе не пришёл.",
  "Tarkib ko'rsatilmagan.": "Состав не указан.",
  "Buyurtma topilmadi — o'chirilgan yoki boshqa filialga o'tgan bo'lishi mumkin.":
    "Заказ не найден — возможно, он удалён или передан в другой филиал.",
  "«{x}» bosqichiga o'tkazish": "Перевести на этап «{x}»",
  "Boshqa status": "Другой статус",
  "Tasdiqlab, yo'lga chiqarish…": "Подтвердить и отправить в путь…",
  Holat: "Статус",
  "To'lov holati": "Статус оплаты",
  "Yetkazish sanasi": "Дата доставки",
  "Boshqa filialga": "В другой филиал",
  "kassadan tekshiring": "проверьте в кассе",
  "«{x}» filialiga o'tkazilmoqda — javob kelguncha amallar qulflangan.":
    "Передаётся в филиал «{x}» — до ответа действия заблокированы.",
  "Buyurtma boshqa filialga o'tkazilmoqda — javob kelguncha amallar qulflangan.":
    "Заказ передаётся в другой филиал — до ответа действия заблокированы.",

  // ── Tarix ───────────────────────────────────────────────────────────────
  "Buyurtma tarixi": "История заказа",
  Tarix: "История",
  "Tarixni yuklashda xatolik": "Ошибка загрузки истории",
  "Hali yozuv yo'q — o'zgarishlar va izohlar shu yerda ko'rinadi.":
    "Записей пока нет — здесь будут изменения и комментарии.",
  "Bu turdagi yozuv yo'q.": "Записей этого типа нет.",
  "Izoh yozishda xatolik": "Ошибка добавления комментария",
  "Izoh (logist / kuryer uchun)…": "Комментарий (для логиста / курьера)…",
  Yozish: "Написать",
  "bugun {x}": "сегодня {x}",
  "kecha {x}": "вчера {x}",
  Barchasi: "Все",
  "O'zgarishlar": "Изменения",
  Izohlar: "Комментарии",
  "Buyurtma yaratildi": "Заказ создан",
  "Buyurtma tahrirlandi": "Заказ отредактирован",
  "Mijoz tasdiqladi": "Клиент подтвердил",
  "Tasdiq eslatmasi yuborildi": "Отправлено напоминание о подтверждении",
  "Yetkazish sanasi ko'chirildi": "Дата доставки перенесена",
  Qaytarildi: "Возвращён",
  "To'lov usuli tanlandi": "Выбран способ оплаты",
  "To'lov tushdi": "Оплата поступила",
  "To'lov qaytarildi": "Оплата возвращена",
  "Izoh tahrirlandi": "Комментарий отредактирован",
  "Push yuborildi": "Push отправлен",
  "O'tkazib yuborilgan qo'ng'iroq": "Пропущенный звонок",
  "{x} qo'ng'iroq{y}": "{x} звонок{y}",
  "{x} qo'ng'iroq": "{x} звонок",
  "Kiruvchi qo'ng'iroq": "Входящий звонок",
  "Chiquvchi qo'ng'iroq": "Исходящий звонок",
  Hodisa: "Событие",
  "{x} · {y} nomidan": "{x} · от имени {y}",
  nomidan: "от имени",

  // ── Eslatma ─────────────────────────────────────────────────────────────
  "Eslatma qo'yildi — {x}": "Напоминание установлено — {x}",
  "Eslatma qo'yish": "Поставить напоминание",
  "— vaqti kelganda signal chiqadi.": "— в назначенное время прозвучит сигнал.",
  "Masalan: mijoz qayta qo'ng'iroq so'radi":
    "Например: клиент попросил перезвонить",
  "Qo'yish": "Поставить",

  // ── Yo'lga chiqarish ────────────────────────────────────────────────────
  "Manzil aniq va to'liq": "Адрес точный и полный",
  "Mijoz telefoni tekshirildi": "Телефон клиента проверен",
  "{x} · yo'lga chiqdi": "{x} · отправлен в путь",
  "Yo'lga chiqarishda xatolik": "Ошибка отправки в путь",
  "— chiqishdan oldin tez tekshiruv.": "— быстрая проверка перед выездом.",
  "Bu buyurtmada manzil aniqlanmagan — avval mijozdan aniqlab, logist izohiga yozib qo'ying.":
    "В этом заказе адрес не уточнён — сначала уточните у клиента и запишите в комментарий логиста.",
  "Kuryerlar bo'limi backend chiqishi bilan bu yerda kuryer tanlanadi.":
    "После выпуска бэкенда раздела курьеров здесь можно будет выбрать курьера.",

  // ── Boshqa filialga o'tkazish ───────────────────────────────────────────
  "{x} boshqa filialga taklif qilindi — javob kutilmoqda":
    "{x} предложен другому филиалу — ожидается ответ",
  "O'tkazish so'rovida xatolik": "Ошибка запроса передачи",
  "Filialga o'tkazish": "Передать в филиал",
  "— qabul qiluvchi filial rozilik berguncha buyurtma qulflanadi.":
    "— заказ блокируется, пока филиал-получатель не даст согласие.",
  "Filiallararo o'tkazish uchun backend hali chiqmagan — bu oqim backend §7–8 bilan birga ishga tushadi.":
    "Бэкенд для передачи между филиалами ещё не выпущен — этот поток заработает вместе с бэкендом §7–8.",
  "Boshqa filial yo'q — o'tkazish uchun tizimda kamida ikkita filial bo'lishi kerak.":
    "Других филиалов нет — для передачи в системе должно быть минимум два филиала.",
  "Qabul qiluvchi filial": "Филиал-получатель",
  "Filial tanlang": "Выберите филиал",
  "Masalan: Manzil Samarqand hududida":
    "Например: адрес в Самаркандском районе",

  // ── Chop etish ──────────────────────────────────────────────────────────
  "Mehrigiyo — yo'l varaqasi": "Mehrigiyo — путевой лист",
  "yo'l varaqasi": "путевой лист",
  Soni: "Кол-во",
  "Mijoz imzosi": "Подпись клиента",
  "Kuryer imzosi": "Подпись курьера",
  "Logist imzosi": "Подпись логиста",
  "Filial rahbari": "Руководитель филиала",
  "Mahsulotlar: {x}": "Товары: {x}",
  "Ball chegirmasi: −{x}": "Скидка баллами: −{x}",
  "To'lanadi: {x}": "К оплате: {x}",
  "PUL OLINADI": "ВЗЯТЬ ДЕНЬГИ",
  "Kuryerlar kesimi": "Срез по курьерам",
  "(faol emas)": "(неактивен)",
  "Kunlik yakun": "Итоги дня",
  "Mehrigiyo Logist — kunlik yakun": "Mehrigiyo Logist — итоги дня",
  "Oqim holati": "Состояние потока",
  Bosqich: "Этап",
  "Muvaffaqiyatsiz urinishlar (yuklanganlar bo'yicha): {n} ta · Kuryersiz tasdiqlangan/yo'ldagi: {n2} ta":
    "Неудачные попытки (по загруженным): {n} · Подтверждённые/в пути без курьера: {n2}",

  // ── CSV ─────────────────────────────────────────────────────────────────
  Bor: "Есть",
  "Yo'q": "Нет",
  "yo'q": "нет",
  Raqam: "Номер",
  "Yaratuvchi ismi": "Имя создателя",
  "Tasdiq kanali": "Канал подтверждения",
  Region: "Регион",
  Qutilar: "Коробки",
  "Mahsulotlar summasi": "Сумма товаров",
  Ball: "Баллы",
  "To'lanadigan summa": "Сумма к оплате",
  "To'lov turi": "Тип оплаты",

  // ── Ulashish matni ──────────────────────────────────────────────────────
  "TO'LANGAN": "ОПЛАЧЕНО",
  "NAQD OLINADI": "ВЗЯТЬ НАЛИЧНЫЕ",
  "TO'LANMAGAN, PUL OLINADI": "НЕ ОПЛАЧЕНО, ВЗЯТЬ ДЕНЬГИ",
  "Manzil ko'rsatilmagan": "Адрес не указан",

  // ── Ball / summa ────────────────────────────────────────────────────────
  "Mijoz {x} ball ishlatgan — {y} chegirma":
    "Клиент использовал {x} баллов — скидка {y}",
  "Mahsulotlar {x} · {n} ball −{y}": "Товары {x} · {n} баллов −{y}",
  "{n} ball chegirma −{x} (mahsulotlar {y})":
    "Скидка {n} баллов −{x} (товары {y})",

  // ── Komissiya egasi ─────────────────────────────────────────────────────
  "tavsiya yuborgan": "отправил рекомендацию",
  "mas'ul operator": "ответственный оператор",
  "nomidan yaratilgan": "создан от имени",
  "lid mas'uli": "ответственный за лид",
  "filial operatori": "оператор филиала",

  // ── Xato izohlari (error-hints) ─────────────────────────────────────────
  "Bu amalga sizning rolingiz haqli emas":
    "Ваша роль не позволяет это действие",
  "Bu o'tish logistga ruxsat etilmagan (02 §2.3) — ro'yxatni yangilang, status boshqa joydan o'zgargan bo'lishi mumkin":
    "Этот переход логисту не разрешён (02 §2.3) — обновите список, статус мог измениться в другом месте",
  "Bu status endi ishlatilmaydi — sahifani yangilang, 5 bosqichli oqim qo'llanadi":
    "Этот статус больше не используется — обновите страницу, действует 5-этапный поток",
  "Bekor qilish uchun sabab tanlash shart": "Для отмены нужно выбрать причину",
  "Orqaga qaytarish uchun sabab tanlash shart":
    "Для возврата нужно выбрать причину",
  "Tasdiqlash uchun ro'yxatdan sabab tanlash shart":
    "Для подтверждения выберите причину из списка",
  "Buyurtma allaqachon boshqa holatda — sahifani yangilang":
    "Заказ уже в другом статусе — обновите страницу",
  "Bu operator filialingizning faol sotuvchisi emas — ro'yxatdan boshqasini tanlang":
    "Этот оператор не является активным продавцом вашего филиала — выберите другого из списка",
  "Tahrir oynasi yopilgan — bu bosqichda faqat logist o'zgartiradi":
    "Окно редактирования закрыто — на этом этапе изменяет только логист",
  "Mijozda ilova ulanmagan — oddiy telefon orqali qo'ng'iroq qiling":
    "У клиента не подключено приложение — позвоните по обычному телефону",
  '"Boshqa sabab" tanlansa izoh yozish shart':
    "При выборе «Другая причина» комментарий обязателен",
  "Bu bekor qilingan buyurtmada keshbek, ball yoki sovg'a izi bor — uni tiklab bo'lmaydi. Yangi buyurtma yarating":
    "В этом отменённом заказе есть след кешбэка, баллов или подарка — восстановить нельзя. Создайте новый заказ",
  "Buyurtma onlayn to'langan — tarkib va summani o'zgartirib bo'lmaydi. Izoh va manzilni tahrirlash mumkin":
    "Заказ оплачен онлайн — состав и сумму изменить нельзя. Комментарий и адрес редактировать можно",
  "Mijoz onlayn to'lovni boshlagan — to'lov usulini naqdga o'tkazib bo'lmaydi (pul ikki marta yechilmasin)":
    "Клиент начал онлайн-оплату — перевести на наличные нельзя (чтобы деньги не списались дважды)",
  "Buyurtma bekor qilingan — avval uni tiklang":
    "Заказ отменён — сначала восстановите его",
  "Buyurtma allaqachon yetkazilgan": "Заказ уже доставлен",
  "O'zgartiriladigan maydon yo'q — hech narsa saqlanmadi":
    "Нет полей для изменения — ничего не сохранено",
  "Yetkazish sanasi noto'g'ri": "Неверная дата доставки",
  "Mahsulot soni noto'g'ri": "Неверное количество товара",
  "Tarkibda mahsulot juda ko'p": "Слишком много товаров в составе",
  "Mahsulot topilmadi — katalogni yangilang":
    "Товар не найден — обновите каталог",
  "Mahsulot sotuvdan olingan": "Товар снят с продажи",
  "Narxni oshirish taqiqlangan": "Повышать цену запрещено",
  "Teg noto'g'ri": "Неверный тег",
  "Status qiymati noto'g'ri — sahifani yangilang":
    "Неверное значение статуса — обновите страницу",
  "Akkauntingiz filialga biriktirilmagan — administratorga murojaat qiling":
    "Ваш аккаунт не привязан к филиалу — обратитесь к администратору",
  "Bu amalga ruxsatingiz yo'q": "У вас нет прав на это действие",
  "Topilmadi — ro'yxatni yangilang (boshqa filialga tegishli bo'lishi mumkin)":
    "Не найдено — обновите список (возможно, относится к другому филиалу)",
  "Buyurtma topilmadi — ro'yxatni yangilang":
    "Заказ не найден — обновите список",
  "Bu maydonni logist o'zgartira olmaydi": "Логист не может изменить это поле",
  "Bu maydonni hozirgi bosqichda o'zgartirib bo'lmaydi":
    "Это поле нельзя изменить на текущем этапе",
  "Yetkazishga chiqarish uchun avval kuryer biriktirish kerak":
    "Чтобы отправить на доставку, сначала назначьте курьера",
  "Buyurtma boshqa filialga o'tkazilmoqda — javob kelguncha qulflangan":
    "Заказ передаётся в другой филиал — заблокирован до ответа",
  "Buyurtma boshqa filialga o'tkazilmoqda — javob kutilmoqda":
    "Заказ передаётся в другой филиал — ожидается ответ",
  "Kuryer topilmadi — ro'yxatni yangilang":
    "Курьер не найден — обновите список",
  "Bu kuryer faol emas — avval faollashtiring":
    "Этот курьер неактивен — сначала активируйте его",
  "Bu kuryer boshqa filialga tegishli":
    "Этот курьер относится к другому филиалу",
  '"Yetkazib bo\'lmadi" faqat yetkazilayotgan buyurtmada belgilanadi':
    "«Не удалось доставить» отмечается только у заказа в пути",
  "Izoh matni bo'sh — nimadir yozing": "Комментарий пуст — напишите что-нибудь",
  "Bu kun uchun pul allaqachon topshirilgan deb belgilangan":
    "За этот день деньги уже отмечены как сданные",
  "Bu buyurtma bo'yicha o'tkazish so'rovi allaqachon bor":
    "Запрос на передачу этого заказа уже существует",
  "O'tkazish so'rovi topilmadi — ro'yxatni yangilang":
    "Запрос на передачу не найден — обновите список",
  "Bu qadam sizning filialingizga tegishli emas":
    "Этот шаг не относится к вашему филиалу",
  "Faqat tasdiqlangan buyurtma boshqa filialga o'tkaziladi":
    "В другой филиал передаётся только подтверждённый заказ",
  "Rad etish uchun sabab yozish shart": "Для отклонения нужно указать причину",
  "O'tkazish topilmadi — ro'yxatni yangilang":
    "Передача не найдена — обновите список",
  "Server bu status qiymatini tanimadi — sahifani yangilang (statuslar ro'yxati o'zgargan bo'lishi mumkin)":
    "Сервер не распознал это значение статуса — обновите страницу (список статусов мог измениться)",
  "{x}: status o'zgargach server to'lov usulini «{y}» → «{z}» qilib qo'ydi. Bu backend xatosi — tahrirdan usulni qaytaring.":
    "{x}: после смены статуса сервер изменил способ оплаты «{y}» → «{z}». Это ошибка бэкенда — верните способ в редактировании.",
  "5 soniyalik qaytarish (undo)": "Отмена в течение 5 секунд (undo)",

  // ── Sabablar ────────────────────────────────────────────────────────────
  "Sabab tanlang": "Выберите причину",
  "Izoh {n} belgidan oshmasin": "Комментарий — не более {n} символов",
  "«Boshqa sabab» uchun izoh yozing":
    "Для «Другой причины» напишите комментарий",
  "Izoh yozing — tarixda sabab bilan qoladi":
    "Напишите комментарий — он сохранится в истории с причиной",
  "Mijoz rad etdi": "Клиент отказался",
  "Javob bermadi": "Не ответил",
  "Manzil xato": "Неверный адрес",
  "Mahsulot yo'q": "Нет товара",
  "To'lov o'tmadi": "Оплата не прошла",
  "Mijoz so'radi": "Клиент попросил",
  "Boshqa sabab": "Другая причина",
  "Xodimlar bilan muammo": "Проблема с сотрудниками",
  "Mahsulot bilan muammo": "Проблема с товаром",
  "Xato bosildi": "Нажато по ошибке",
  "Kuryer bekor qildi": "Курьер отменил",
  "Mijoz sanani ko'chirdi": "Клиент перенёс дату",
  "Mijoz telefonda tasdiqladi": "Клиент подтвердил по телефону",
  "Ilova yo'q yoki ishlamayapti": "Приложения нет или оно не работает",
  "Shoshilinch yetkazish kerak": "Нужна срочная доставка",
  "Mijoz javob bermadi": "Клиент не ответил",
  "Manzil noto'g'ri": "Неверный адрес",

  // ── Viloyatlar ──────────────────────────────────────────────────────────
  "Toshkent shahri": "г. Ташкент",
  "Toshkent viloyati": "Ташкентская область",
  "Andijon viloyati": "Андижанская область",
  "Buxoro viloyati": "Бухарская область",
  "Farg'ona viloyati": "Ферганская область",
  "Jizzax viloyati": "Джизакская область",
  "Xorazm viloyati": "Хорезмская область",
  "Namangan viloyati": "Наманганская область",
  "Navoiy viloyati": "Навоийская область",
  "Qashqadaryo viloyati": "Кашкадарьинская область",
  "Samarqand viloyati": "Самаркандская область",
  "Sirdaryo viloyati": "Сырдарьинская область",
  "Surxondaryo viloyati": "Сурхандарьинская область",
  "Qoraqalpog'iston Respublikasi": "Республика Каракалпакстан",

  // ── Manba / yaratuvchi / teglar ─────────────────────────────────────────
  "Mijoz ilovadan bergan": "Клиент оформил в приложении",
  "Operator rasmiylashtirgan": "Оформил оператор",
  Shovrum: "Шоурум",
  "Qayta qo'ng'iroq": "Перезвонить",
  "To'lov muammosi": "Проблема с оплатой",
  "Yirik zakaz": "Крупный заказ",
  Shoshilinch: "Срочно",

  // ── Yetkazish oynasi ────────────────────────────────────────────────────
  Ertalab: "Утро",
  Kunduzi: "День",
  Kechqurun: "Вечер",

  // ── Tasdiq kanali ───────────────────────────────────────────────────────
  "Mijoz tasdig'i kutilmoqda": "Ожидается подтверждение клиента",
  "Onlayn to'lov kutilmoqda": "Ожидается онлайн-оплата",
  "Mijoz ilovada tasdiqladi": "Клиент подтвердил в приложении",
  "Mijoz ilovadan o'zi buyurdi": "Клиент сам заказал в приложении",
  "Telefon orqali tasdiqlandi": "Подтверждён по телефону",
  "Majburan tasdiqlandi (CRM)": "Подтверждён принудительно (CRM)",
  "Onlayn to'lov bilan tasdiqlandi": "Подтверждён онлайн-оплатой",
  "O'zi buyurdi": "Заказал сам",
  "Telefon orqali": "По телефону",
  "Majburan (CRM)": "Принудительно (CRM)",
  "Onlayn to'landi": "Оплачен онлайн",
  "Mijoz ilovada": "Клиент в приложении",
  // Kim tasdiqladi (shartnoma 2026-10-01 §4) — ism `{x}` o'rnida.
  "Mijoz o'zi rasmiylashtirdi": "Клиент оформил сам",
  "Shifokor yaratdi": "Создал врач",
  Tasdiqlandi: "Подтверждён",
  "Operator tasdiqladi": "Подтвердил оператор",
  "Admin tasdiqladi": "Подтвердил админ",
  "Logist tasdiqladi": "Подтвердил логист",
  "Operator {x} tasdiqladi": "Оператор {x} подтвердил",
  "Admin {x} tasdiqladi": "Админ {x} подтвердил",
  "Logist {x} tasdiqladi": "Логист {x} подтвердил",
  "Shifokor {x} yaratdi": "Врач {x} создал",
  "Ilova ishlamayapti": "Приложение не работает",
  // Ilovani o'rnatish imkoni bo'lmadi (§2).
  "Ilovani o'rnatish imkoni bo'lmadi": "Установить приложение невозможно",
  "Knopkali telefon": "Кнопочный телефон",
  "Telefon ilovani ko'tarmaydi": "Телефон не поддерживает приложение",
  "Smartfon yo'q": "Нет смартфона",
  "Belgiladi: {x}": "Отметил: {x}",

  // ── To'lov ──────────────────────────────────────────────────────────────
  "Onlayn to'lov": "Онлайн-оплата",
  Keshbek: "Кешбэк",
  "Qo'lda": "Вручную",
  "O'tkazma": "Перевод",
  Onlayn: "Онлайн",
  "To'lanmagan": "Не оплачен",
  "To'langan": "Оплачен",
  "Onlayn kutilmoqda": "Ожидается онлайн",
  "To'lov usuli tanlanmagan": "Способ оплаты не выбран",
  "Qisman qaytarilgan": "Частично возвращён",
  Qaytarilgan: "Возвращён",
  "Qaytarilishi kerak": "Нужно вернуть",
  "Qisman: {x}": "Частично: {x}",
  "Yetkazishda olinadi": "Оплата при доставке",
  "To'lov tasdiqlanmagan": "Оплата не подтверждена",

  // ── Kim nima qildi (audit) ──────────────────────────────────────────────
  "Operator nomidan yaratdi": "Создал от имени оператора",
  Tahrirladi: "Отредактировал",
  "Statusni o'zgartirdi": "Изменил статус",
  "Kuryer biriktirdi": "Назначил курьера",
  "Yetkazish izohini yozdi": "Написал комментарий к доставке",
  "Yetkazib bo'lmadi deb belgiladi": "Отметил «Не удалось доставить»",
  "Boshqa filialga o'tkazdi": "Передал в другой филиал",
  "Boshqa filialdan qabul qildi": "Принял из другого филиала",
  "To'lovni tasdiqladi": "Подтвердил оплату",
  "To'lov turini o'zgartirdi": "Изменил тип оплаты",

  // ── Maydon nomlari (tarix) ──────────────────────────────────────────────
  "Jami summa": "Общая сумма",
  "Rejalashtirilgan sana": "Запланированная дата",
  "To'langan summa": "Оплаченная сумма",
  "Ishlatilgan ball": "Использовано баллов",
  "Ball chegirmasi": "Скидка баллами",
  "Bekor sababi": "Причина отмены",
  "Bekor izohi": "Комментарий к отмене",
  "Qaytarish sababi": "Причина возврата",
  "Mijoz telefonlari": "Телефоны клиента",
  "Mijoz ismi": "Имя клиента",
  "O'zgarish sababi": "Причина изменения",

  // ── Tartib va buyurtma chati (2026-10-01) ───────────────────────────────
  Tartib: "Сортировка",
  "Status bo'yicha (yangi tepada)": "По статусу (новые сверху)",
  "Yaratilgan sana": "Дата создания",
  "Yangi xabar": "Новое сообщение",
  "Chatda {n} ta yangi xabar": "Новых сообщений в чате: {n}",
  "Chatda yangi xabari bor buyurtmalar: {n}":
    "Заказов с новыми сообщениями в чате: {n}",
  "Chatda yangi xabari bor buyurtmalar: {n} — ko'rsatish":
    "Заказов с новыми сообщениями в чате: {n} — показать",
  "· chatda yangi xabar: {n}": "· новые сообщения в чате: {n}",
  // ── Ball keshbegi (2026-10-01 C §3) va statusdagi vaqt (§7) ──
  "Keshbek bekor qilindi: {n} ball qaytarib olindi":
    "Кешбэк отменён: списано {n} {n|балл|балла|баллов}",
  "{n} ball yozilgan edi, qolgani kechirildi":
    "Было начислено {n} {n|балл|балла|баллов}, остаток прощён",
  "Yetkazilganda {n} ball tushadi":
    "При доставке начислится {n} {n|балл|балла|баллов}",
  "{n} ball mijoz raqamida saqlanmoqda":
    "{n} {n|балл|балла|баллов} ожидает на номере клиента",
  "Ilovada shu raqam bilan ro'yxatdan o'tganda hamyonga tushadi":
    "Поступит в кошелёк, когда клиент зарегистрируется в приложении с этим номером",
  "{n} ball hisobga tushdi": "Зачислено {n} {n|балл|балла|баллов}",
  "{x} gacha amal qiladi": "действует до {x}",
  "Shu statusda: {x} dan": "В этом статусе с {x}",
  "Yuklanmagan ustunlar: {x}. Serverda xato (mijozsiz buyurtma) — qolganlari ko'rsatilmoqda.":
    "Не загружены колонки: {x}. Ошибка сервера (заказ без клиента) — остальные показаны.",

  // ── Geokod (2026-10-16 B4) ─────────────────────────────
  "Manzil taxminiy": "Адрес приблизительный",
  "Tumandan tashqarida": "Вне района",
  "Geokod kutilmoqda": "Геокод ожидается",
  "Geokod manzilni faqat taxminan topdi (ko'cha yoki mahalla markazi). Kuryer adashmasin — manzilni aniqlashtiring.":
    "Геокодер нашёл адрес лишь приблизительно (центр улицы или махалли). Чтобы курьер не заблудился — уточните адрес.",
  "Topilgan nuqta buyurtma tumani chegarasidan tashqarida. Manzil yoki tuman xato bo'lishi mumkin.":
    "Найденная точка вне границ района заказа. Возможно, ошибка в адресе или районе.",
  "Manzil hali xaritada aniqlanmagan — server fonda qayta urinadi.":
    "Адрес ещё не найден на карте — сервер повторит попытку в фоне.",
  "Manzil muammosi": "Проблема с адресом",
  "Manzilni aniqlashtiring — mijoz bilan tekshirib, to'g'rilang.":
    "Уточните адрес — сверьте с клиентом и исправьте.",
  "Manzilni tahrirlash": "Изменить адрес",
  "Geokod: {x}": "Геокод: {x}",
  "aniq (bino)": "точный (здание)",
  "ko'cha bo'yicha": "по улице",
  "markaz (taxminiy)": "центр (приблизительно)",
  taxminiy: "приблизительно",
  "{n} km": "{n} км",
  "~{n} km": "~{n} км",
  "{n} m": "{n} м",
  "~{n} m": "~{n} м",
  "~{n} daq": "~{n} мин",
  "~{n} soat": "~{n} ч",
  "~{n} soat {n2} daq": "~{n} ч {n2} мин",

  // ── Mahalla va manzil tarixi (HUDUD_BACKEND_TALABLAR_3 §1–§2) ─────────────
  "Mahalla / qishloq": "Махалля / село",
  "Masalan: Navbahor MFY": "Например: Навбахор МФЙ",
  "120 belgidan oshmasin": "Не более 120 символов",
  Koordinata: "Координаты",
  "Kuryer manzilni o'zgartirdi": "Курьер изменил адрес",
  "Logist manzilni o'zgartirdi": "Логист изменил адрес",
  "Mijoz manzilni o'zgartirdi": "Клиент изменил адрес",
  "Manzil o'zgartirildi": "Адрес изменён",
  "Mijoz xato kiritgan": "Клиент ввёл неверно",
  "Ko'chib o'tgan": "Переехал",
  Aniqlashtirildi: "Уточнено",
  "Manzil o'zgartirilgan (kuryer)": "Адрес изменён (курьер)",
  "Manzil o'zgartirilgan (logist)": "Адрес изменён (логист)",
  "Manzil o'zgartirilgan (mijoz)": "Адрес изменён (клиент)",
  "Oldingi va yangi manzil — buyurtma tarixida":
    "Старый и новый адрес — в истории заказа",

  // ── Manzil tuzilmasi — CRM bilan bir xil (2026-10-17): viloyat → tuman → davomi
  "Tuman / shahar": "Район / город",
  "Tuman nomi": "Название района",
  "Qishloq / mahalla": "Село / махалля",
  "Ko'cha, uy, mo'ljal": "Улица, дом, ориентир",
  "Avval viloyatni tanlang": "Сначала выберите область",
  "Tumanni tanlang": "Выберите район",
  Tanlanmagan: "Не выбран",
  "Bu viloyatda tumanlar yo'q": "В этой области нет районов",
  "Ro'yxatda yo'q — qo'lda yozaman": "Нет в списке — впишу вручную",
  "masalan: Yangihayot tumani": "например: Янгихаётский район",
  "Bu tuman ro'yxatda faol emas — tumanni qayta tanlang":
    "Этот район неактивен в списке — выберите район заново",
  "Tumanni tanlang — kuryer tezroq biriktiriladi":
    "Выберите район — курьер назначится быстрее",
  "Tuman topilmadi yoki faol emas — tumanni qayta tanlang":
    "Район не найден или неактивен — выберите район заново",
  "Tuman nomini yozing": "Введите название района",
  "Manzil juda uzun": "Адрес слишком длинный",
  "Juda uzun": "Слишком длинно",
  "Tumanlar yuklanmoqda": "Загрузка районов",
  "Tumanlar ro'yxati yuklanmadi": "Список районов не загрузился",
  "Internet yo'q — tumanlar ro'yxati yuklanmadi":
    "Нет интернета — список районов не загрузился",
  "Qo'lda yozish": "Вписать вручную",

  // ── Kuryerga manzil (yakunlash oynasi, 2026-10-29) ─────────────────────
  "Kuryerga manzil": "Адрес курьеру",
  "· sukut: {x}": "· по умолчанию: {x}",
  "qo'shilmaydi": "не добавляется",
  " · qo'lda": " · вручную",
  "Kuryerga manzil soni": "Количество адресов курьеру",
  "Manzilni kamaytirish": "Уменьшить адреса",
  "Qo'shilmasin": "Не добавлять",
  "Sukutga qaytarish": "Вернуть по умолчанию",
  "Zakaz birlashtirilgan manzilda — manzil bir marta hisoblanadi.":
    "Заказ в объединённом адресе — адрес считается один раз.",
  // ── «Jarayonda» va avto tasdiq (backend 2026-10-30) ───────────────────
  Jarayonda: "В процессе",
  "Logist yakunlashi kutilmoqda": "Ожидает завершения логистом",
  "Atkazni tasdiqlash": "Подтвердить отказ",
  "Kuryer: yetkazdim": "Курьер: доставил",
  "Kuryer: qaytaraman": "Курьер: возвращаю",
  "Operator: atkaz": "Оператор: отказ",
  "Avto tasdiq (tizim)": "Автоподтверждение (система)",
  "Avto tasdiq": "Автоподтверждение",
  // ── Filtrlar paneli va ustunlar (2026-10-30) ─────────────────────────
  "Boshqa amallar": "Другие действия",
  "Doskada ko'rinadigan ustunlar": "Колонки на доске",
  "Ko'rinadigan ustunlar": "Видимые колонки",
  "Ustunlar": "Колонки",
  "Filtrlar": "Фильтры",
  "Filtrlar — {n} ta tanlangan": "Фильтры — выбрано {n}",
  "Hammasini tozalash": "Очистить всё",
  "Hudud": "Территория",
  "Tanlangan filtrlar": "Выбранные фильтры",
  "Tanlov darhol qo'llanadi va havolada saqlanadi.": "Выбор применяется сразу и сохраняется в ссылке.",
  "Status: {x}": "Статус: {x}",
  "Davr: {x}": "Период: {x}",
  "Kuryer: {x}": "Курьер: {x}",
  "Yaratdi: {x}": "Создал: {x}",
  "To'lov: {x}": "Оплата: {x}",
  "Yetkazish: {x}": "Доставка: {x}",
  "Zona: {n} ta": "Зоны: {n}",
  "Tuman: {n} ta": "Районы: {n}",
  "Teg: {x}": "Тег: {x}",
  "Manba: {x}": "Источник: {x}",
  "{x} — olib tashlash": "{x} — убрать",
  "Hammasini ko'rsatish": "Показать все",
  "Bosh kuryersiz": "Без главного курьера",
  "Bosh kuryer qidirish...": "Поиск главного курьера...",
  "Kuryer manzil soni yangilandi": "Количество адресов курьера обновлено",
  "Manzil sonini o'zgartirib bo'lmadi": "Не удалось изменить количество адресов",
  "— yakunlangan kun hisobiga yoziladi, so'nggi qaror ustun.": "— записывается на день завершения, действует последнее решение.",
  "Masalan: uyiga yetib borgan": "Например: доехал до дома",
  "Zakaz hali yakunlanmagan — manzil soni yakunlashda yoziladi": "Заказ ещё не завершён — адреса записываются при завершении",
  "Manzil soni 0 dan 9 gacha bo'lishi kerak": "Количество адресов должно быть от 0 до 9",
};
