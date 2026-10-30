import type { Dictionary } from "../matcher";

/** Panel karkasi: navigatsiya, menyu, lenta, boshqaruv va statistika sahifalari. */
export const PANEL: Dictionary = {
  // ── Navigatsiya ─────────────────────────────────────────────────────────
  Boshqaruv: "Управление",
  Buyurtmalar: "Заказы",
  Buyurtma: "Заказ",
  Kuryerlar: "Курьеры",
  "Filiallar almashinuvi": "Обмен между филиалами",
  Almashinuv: "Обмен",
  "Xodimlar chati": "Чат сотрудников",
  Chat: "Чат",
  Statistika: "Статистика",
  "Admin · Logist paneli": "Админ · Панель логиста",
  "Logist paneli": "Панель логиста",
  "Admin · Bosh kuryer paneli": "Админ · Панель старшего курьера",
  "Bosh kuryer paneli": "Панель старшего курьера",
  "Panelni yig'ish": "Свернуть панель",
  "Panelni ochish": "Развернуть панель",
  "Asosiy menyu": "Главное меню",
  "Bo'limlar": "Разделы",
  "Muhokamada yangi xabar": "Новое сообщение в обсуждении",
  "muhokamada xabar": "сообщение в обсуждении",
  Harakatlar: "Действия",
  "Harakatlar jurnali": "Журнал действий",
  "Harakatlar lentasi": "Лента действий",
  Menyu: "Меню",
  "Buyurtma qidirish": "Поиск заказа",
  "# raqam, telefon, ism": "# номер, телефон, имя",
  "Logist menyusi": "Меню логиста",

  // ── Buyruqlar paneli ────────────────────────────────────────────────────
  "Buyruqlar paneli": "Командная панель",
  "Bo'limga o'tish yoki amal bajarish":
    "Перейти в раздел или выполнить действие",
  "Bo'lim, amal yoki buyurtma (raqam/telefon)...":
    "Раздел, действие или заказ (номер/телефон)...",
  "Qidirilmoqda...": "Поиск...",
  "Qidirilmoqda…": "Поиск…",
  "Hech narsa topilmadi.": "Ничего не найдено.",
  Amallar: "Действия",
  "Barcha ma'lumotni yangilash": "Обновить все данные",
  "Yorug' mavzu": "Светлая тема",
  "Qorong'i mavzu": "Тёмная тема",
  "Tizim mavzusi": "Системная тема",
  "Tizimdan chiqish": "Выйти из системы",
  boshqaruv: "управление",

  // ── Foydalanuvchi menyusi ───────────────────────────────────────────────
  "Ovoz yoqilgan": "Звук включён",
  "Ovoz o'chirilgan": "Звук выключен",
  "Bildirishnoma yoqilgan": "Уведомления включены",
  "Bildirishnoma o'chirilgan": "Уведомления выключены",
  "Sokin soatlar: {x}–{y}": "Тихие часы: {x}–{y}",
  "Sokin soatlar o'chiq": "Тихие часы выключены",
  "Sokin soatlar": "Тихие часы",
  "Bu oraliqda ovozli signal chalinmaydi; bildirishnoma va hisoblagichlar ishlayveradi.":
    "В этот промежуток звуковой сигнал не звучит; уведомления и счётчики продолжают работать.",
  "Sokin soatlarni yoqish": "Включить тихие часы",
  Boshlanishi: "Начало",
  Tugashi: "Конец",

  // ── Real vaqt signallari ────────────────────────────────────────────────
  "Mijoz buyurtmani tasdiqladi 🎉": "Клиент подтвердил заказ 🎉",
  "Buyurtma tasdiqlandi — yo'lga chiqarish mumkin":
    "Заказ подтверждён — можно отправлять в путь",
  "Yetkazish uchun yangi buyurtma tushdi": "Поступил новый заказ на доставку",
  "Boshqa filial buyurtma taklif qildi": "Другой филиал предложил заказ",
  "Ko'rish": "Смотреть",
  "Buyurtma taklifi": "Предложение заказа",
  "Kiruvchi buyurtma javobingizni kutmoqda":
    "Входящий заказ ждёт вашего ответа",
  "Media xabar": "Медиасообщение",
  "Filiallararo zakaz": "Заявка между филиалами",
  "Yangi filiallararo zakaz tushdi": "Поступила новая заявка между филиалами",
  "Yangi kiruvchi zakaz javob kutmoqda": "Новая входящая заявка ждёт ответа",
  "Eslatma vaqti keldi": "Время напоминания",
  "Internet aloqasi yo'q — ma'lumotlar yangilanmayapti":
    "Нет подключения к интернету — данные не обновляются",

  // ── Smena paneli ────────────────────────────────────────────────────────
  "Bugungi smena": "Сегодняшняя смена",
  "% bajarildi": "% выполнено",
  bajarildi: "выполнено",
  Navbatda: "В очереди",
  Aylanma: "Оборот",
  "{n} ta {x}": "{x}: {n}",

  // ── Harakatlar lentasi ──────────────────────────────────────────────────
  "Shu qurilma ko'rgan hodisalar": "События, замеченные на этом устройстве",
  "Filialda kim nima qilgani — real vaqtda":
    "Кто что сделал в филиале — в реальном времени",
  "Lentani tozalash": "Очистить ленту",
  "Jurnalni yangilash": "Обновить журнал",
  "Jurnal yuklanmoqda": "Журнал загружается",
  "Jurnalni yuklashda xatolik": "Ошибка загрузки журнала",
  "Hozircha tinch": "Пока тихо",
  "Buyurtma ko'chirilishi, kuryer biriktirilishi va boshqa hodisalar shu yerga tushib boradi.":
    "Сюда будут поступать перемещения заказов, назначения курьеров и другие события.",
  "Oldingi harakatlar": "Предыдущие действия",
  Eslatmalar: "Напоминания",
  Eslatma: "Напоминание",
  "vaqti keldi": "время пришло",
  "Eslatmani o'chirish": "Удалить напоминание",
  "Yangi buyurtma tushdi": "Поступил новый заказ",
  "Status o'zgardi": "Статус изменён",
  "status o'zgardi": "статус изменён",
  "Buyurtma tasdiqlandi": "Заказ подтверждён",
  "To'lov holati o'zgardi": "Статус оплаты изменён",
  "Kuryer biriktirildi": "Курьер назначен",
  "Yangi filiallararo zakaz": "Новая заявка между филиалами",
  "Zakaz: {x} → {y}": "Заявка: {x} → {y}",
  "Zakaz holati o'zgardi": "Статус заявки изменён",
  Teglar: "Теги",
  "Teglar o'zgardi": "Теги изменены",
  "Izoh yozildi": "Добавлен комментарий",
  "Buyurtma filialga taklif qilindi": "Заказ предложен филиалу",
  "O'tkazish yakunlandi": "Передача завершена",
  "Harakatlar jurnali uchun backend hali chiqmagan":
    "Бэкенд для журнала действий ещё не выпущен",
  "Oxirgi harakatlar": "Последние действия",
  "Jurnal backend chiqishi bilan ko'rinadi.":
    "Журнал появится после выпуска бэкенда.",
  "Jurnalni yuklab bo'lmadi — qayta urinish":
    "Не удалось загрузить журнал — повторить",
  "Hali harakat yo'q.": "Действий пока нет.",

  // ── Boshqaruv sahifasi ──────────────────────────────────────────────────
  "Bugun · {x}": "Сегодня · {x}",
  "Bugungi taqsimot": "Распределение на сегодня",
  Taqsimot: "Распределение",

  // ── Statistika ──────────────────────────────────────────────────────────
  "Logist statistikasi uchun backend hali chiqmagan":
    "Бэкенд для статистики логиста ещё не выпущен",
  "Davr bo'yicha filtr": "Фильтр по периоду",
  "Yetkazish ko'rsatkichlari — {x}": "Показатели доставки — {x}",
  "Statistikani yuklashda xatolik": "Ошибка загрузки статистики",
  "Yetkazish oqimi": "Поток доставки",
  "Jami {n} ta — tasdiqlangandan yetkazilgangacha. Ish qayerda to'planib qolgani ulushdan ko'rinadi":
    "Всего {n} — от подтверждения до доставки. По доле видно, где скапливается работа",
  "O'rtacha yetkazish": "Средняя доставка",
  "tasdiqlangandan yetkazilgangacha": "от подтверждения до доставки",
  "Yetkazib bo'lmadi": "Не удалось доставить",
  "urinish qayd etilgan": "зафиксировано попыток",
  "Bekor qilindi": "Отменено",
  "davr ichida": "за период",
  "kuryerlar yig'gan pul": "деньги, собранные курьерами",
  "Kunlik dinamika": "Динамика по дням",
  "Har kuni nechta buyurtma yetkazilgani; eng baland kun soni bilan belgilangan":
    "Сколько заказов доставлено каждый день; самый высокий день отмечен числом",
  "Status bo'yicha taqsimot": "Распределение по статусам",
  "Ustun uzunligi eng katta guruhga nisbatan; o'ngda — o'sha statusdagi jami summa":
    "Длина столбца — относительно самой большой группы; справа — общая сумма в этом статусе",
  "Aylanma tarkibi": "Структура оборота",
  "Jami {x} — bekor qilinganlarsiz": "Всего {x} — без отменённых",
  "Bekor qilingan buyurtmalar hisobga olinmaydi":
    "Отменённые заказы не учитываются",
  "Bu davrda aylanma yo'q": "За этот период оборота нет",
  "Kuryerlar reytingi": "Рейтинг курьеров",
  "Davr bo'yicha yetkazilgan buyurtmalar; o'ngda — o'rtacha yetkazish vaqti":
    "Доставленные за период заказы; справа — среднее время доставки",
  "Bugun yetkazgan buyurtmalari; o'ngda — yig'ilgan naqd (COD)":
    "Доставлено сегодня; справа — собранные наличные (COD)",
  "Kuryer endpointi faqat joriy kun hisobini beradi — bu kesim yuqoridagi davr filtriga bo'ysunmaydi":
    "Эндпоинт курьеров отдаёт только текущий день — этот срез не зависит от фильтра периода выше",
  "bugungi kesim": "срез за сегодня",
  "Kuryer modeli (BACKEND-LOGIST.md §4.4) chiqishi bilan reyting shu yerda ochiladi.":
    "Рейтинг появится здесь после выпуска модели курьера (BACKEND-LOGIST.md §4.4).",
  "Bu davrda yetkazilgan buyurtma yo'q":
    "За этот период доставленных заказов нет",
  "Kunlik dinamika, o'rtacha yetkazish vaqti va davr bo'yicha kuryer reytingi logist statistika endpointidan keladi (§4.12) — u hozir javob bermayapti, shuning uchun sahifada doska kesimi ko'rsatilmoqda.":
    "Динамика по дням, среднее время доставки и рейтинг курьеров за период приходят из эндпоинта статистики логиста (§4.12) — сейчас он не отвечает, поэтому на странице показан срез доски.",
  "Yakunlanish ulushi": "Доля завершённых",
  "yana {n} ta oqimda turibdi": "ещё {n} в работе",
  "oqimda kutayotgan buyurtma yo'q": "заказов в ожидании нет",
  // ── Statistika (redizayn 2026-10-01) ──
  "Bu davrda buyurtma yo'q": "За этот период заказов нет",
  "Boshqa davrni tanlang — masalan «Hafta» yoki «Oy».":
    "Выберите другой период — например «Неделя» или «Месяц».",
  "Har kuni yetkazilgan buyurtmalar — soni yoki summasi":
    "Доставленные заказы по дням — количество или сумма",
  "Kunlik dinamika logist statistika endpointidan keladi (§4.12) — u hozir javob bermayapti.":
    "Динамика по дням приходит из эндпоинта статистики логиста (§4.12) — сейчас он не отвечает.",
  "Jami {n} ta — tasdiqlangandan yetkazilgangacha":
    "Всего {n} — от подтверждения до доставки",
  "Davr bo'yicha yetkazilgan buyurtmalar, o'rtacha vaqt va yig'ilgan naqd":
    "Доставленные за период заказы, среднее время и собранные наличные",
  "Bugun yetkazgan buyurtmalari va yig'ilgan naqd (COD)":
    "Доставленные сегодня заказы и собранные наличные (COD)",
  "O'rtacha vaqt": "Среднее время",
  "Bu davrda kunlik ma'lumot yo'q": "За этот период нет данных по дням",
  "Grafik o'lchovi": "Показатель графика",
  "Ustun ustiga olib boring": "Наведите на столбец",
  "{n} ta hali yo'lda": "ещё {n} в пути",
  "hammasi yakunlangan": "все завершены",
  "{n}% buyurtmalardan": "{n}% от заказов",
  "yana {n} ta yetkazib bo'lmadi": "ещё {n} не удалось доставить",
  "to'lanadigan jami: {x}": "к оплате всего: {x}",
  "yetkazilganlar summasi": "сумма доставленных",
  "Faol kuryerlar": "Активные курьеры",
  "o'rtacha {n} ta / kuryer": "в среднем {n} на курьера",
  "yetkazish qayd etilmagan": "доставок не зафиксировано",
  "naqd: {x}": "наличные: {x}",
  Soni: "Количество",
  Summa: "Сумма",
  // ── Statistika (2026-10-01 C §14) ──
  "Har kun o'z sanasi bo'yicha: kelgan, yetkazilgan, bekor qilingan yoki tovar summasi":
    "Каждый день по своей дате: поступившие, доставленные, отменённые или сумма товара",
  "Davr bo'yicha: yetkazgani, muvaffaqiyat (yetkazgani / biriktirilgani), urinishlar, o'rtacha vaqt va naqd":
    "За период: доставлено, успешность (доставлено / назначено), попытки, среднее время и наличные",
  "Bu davrda kuryer faoliyati yo'q": "За этот период активности курьеров нет",
  Urinish: "Попытки",
  "Muvaffaqiyat: yetkazgani / biriktirilgani":
    "Успешность: доставлено / назначено",
  Kelgan: "Поступило",
  "Tovar summasi": "Сумма товара",
  "tovar: {x}": "товар: {x}",
  "{n} ta kelgan": "поступило: {n}",
  "yetkazilgan sanasi bo'yicha": "по дате доставки",
  "bekor qilingan sanasi bo'yicha": "по дате отмены",
  "Kassa tushumi": "Поступления в кассу",
  "tovar aylanmasi: {x}": "товарооборот: {x}",
  "yetkazilganlardan mijoz to'lagani": "оплачено клиентами за доставленные",
  "davrda kelgan": "поступили за период",
  "{n} ta hali ochiq": "открыто: {n}",
  "{x} to'lanadigan": "{x} к оплате",
  "Esc": "Esc",
};
