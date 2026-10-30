import type { Dictionary } from "../matcher";

/**
 * Kuryer ilovasi bilan ishlash (`KURYER_SAYTLAR_LOGIST_OPERATOR.md`):
 * akkaunt, jonli holat, haftalik naqd yig'im, isbot, chat, signal,
 * anomaliyalar.
 */
export const COURIER_APP: Dictionary = {
  // ── Kuryer akkaunti ─────────────────────────────────────────────────────
  "Ilova akkaunti": "Аккаунт приложения",
  "Ilova akkaunti ochilsin": "Открыть аккаунт приложения",
  "Ilova akkaunti bilan kuryer o'z telefonida buyurtmalarni ko'radi, rasm bilan yetkazadi va pulni hisoblaydi.":
    "С аккаунтом приложения курьер видит заказы на своём телефоне, подтверждает доставку фото и ведёт учёт денег.",
  "Kuryer ilovaga shu raqam bilan kiradi.":
    "Курьер входит в приложение по этому номеру.",
  "Bo'sh qoldirsangiz server oson parol yasaydi.":
    "Если оставить пустым, сервер создаст простой пароль.",
  "masalan, 482913": "например, 482913",
  "Ilova akkauntini ochish": "Открыть аккаунт приложения",
  "Parolni yangilash": "Сменить пароль",
  "Qurilmadan chiqarish": "Выйти с устройства",
  "Ilovadan o'chirish": "Отключить от приложения",
  "{x} — ilova akkaunti": "{x} — аккаунт приложения",
  "Qurilmadan chiqarilsinmi?": "Выйти с устройства?",
  "Kuryer o'z paroli bilan qayta kira oladi. Telefondagi yuborilmagan amallar o'sha telefonda qoladi.":
    "Курьер сможет снова войти со своим паролем. Неотправленные действия останутся на том телефоне.",
  Chiqarish: "Выйти",
  "Ilovadan o'chirilsinmi?": "Отключить от приложения?",
  "Kuryer ilovaga kira olmaydi, sessiyasi darhol yopiladi. Qayta yoqish uchun yangi parol beriladi.":
    "Курьер не сможет войти, сессия закроется сразу. Чтобы вернуть доступ, выдайте новый пароль.",
  "{x} qurilmadan chiqarildi": "{x}: выход с устройства выполнен",
  "Qurilmadan chiqarishda xatolik": "Ошибка выхода с устройства",
  "{x} ilovadan o'chirildi": "{x}: отключён от приложения",
  "Kuryerni o'chirishda xatolik": "Ошибка отключения курьера",
  "Parolni o'rnatishda xatolik": "Ошибка установки пароля",
  "— kuryerning barcha qurilmasi uziladi.":
    "— все устройства курьера будут отключены.",
  "Yangi parol": "Новый пароль",
  "Kuryerga ayting": "Сообщите курьеру",
  "Parol faqat hozir ko'rinadi — keyin uni qayta ko'rib bo'lmaydi.":
    "Пароль виден только сейчас — потом его не посмотреть.",
  "Parolni nusxalash": "Скопировать пароль",
  "Parol nusxalandi": "Пароль скопирован",
  Aytdim: "Сообщил",
  "Ilovaga kirishi uchun kartadagi menyudan parol bering":
    "Чтобы курьер вошёл в приложение, выдайте пароль в меню карточки",

  // ── Jonli holat ─────────────────────────────────────────────────────────
  "Smenada · onlayn": "На смене · онлайн",
  "Smenada · aloqa yo'q": "На смене · нет связи",
  "Smenadan tashqarida": "Не на смене",
  Ilovasiz: "Без приложения",
  "Telefonda {n} ta yuborilmagan amal":
    "На телефоне {n} {n|неотправленное действие|неотправленных действия|неотправленных действий}",
  "· eng eskisi {x}": "· самое старое {x}",
  "Hozir yetkazayotgan buyurtmasi": "Заказ, который везёт сейчас",
  "Oxirgi joylashuv": "Последнее местоположение",
  Qurilma: "Устройство",

  // ── Haftalik naqd yig'im ────────────────────────────────────────────────
  "Haftalik naqd yig'im: kunlar, e'lonlar, topshirilmagan pul":
    "Еженедельный сбор наличных: дни, заявки, несданные деньги",
  "Naqd yig'im": "Сбор наличных",
  "— pul haftada bir yig'iladi, hisob kunlik":
    "— деньги собираются раз в неделю, учёт по дням",
  "Shu hafta": "Эта неделя",
  "O'tgan hafta": "Прошлая неделя",
  "Sanalarni tanlang": "Выберите даты",
  "Boshlanish sanasi tugashdan keyin": "Дата начала позже даты окончания",
  "Ko'pi bilan {n} kun": "Не более {n} {n|дня|дней|дней}",
  "Naqd hisobini yuklashda xatolik": "Ошибка загрузки учёта наличных",
  Topshirilmagan: "Не сдано",
  "Hammasi yopilgan": "Всё закрыто",
  "{n} kun · oraliq jami {x}": "{n} {n|день|дня|дней} · итого за период {x}",
  "Bu oraliqda naqd yetkazma yo'q": "За этот период наличных доставок нет",
  "Kuryer naqdga yopgan buyurtmalar kunma-kun shu yerda ko'rinadi.":
    "Заказы, закрытые курьером за наличные, видны здесь по дням.",
  "Sanalgan pul": "Пересчитанная сумма",
  "{x} kam — oxirgi kunga nizo bo'lib yoziladi":
    "Не хватает {x} — записывается спором на последний день",
  "{x} ortiqcha — oxirgi kunga yoziladi":
    "Лишние {x} — записываются на последний день",
  "Bo'sh qoldirsangiz har kun o'z summasi bilan qabul qilinadi.":
    "Если оставить пустым, каждый день принимается со своей суммой.",
  "masalan, 40 000 kam — keyingi haftada":
    "например, не хватает 40 000 — на следующей неделе",
  "Oraliqni yopish · {x}": "Закрыть период · {x}",
  "Naqd qabul qilinsinmi?": "Принять наличные?",
  "{x} kam: oxirgi kun \"nizo\" bo'lib yopiladi. Yopilgan kunni qayta ochib bo'lmaydi.":
    "Не хватает {x}: последний день закроется как «спор». Закрытый день нельзя открыть снова.",
  "Yopilgan kunlarni qayta ochib bo'lmaydi; buyurtmalar \"kassada\" bo'ladi.":
    "Закрытые дни нельзя открыть снова; заказы станут «в кассе».",
  "Ha, qabul qildim": "Да, принял",
  "Naqdni yopishda xatolik": "Ошибка закрытия наличных",
  "{x} — {n} kun yopildi, {x}": "{x} — закрыто {n} {n|день|дня|дней}, {x}",
  "{n} kun yopildi · {x}": "Закрыто {n} {n|день|дня|дней} · {x}",
  "Nizo · qabul qilingan {x}": "Спор · принято {x}",
  "Kuryer topshirishga tayyor": "Курьер готов сдать",
  ": nizo": ": спор",
  "— {x} kam": "— не хватает {x}",
  "Pul topshirishga tayyor · {n}": "Готовы сдать деньги · {n}",
  "{x} — {x} qabul qilindi": "{x} — принято {x}",
  "Naqdni qabul qilishda xatolik": "Ошибка приёма наличных",
  "Yig'im paneli: kunlar, kam berilgan summa, haftani yopish":
    "Панель сбора: дни, недостача, закрытие недели",
  "Kun yopiladi, buyurtmalar «kassada» bo'ladi. Kam berilgan bo'lsa — qatorni bosib, sanalgan summani kiriting.":
    "День закроется, заказы станут «в кассе». Если сдано меньше — нажмите на строку и введите пересчитанную сумму.",

  // ── To'lov holati ───────────────────────────────────────────────────────
  "Pul kuryerda": "Деньги у курьера",
  "pul kuryerda": "деньги у курьера",

  // ── Isbot va bosqich ────────────────────────────────────────────────────
  "Kuryer ilovasi": "Приложение курьера",
  "Marshrutda {n}-nuqta": "Точка {n} маршрута",
  "Kuryerga biriktirildi": "Назначен курьеру",
  "Kuryer oldi": "Курьер забрал",
  "Yetib keldi": "Прибыл",
  "Olingan summa": "Полученная сумма",
  Joylashuv: "Местоположение",
  "Manzildan {n} m": "{n} м от адреса",
  "manzildan {n} m": "{n} м от адреса",
  "GPS yo'q": "Нет GPS",
  "Telefon soati farqi": "Расхождение часов телефона",
  "soat farqi": "расхождение часов",
  "Kuryer izohi": "Комментарий курьера",
  "Isbot rasmi yo'q": "Нет фото подтверждения",
  "Isbot rasmlari": "Фото подтверждения",
  "Isbot rasmi {n}": "Фото подтверждения {n}",
  "Kartaga o'tkazma": "Перевод на карту",
  "Oldindan to'langan": "Оплачено заранее",
  "Qisman to'lov": "Частичная оплата",
  "Manzildan uzoqda yopilgan": "Закрыт далеко от адреса",
  "Telefon soati noto'g'ri": "Часы телефона неверны",
  "Summa to'liq emas": "Сумма неполная",

  // ── Anomaliyalar ────────────────────────────────────────────────────────
  Anomaliyalar: "Аномалии",
  "Qabul qilingan, lekin shubhali yetkazishlar":
    "Принятые, но подозрительные доставки",
  "Anomaliyalarni yuklashda xatolik": "Ошибка загрузки аномалий",
  "Bu kunda shubhali yetkazish yo'q": "В этот день подозрительных доставок нет",
  "Manzildan uzoqda, GPS'siz yoki kam summa bilan yopilgan buyurtmalar shu yerda chiqadi.":
    "Здесь появятся заказы, закрытые далеко от адреса, без GPS или с неполной суммой.",

  // ── Chat va signal ──────────────────────────────────────────────────────
  "Kuryer bilan chat": "Чат с курьером",
  "Kuryerdan {n} ta yangi xabar":
    "{n} {n|новое сообщение|новых сообщения|новых сообщений} от курьера",
  "Kuryerdan xabar · {x}": "Сообщение от курьера · {x}",
  "🎤 Ovozli xabar": "🎤 Голосовое сообщение",
  "Chatni yuklashda xatolik": "Ошибка загрузки чата",
  "Hali xabar yo'q. Kuryerga savol yoki ko'rsatma yozing.":
    "Сообщений пока нет. Напишите курьеру вопрос или указание.",
  "· {n} rasm": "· {n} фото",
  "Xabarni yuborishda xatolik": "Ошибка отправки сообщения",
  "Kuryerga yozing…": "Напишите курьеру…",
  "Xabar juda uzun": "Сообщение слишком длинное",
  // Server rad etgan havola (`javascript:` / `data:text/html`).
  "Ruxsatsiz havola": "Недопустимая ссылка",
  "Kuryerga xabar": "Сообщение курьеру",
  "Shoshilinch signal": "Срочный сигнал",
  "{x}ga signal yuborildi": "Сигнал отправлен: {x}",
  "Signal yuborishda xatolik": "Ошибка отправки сигнала",
  "telefonida baland bildirishnoma chiqadi — smenadan tashqarida ham.":
    "получит громкое уведомление — даже вне смены.",
  "Mijoz 10 daqiqada ketadi, tezroq!": "Клиент уйдёт через 10 минут, быстрее!",
  "Signal matni": "Текст сигнала",
  "Eshikda onlayn to'lov ochildi": "Открыта онлайн-оплата у двери",
  "Onlayn to'lov yopildi — naqdga qaytdi": "Онлайн-оплата закрыта — снова наличные",
  "15 daqiqada to'lanmadi": "Не оплачено за 15 минут",
  "Kuryer yopdi": "Курьер закрыл",
  "Mijoz to'lov oynasida bekor qildi": "Клиент отменил в окне оплаты",
  "Eshikda onlayn": "Онлайн у двери",
  "Eshikda onlayn · {x}": "Онлайн у двери · {x}",
  "Onlayn to'lov kutilmoqda": "Ожидается онлайн-оплата",
  "Onlayn to'lov kutilmoqda ({x})": "Ожидается онлайн-оплата ({x})",
  "Ovozli xabarni yuborishda xatolik": "Ошибка отправки голосового сообщения",
  "Faylni yuborishda xatolik": "Ошибка отправки файла",
  "Rasm yoki fayl yuborish": "Отправить фото или файл",
  "Rasm yoki fayl yuborish (PDF, Word, Excel, JPEG/PNG · 5 MB gacha)":
    "Отправить фото или файл (PDF, Word, Excel, JPEG/PNG · до 5 МБ)",
  "Bu turdagi fayl yuborilmaydi: PDF, Word, Excel yoki rasm (JPEG/PNG)":
    "Такой файл не отправить: PDF, Word, Excel или фото (JPEG/PNG)",
  "Fayl juda katta — 5 MB gacha": "Файл слишком большой — до 5 МБ",
  "Faylni yuklashda xatolik": "Ошибка загрузки файла",
  "Server yuklangan fayl id sini qaytarmadi": "Сервер не вернул ID загруженного файла",
  "Ovozli xabar juda uzun — 2 MB gacha": "Голосовое сообщение слишком длинное — до 2 МБ",
  "🖼 Rasm": "🖼 Фото",
};
