import type { Dictionary } from "../matcher";

/**
 * Umumiy matnlar: kirish, xato holatlari, kit komponentlari, format
 * birliklari, vaqt so'zlari.
 *
 * Kalit — komponentdagi o'zbek lotin matni (so'zma-so'z), qiymat — rus
 * tarjimasi. `{n}` — son, `{x}` — ixtiyoriy bo'lak (u ham tarjima qilinadi),
 * `{n|форма1|форма2|форма5}` — rus ko'plik shakli.
 */
export const COMMON: Dictionary = {
  "Chapga surish": "Прокрутить влево",
  "O'ngga surish": "Прокрутить вправо",
  // ── Kirish ──────────────────────────────────────────────────────────────
  "Yetkazish va filiallararo almashinuvni boshqarish paneli":
    "Панель управления доставкой и обменом между филиалами",
  "Yetkazish va filiallararo almashinuv paneli":
    "Панель доставки и обмена между филиалами",
  "Telefon raqamni kiriting": "Введите номер телефона",
  "Faqat raqam kiriting": "Введите только цифры",
  "Parolni kiriting": "Введите пароль",
  "Xush kelibsiz": "Добро пожаловать",
  "Hisobingizga kirish uchun ma'lumotlarni kiriting":
    "Введите данные для входа в аккаунт",
  "Telefon raqam": "Номер телефона",
  "Telefon raqami": "Номер телефона",
  Parol: "Пароль",
  "Parolni yashirish": "Скрыть пароль",
  "Parolni ko'rsatish": "Показать пароль",
  "Tekshirilmoqda...": "Проверка...",
  "Tizimga kirish": "Войти",
  "Login yoki parol xato": "Неверный логин или пароль",

  // ── Sahifa holatlari ────────────────────────────────────────────────────
  "Sahifa topilmadi": "Страница не найдена",
  "Siz izlagan sahifa mavjud emas yoki manzili o'zgargan.":
    "Страница, которую вы ищете, не существует или её адрес изменился.",
  "Boshqaruv paneliga qaytish": "Вернуться в панель управления",
  "Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko'ring.":
    "Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.",
  "Xatolik yuz berdi": "Произошла ошибка",
  "Qayta urinish": "Повторить",
  "Ma'lumot yo'q": "Нет данных",
  "Bu davrda ma'lumot yo'q": "За этот период нет данных",
  "Ma'lumotni yuklashda xatolik": "Ошибка загрузки данных",
  Yuklanmoqda: "Загрузка",
  "Yuklanmoqda...": "Загрузка...",
  "Yuklanmoqda — {n}%": "Загрузка — {n}%",
  Topilmadi: "Не найдено",
  "Hech narsa topilmadi": "Ничего не найдено",

  // ── Kit komponentlari ───────────────────────────────────────────────────
  "{x} raqamiga qo'ng'iroq qilish": "Позвонить на номер {x}",
  "MicroSIP orqali qo'ng'iroq": "Звонок через MicroSIP",
  Tasdiqlash: "Подтвердить",
  "Boshlanish sanasi": "Дата начала",
  "Tugash sanasi": "Дата окончания",
  "Sanani tozalash": "Очистить дату",
  "{x} dan": "с {x}",
  "{x} gacha": "по {x}",
  "Qidirish...": "Поиск...",
  Qidirish: "Поиск",
  "{x} filtrini olib tashlash": "Убрать фильтр «{x}»",
  "Filtrni olib tashlash": "Убрать фильтр",
  Tozalash: "Очистить",
  "Taklif havolasi": "Ссылка-приглашение",
  "Havolani ochish": "Открыть ссылку",
  // Chatdagi telefon va `#buyurtma` havolalari (`linkified-text.tsx`).
  "Telefon raqamini nusxalash": "Скопировать номер телефона",
  "Buyurtmani ochish": "Открыть заказ",
  "Shu yerda ko'rish": "Смотреть здесь",
  Ochish: "Открыть",
  Video: "Видео",
  Rasm: "Изображение",
  "Yangi oynada ochish": "Открыть в новом окне",
  "Yuklab olish": "Скачать",
  Yopish: "Закрыть",
  Yangilash: "Обновить",
  "Yangilash — R": "Обновить — R",
  "Oxirgi yangilanish: {x}": "Последнее обновление: {x}",
  "Qidiruvni tozalash": "Очистить поиск",
  "Buyurtma bosqichlari": "Этапы заказа",
  "Yorug'": "Светлая",
  "Qorong'i": "Тёмная",
  Tizim: "Системная",
  Mavzu: "Тема",
  Til: "Язык",
  "Tilni tanlash": "Выбрать язык",
  Yuborilmoqda: "Отправка",
  "Yuborilmoqda…": "Отправка…",
  "Yuborishni bekor qilish": "Отменить отправку",
  "Bekor qilish": "Отмена",
  Saqlash: "Сохранить",
  Yuborish: "Отправить",
  "Qo'shish": "Добавить",
  "O'chirish": "Удалить",
  Tahrirlash: "Редактировать",
  Tayyor: "Готово",
  Yoqish: "Включить",
  "Olib tashlash": "Убрать",
  Ixtiyoriy: "Необязательно",
  Telefon: "Телефон",
  Telefonlar: "Телефоны",

  // ── API klient xatolari ─────────────────────────────────────────────────
  "Fayl juda katta — server qabul qilmadi. Kichikroq fayl yuboring.":
    "Файл слишком большой — сервер его не принял. Отправьте файл поменьше.",
  "Refresh javobida access token yo'q":
    "В ответе на обновление нет токена доступа",
  "Server xatosi yuz berdi": "Произошла ошибка сервера",
  "So'rov vaqti tugadi. Qaytadan urinib ko'ring.":
    "Время запроса истекло. Попробуйте ещё раз.",
  "Tarmoq xatosi. Internetingizni tekshiring.":
    "Ошибка сети. Проверьте подключение к интернету.",
  "Yuklash bekor qilindi": "Загрузка отменена",
  "Yuklash vaqti tugadi. Qaytadan urinib ko'ring.":
    "Время загрузки истекло. Попробуйте ещё раз.",
  "Sessiya tugadi. Qaytadan kiring.": "Сессия истекла. Войдите снова.",

  // ── Birliklar va pul ────────────────────────────────────────────────────
  "so'm": "сум",
  "{n} so'm": "{n} сум",
  "{n} mln": "{n} млн",
  "{n} ming": "{n} тыс.",
  "{n} soat {n2} daq": "{n} ч {n2} мин",
  "{n} daq": "{n} мин",
  "{n} soat": "{n} ч",
  "{n} dona": "{n} шт.",
  "{n} quti": "{n} {n|коробка|коробки|коробок}",
  "{n} ta": "{n} шт.",
  ta: "шт.",
  dona: "шт.",
  "{n} B": "{n} Б",
  "{n} KB": "{n} КБ",
  "{n} MB": "{n} МБ",

  // ── Vaqt ────────────────────────────────────────────────────────────────
  Bugun: "Сегодня",
  bugun: "сегодня",
  Kecha: "Вчера",
  Ertaga: "Завтра",
  Hafta: "Неделя",
  Oy: "Месяц",
  Yil: "Год",
  Kun: "День",
  Sana: "Дата",
  Vaqt: "Время",
  Davr: "Период",
  "{n} sekund oldin": "{n} {n|секунду|секунды|секунд} назад",
  "{n} soniya oldin": "{n} {n|секунду|секунды|секунд} назад",
  "{n} minut oldin": "{n} {n|минуту|минуты|минут} назад",
  "{n} daqiqa oldin": "{n} {n|минуту|минуты|минут} назад",
  "{n} soat oldin": "{n} {n|час|часа|часов} назад",
  "{n} kun oldin": "{n} {n|день|дня|дней} назад",
  "{n} hafta oldin": "{n} {n|неделю|недели|недель} назад",
  "{n} oy oldin": "{n} {n|месяц|месяца|месяцев} назад",
  "{n} yil oldin": "{n} {n|год|года|лет} назад",
  "{x} oldin": "{x} назад",
  "+{n} daqiqa": "+{n} мин",
  "+{n} soat": "+{n} ч",

  // ── Rollar ──────────────────────────────────────────────────────────────
  Administrator: "Администратор",
  Admin: "Админ",
  admin: "админ",
  Logist: "Логист",
  logist: "логист",
  Operator: "Оператор",
  operator: "оператор",
  Kuryer: "Курьер",
  Mijoz: "Клиент",
  Xodim: "Сотрудник",
  Filial: "Филиал",
  Shifokor: "Врач",
  Registratura: "Регистратура",
};
