import type { Dictionary } from "../matcher";

/** Filiallararo almashinuv: ta'minot zakazlari va buyurtma o'tkazmalari. */
export const TRANSFERS: Dictionary = {
  "Ta'minot zakazlari va buyurtma o'tkazmalari":
    "Заявки на снабжение и передачи заказов",
  "Buyurtma o'tkazish": "Передача заказа",
  "Boshqa filialdan mahsulot so'rash (ta'minot zakazi)":
    "Запросить товар у другого филиала (заявка на снабжение)",
  "Ta'minot zakazi": "Заявка на снабжение",
  Kiruvchi: "Входящие",
  Chiquvchi: "Исходящие",
  "Holat bo'yicha filtr": "Фильтр по статусу",
  "Almashinuv bo'limi backend'ni kutmoqda": "Раздел обмена ожидает бэкенд",
  "Filiallararo zakaz oqimi (BACKEND-LOGIST.md §7–8) chiqishi bilan bu yerda kiruvchi va chiquvchi zakazlar real vaqtda ko'rinadi.":
    "После выпуска потока заявок между филиалами (BACKEND-LOGIST.md §7–8) здесь в реальном времени появятся входящие и исходящие заявки.",
  "Zakazlarni yuklashda xatolik": "Ошибка загрузки заявок",
  "Kiruvchi zakaz yo'q": "Входящих заявок нет",
  "Chiquvchi zakaz yo'q": "Исходящих заявок нет",
  "Boshqa filial zakaz yuborsa shu yerda ko'rinadi.":
    "Когда другой филиал отправит заявку, она появится здесь.",
  "Boshqa filialdan mahsulot kerak bo'lsa yangi zakaz yarating.":
    "Если нужен товар из другого филиала, создайте новую заявку.",
  "Yangi zakaz": "Новая заявка",
  "Jami zakaz": "Всего заявок",
  "Javob kutmoqda": "Ожидает ответа",
  "Tasdiq kutmoqda": "Ожидает подтверждения",
  "Mahsulot turi": "Видов товара",
  "ta zakaz javobingizni kutmoqda": "— столько заявок ждут вашего ответа",
  "{n} ta zakaz javobingizni kutmoqda":
    "{n} {n|заявка ждёт|заявки ждут|заявок ждут} вашего ответа",
  "Filiallararo almashinuv uchun backend hali chiqmagan":
    "Бэкенд для обмена между филиалами ещё не выпущен",

  // ── Yangi zakaz ─────────────────────────────────────────────────────────
  "{x} yuborildi — javob kutilmoqda": "{x} отправлена — ожидается ответ",
  "Zakaz yaratishda xatolik": "Ошибка создания заявки",
  "Boshqa filialdan mahsulot so'rash — ichki hujjat, narxsiz.":
    "Запрос товара у другого филиала — внутренний документ, без цен.",
  "Filiallararo almashinuv uchun backend hali chiqmagan (BACKEND-LOGIST.md §7) — bo'lim backend bilan birga ishga tushadi.":
    "Бэкенд для обмена между филиалами ещё не выпущен (BACKEND-LOGIST.md §7) — раздел заработает вместе с бэкендом.",
  "Boshqa filial yo'q — zakaz berish uchun tizimda kamida ikkita filial bo'lishi kerak.":
    "Других филиалов нет — для заявки в системе должно быть минимум два филиала.",
  "Ta'minotchi filial": "Филиал-поставщик",
  "Mahsulot qidiruvi": "Поиск товара",
  "Kamida 2 ta harf yozing...": "Введите минимум 2 буквы...",
  Kamaytirish: "Уменьшить",
  "{x} miqdori": "Количество: {x}",
  Oshirish: "Увеличить",
  "Zakaz yuborish": "Отправить заявку",

  // ── Zakaz tafsiloti ─────────────────────────────────────────────────────
  Zakaz: "Заявка",
  "Zakazni yuklashda xatolik": "Ошибка загрузки заявки",
  "Holatni o'zgartirishda xatolik": "Ошибка смены статуса",
  "Rad etish sababi:": "Причина отклонения:",
  "Rad etish sababi": "Причина отклонения",
  "Buyurtmachi filial": "Филиал-заказчик",
  "Kim yaratgan": "Кто создал",
  "Mahsulotlar ·": "Товары ·",
  "Sabab buyurtmachi filialga ko'rinadi.": "Причину увидит филиал-заказчик.",
  "Masalan: mahsulot qoldig'i yetarli emas":
    "Например: недостаточно остатка товара",

  // ── Buyurtmalarni o'tkazish ─────────────────────────────────────────────
  "o'tkazilmadi": "не передан",
  "{n} ta buyurtma taklif qilindi — javob kutilmoqda":
    "Предложено {n} {n|заказ|заказа|заказов} — ожидается ответ",
  "O'tkazishda xatolik": "Ошибка передачи",
  "Buyurtmani boshqa filialga o'tkazish": "Передать заказ в другой филиал",
  "Filialni tanlang, buyurtmalarni belgilang va sabab bilan yuboring — qabul qilinguncha ular sizda qulflanadi.":
    "Выберите филиал, отметьте заказы и отправьте с причиной — до принятия они заблокированы у вас.",
  "Raqam, mijoz, manzil": "Номер, клиент, адрес",
  "ta o'tkazsa bo'ladi": "можно передать",
  "{n} ta o'tkazsa bo'ladi": "Можно передать: {n}",
  "O'tkazsa bo'ladigan buyurtma yo'q": "Нет заказов, которые можно передать",
  "Faqat tasdiqlangan va tayyorlanayotgan buyurtmalar boshqa filialga o'tkaziladi.":
    "В другой филиал передаются только подтверждённые и готовящиеся заказы.",
  "Filiallar ro'yxati uchun backend javob bermayapti — o'tkazish hozircha ishlamaydi.":
    "Бэкенд списка филиалов не отвечает — передача пока не работает.",
  "Boshqa filial yo'q. O'tkazish uchun tizimda kamida ikkita filial bo'lishi kerak — adminda qo'shilgach shu ro'yxat o'zi to'ladi.":
    "Других филиалов нет. Для передачи в системе должно быть минимум два филиала — после добавления в админке список заполнится сам.",
  "Qabul qiluvchi filial shu matnni ko'radi":
    "Филиал-получатель увидит этот текст",
  "Masalan: manzil Samarqand hududida":
    "Например: адрес в Самаркандском районе",
  "Tanlangan buyurtmalar javob kelguncha sizda qulflanadi: status ham, kuryer ham o'zgarmaydi.":
    "Выбранные заказы блокируются у вас до ответа: не меняются ни статус, ни курьер.",
  "{n} ta buyurtmani yuborish": "Отправить {n} {n|заказ|заказа|заказов}",
  "Buyurtmalarni belgilang": "Отметьте заказы",

  // ── Xatolar ─────────────────────────────────────────────────────────────
  "Zakaz topilmadi — ro'yxatni yangilang":
    "Заявка не найдена — обновите список",
  "Bu holat o'tishi tartibga zid — sahifani yangilab qayta ko'ring":
    "Такой переход статуса нарушает порядок — обновите страницу и попробуйте снова",
  "O'z filialingizga zakaz berib bo'lmaydi":
    "Нельзя отправить заявку в свой филиал",
  "Kamida bitta mahsulot tanlang": "Выберите хотя бы один товар",
  "Mahsulot topilmadi — qidiruvni qayta bajaring":
    "Товар не найден — повторите поиск",
  "Filiallararo almashinuv uchun backend hali chiqmagan — tez orada":
    "Бэкенд для обмена между филиалами ещё не выпущен — скоро",

  // ── Amallar va holatlar ─────────────────────────────────────────────────
  "Tayyorlashni boshlash": "Начать подготовку",
  "Qabul qilib oldim": "Получил",
  "So'ralgan": "Запрошена",
  "Qabul qilingan": "Принята",
  Tayyorlanmoqda: "Готовится",
  "Qabul qilindi": "Получена",
  "Rad etilgan": "Отклонена",
  "Jo'natish": "Отправить",
  "Qabul qilib olish": "Получить",
};
