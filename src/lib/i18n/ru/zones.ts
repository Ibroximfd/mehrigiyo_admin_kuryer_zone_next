import type { Dictionary } from "../matcher";

/**
 * Zonalar bo'yicha taqsimlash (2026-10-15): tuman/zona, taklif, nomzod
 * kuryerlar, avto-taqsimlash, kassa nuqtasi va filiallararo hisobot.
 */
export const ZONES: Dictionary = {
  // ── Hudud ───────────────────────────────────────────────────────────────
  Zona: "Зона",
  Zonalar: "Зоны",
  "Zona qidirish...": "Поиск зоны...",
  Tuman: "Район",
  "Tuman qidirish...": "Поиск района...",
  "Tuman · zona": "Район · зона",
  "Tuman tanlang…": "Выберите район…",
  "Tumanlar yuklanmadi": "Районы не загрузились",
  Aniqlanmagan: "Не определён",
  "Hududi noma'lum": "Район неизвестен",
  "Zonasiz tuman": "Район без зоны",
  "Zonasiz tuman — admin zonaga qo'shsin":
    "Район без зоны — администратору нужно добавить его в зону",
  "Zona mos emas": "Зона не совпадает",
  "zona mos emas": "зона не совпадает",
  Avto: "Авто",
  "Avto biriktirildi": "Назначен автоматически",
  "Avto taqsimlash": "Автораспределение",
  "Avto taqsimlash biriktirgan": "Назначено автораспределением",
  "Avto taqsimlash o'chiq": "Автораспределение выключено",
  "Avto taqsimlash: faqat taklif": "Автораспределение: только подсказка",
  "Avto taqsimlash: to'liq": "Автораспределение: полное",
  "Avto to'xtatilgan": "Авто приостановлено",
  "avto to'xtatilgan": "авто приостановлено",
  "Avto to'xtatilgan — qo'lda biriktiring": "Авто приостановлено — назначьте вручную",
  "Tuman saqlandi": "Район сохранён",
  "Tuman saqlandi · zona: {x}": "Район сохранён · зона: {x}",
  "Tumanni saqlashda xatolik": "Ошибка сохранения района",
  "Bunday tuman topilmadi — ro'yxatdan tanlang":
    "Такой район не найден — выберите из списка",

  // ── Taklif ──────────────────────────────────────────────────────────────
  Taklif: "Предложение",
  "Taklif:": "Предложение:",
  "Taklif: {x}": "Предложение: {x}",
  "Taklif: {x} ({y})": "Предложение: {x} ({y})",
  "Taklif bor": "Есть предложение",
  Taklifsiz: "Без предложения",
  Biriktirish: "Назначить",
  "Zona aniqlanmagan — taklif yo'q": "Зона не определена — предложения нет",
  "Zonada smenadagi kuryer yo'q": "В зоне нет курьеров на смене",
  "asosiy zona": "основная зона",
  "ikkinchi zona": "вторая зона",
  "qo'shni zona": "соседняя зона",

  // ── Kuryer tanlash (nomzodlar) ──────────────────────────────────────────
  "Kuryer tanlash": "Выбор курьера",
  Tanlash: "Выбрать",
  Tanlangan: "Выбран",
  "Kuryerni olib tashlash": "Снять курьера",
  "Kuryer olib tashlandi": "Курьер снят",
  "Kuryer biriktirildi: {x}": "Курьер назначен: {x}",
  "Kuryer buyurtma zonasidan emas": "Курьер не из зоны заказа",
  "Biriktirish bajarildi — zonani tekshiring": "Назначение выполнено — проверьте зону",
  "Buyurtma zonasi:": "Зона заказа:",
  "Zona kuryerlari": "Курьеры зоны",
  "Qo'shni zona": "Соседняя зона",
  "Buyurtma zonasi aniqlanmagan — viloyat kuryerlari ko'rsatilmoqda":
    "Зона заказа не определена — показаны курьеры области",
  "Nomzod kuryer yo'q": "Нет подходящих курьеров",
  "Nomzod kuryerlarni yuklashda xatolik": "Ошибка загрузки подходящих курьеров",
  "Bu hududda faol kuryer topilmadi — zonalarni admin panelda tekshiring.":
    "В этом районе нет активных курьеров — проверьте зоны в админ-панели.",
  "{n} ta ochiq": "{n} {n|открытый|открытых|открытых}",
  "· tanish manzil": "· знакомый адрес",
  "· smenada emas": "· не на смене",
  "{n} km": "{n} км",

  // ── Avto-taqsimlash ─────────────────────────────────────────────────────
  "Zonalar bo'yicha avtomatik reja": "Автоматический план по зонам",
  "Tasdiqlangan, kuryersiz buyurtmalar uchun reja. Ko'rib chiqing, kerak bo'lsa kuryerni almashtiring, keyin qo'llang.":
    "План для подтверждённых заказов без курьера. Проверьте, при необходимости замените курьера и примените.",
  "Reja hali tuzilmagan": "План ещё не составлен",
  "Server zonalar, yuklama va masofaga qarab har buyurtmaga kuryer taklif qiladi. Reja 2 daqiqa amal qiladi.":
    "Сервер подберёт курьера для каждого заказа по зонам, нагрузке и расстоянию. План действует 2 минуты.",
  "Reja tuzish": "Составить план",
  "Qayta tuzish": "Пересоставить",
  "Taqsimlanadigan buyurtma yo'q": "Нет заказов для распределения",
  "Tasdiqlangan, kuryersiz buyurtma qolmagan.": "Подтверждённых заказов без курьера не осталось.",
  "Reja muddati tugadi": "Срок плана истёк",
  "Reja {x} amal qiladi": "План действует ещё {x}",
  "· {n} ta o'zgartirildi": "· изменено: {n}",
  "Qo'llash · {n} ta": "Применить · {n} шт.",
  "O'zgartirish": "Изменить",
  "· o'zgartirildi": "· изменено",
  "· keyin {n} ta": "· после: {n}",
  Biriktirilmaydiganlar: "Не будут назначены",
  "Biriktirilmaydi · {n}": "Не будут назначены · {n}",
  "Zona aniqlanmagan": "Зона не определена",
  "Smenada kuryer yo'q": "Нет курьеров на смене",
  "Biriktirib bo'lmadi": "Не удалось назначить",
  "{n} ta buyurtmaga kuryer biriktirildi": "Курьер назначен для заказов: {n}",
  "Hech qaysi buyurtma biriktirilmadi": "Ни один заказ не назначен",
  "{n} ta buyurtmada kuryer zonasi mos emas": "Зона курьера не совпадает в заказах: {n}",
  // Backend A2: smenasiz kuryerga biriktirish ruxsat — faqat ogohlantirish.
  "{n} ta buyurtma smenasiz kuryerga biriktirildi": "Назначено курьеру не на смене заказов: {n}",
  "Kuryer smenada emas": "Курьер не на смене",
  "Biriktirish bajarildi — kuryer smenaga chiqmaguncha ko'rmasligi mumkin":
    "Назначение выполнено — курьер может не увидеть заказ, пока не выйдет на смену",
  "{n} ta buyurtma biriktirilmadi": "Не назначено заказов: {n}",
  "{n} ta buyurtma biriktirilmadi: {x}": "Не назначено заказов: {n} — {x}",
  "Reja eskirdi: {n} ta buyurtma o'zgargan. Reja qayta tuzildi — tekshirib, yana qo'llang.":
    "План устарел: изменилось заказов — {n}. План пересоставлен — проверьте и примените снова.",
  "Reja eskirdi. Reja qayta tuzildi — tekshirib, yana qo'llang.":
    "План устарел. План пересоставлен — проверьте и примените снова.",
  "Reja eskirdi — qayta tuzilmoqda": "План устарел — составляется заново",
  "Reja eskirdi — buyurtmalar o'zgargan, reja qayta tuziladi":
    "План устарел — заказы изменились, план будет пересоставлен",
  "Taqsimlash rejasini tuzishda xatolik": "Ошибка составления плана распределения",
  "Taqsimlashni qo'llashda xatolik": "Ошибка применения распределения",
  "Bu amal sizga ruxsat etilmagan — admin panel orqali bajariladi":
    "Это действие вам недоступно — выполняется через админ-панель",

  // ── Kuryerlar sahifasi ──────────────────────────────────────────────────
  "Kuryerlar, zonalar va bugungi yuklama": "Курьеры, зоны и нагрузка на сегодня",
  "Kuryer filtrlari": "Фильтры курьеров",
  Smena: "Смена",
  Smenada: "На смене",
  "Filtrga mos kuryer yo'q": "Нет курьеров по фильтру",
  "Boshqa zona yoki smena holatini tanlang.": "Выберите другую зону или статус смены.",
  "Filtrni tozalash": "Сбросить фильтр",
  "Kuryerlar admin panelda qo'shiladi va zonalarga biriktiriladi.":
    "Курьеры добавляются в админ-панели и привязываются к зонам.",
  "Akkaunt — admin panelda": "Аккаунт — в админ-панели",
  "Kuryer akkaunti, paroli va faolligi admin panelda boshqariladi":
    "Аккаунт, пароль и активность курьера управляются в админ-панели",
  "Barcha filiallar bo'yicha ochiq buyurtmalar": "Открытые заказы по всем филиалам",
  "Ochiq: {n} ta": "Открытых: {n}",
  Filiallararo: "Межфилиальный",

  // ── Kassa nuqtasi va filiallararo hisobot ───────────────────────────────
  "Kassa:": "Касса:",
  "Mas'ul xodim": "Ответственный сотрудник",
  "Filial kassasi": "Касса филиала",
  "Filiallararo hisobot": "Межфилиальный отчёт",
  "Filiallararo naqd hisobot": "Межфилиальный отчёт по наличным",
  "Kuryer bir filialdan, kassa boshqa filialda bo'lganda — kim kimga qancha topshirishi kerak":
    "Когда курьер из одного филиала, а касса в другом — кто кому сколько должен передать",
  "Filiallararo hisobotni yuklashda xatolik": "Ошибка загрузки межфилиального отчёта",
  "Filiallararo pul yo'q": "Межфилиальных денег нет",
  "Bu oraliqda hamma kuryer pulni o'z filiali kassasiga topshirgan.":
    "За этот период все курьеры сдали деньги в кассу своего филиала.",
  "{n} ta topshirish": "{n} {n|передача|передачи|передач}",
  "Ikkala sanani ham tanlang": "Выберите обе даты",
  "Boshlanish sanasi tugashidan keyin bo'lmasin": "Дата начала не может быть позже даты окончания",
  "Oraliq 92 kundan oshmasin": "Период — не более 92 дней",

  // ── Taqsimlash oynasi: zona pillari (2026-10-15) ────────────────────────
  "Zona bo'yicha qo'lda taqsimlash": "Ручное распределение по зоне",
  "Zonani tanlang, buyurtmalarni belgilang, keyin o'ngdan kuryerni bosing. Oyna ochiq qoladi.":
    "Выберите зону, отметьте заказы, затем нажмите курьера справа. Окно останется открытым.",
  Oflayn: "Офлайн",
  "{x} kuryerlari": "Курьеры: {x}",
  "Bu zonada kuryer yo'q": "В этой зоне нет курьеров",
  "Kuryer zonaga admin panelda biriktiriladi. Hozircha «Hamma» ni tanlab boshqa kuryerga bering.":
    "Курьер привязывается к зоне в админ-панели. Пока выберите «Все» и назначьте другого курьера.",
  "Avval kuryer qo'shing.": "Сначала добавьте курьера.",
  "Bu zonada kuryersiz buyurtma yo'q": "В этой зоне нет заказов без курьера",
  "Boshqa zonani tanlang yoki hammasini ko'ring.": "Выберите другую зону или посмотрите все.",
  "Hamma zonalar": "Все зоны",
  "Smenada emas": "Не на смене",
  "bugun {n} ta · {n2} yetkazdi": "сегодня: {n} · доставил: {n2}",
  "· ochiq {n} ta": "· открытых: {n}",
  "Tuman yo'q": "Нет района",
  "Tumanni belgilash": "Указать район",

  // ── Avto-taqsimlash: sabablar va amallar ────────────────────────────────
  "Biriktiriladi {n}": "Будет назначено: {n}",
  "Biriktirilmaydi {n}": "Не будет назначено: {n}",
  "Tuman belgilanmagan": "Район не указан",
  "Tumanni belgilang — zona serverda hisoblanadi, keyin rejani qayta tuzing.":
    "Укажите район — сервер вычислит зону, затем пересоставьте план.",
  "Kuryerni smenaga chiqaring yoki qo'lda boshqa zona kuryeriga biriktiring.":
    "Выведите курьера на смену или вручную назначьте курьера из другой зоны.",
  "Buyurtmani qo'lda biriktiring.": "Назначьте заказ вручную.",
  "{n} ta buyurtmada tuman yo'q — avval tumanlarni belgilang":
    "В заказах не указан район: {n} — сначала укажите районы",
  "{n} ta buyurtma zonasida smenadagi kuryer yo'q — qo'lda taqsimlang":
    "В зоне заказов нет курьеров на смене: {n} — распределите вручную",
  "Hech qaysi buyurtma biriktirilmaydi — qo'lda taqsimlang":
    "Ни один заказ не будет назначен — распределите вручную",
  "Rejani qayta tuzish · {n} ta tuman belgilandi": "Пересоставить план · указано районов: {n}",
  "Tuman belgilandi": "Район указан",
  "Qo'lda taqsimlash": "Распределить вручную",

  // ── Hudud filtri: Viloyat · Zona · Tuman (2026-10-16) ───────────────────
  "Hudud filtri": "Фильтр по территории",
  "Tanlangan hudud": "Выбранная территория",
  "Viloyat qidirish...": "Поиск области...",
  "Boshqa hudud yoki smena holatini tanlang.": "Выберите другую территорию или статус смены.",
  "Hududni tanlang, buyurtmalarni belgilang, keyin o'ngdan kuryerni bosing. Oyna ochiq qoladi.":
    "Выберите территорию, отметьте заказы, затем нажмите курьера справа. Окно останется открытым.",
  "Bu hududda kuryersiz buyurtma yo'q": "На этой территории нет заказов без курьера",
  "Boshqa hududni tanlang yoki hammasini ko'ring.": "Выберите другую территорию или посмотрите все.",
  "Hamma hududlar": "Все территории",
  "Bu hududda kuryer yo'q": "На этой территории нет курьеров",
  "Kuryer zonaga admin panelda biriktiriladi. Hududni tozalab boshqa kuryerga bering.":
    "Курьер привязывается к зоне в админ-панели. Сбросьте территорию и назначьте другого курьера.",

  // ── Smena: smenadagilar / hammasi, smenadan tashqari kuryerga tasdiq ────
  Smenadagilar: "На смене",
  Hammasi: "Все",
  "Hammasini ko'rsatish": "Показать всех",
  "Smenadan tashqaridagi kuryerga ham biriktirish mumkin — tasdiq so'raladi.":
    "Можно назначить и курьера не на смене — потребуется подтверждение.",
  "Kuryer smenada emas — baribir biriktiraysizmi?": "Курьер не на смене — всё равно назначить?",
  "{x} hozir smenada emas. {n} ta buyurtma unga biriktiriladi.":
    "{x} сейчас не на смене. Ему будет назначено заказов: {n}.",
  "{x} hozir smenada emas.": "{x} сейчас не на смене.",
  "Kuryer smenaga chiqmaguncha buyurtmani ilovada ko'rmasligi mumkin.":
    "Пока курьер не выйдет на смену, он может не увидеть заказ в приложении.",
  "Baribir biriktirish": "Всё равно назначить",

  // ── Avto-taqsimlash: qulayliklar ────────────────────────────────────────
  "Tasdiqlangan, kuryersiz buyurtmalar uchun reja. Ko'rib chiqing, kerak bo'lsa kuryerni almashtiring, keyin qo'llang. Enter — qo'llash, Esc — yopish.":
    "План для подтверждённых заказов без курьера. Проверьте, при необходимости замените курьера и примените. Enter — применить, Esc — закрыть.",
  "Tanlanganlarni qo'llash · {n} ta": "Применить выбранные · {n} шт.",
  "Hammasini qo'llash · {n} ta": "Применить все · {n} шт.",
  "Qo'lda biriktirildi {n}": "Назначено вручную: {n}",
  "Kuryer bo'yicha": "По курьерам",
  "{n} ta belgilandi — faqat ularni qo'llash mumkin": "Отмечено: {n} — можно применить только их",
  "Belgilab faqat tanlanganlarni qo'llash mumkin": "Отметьте строки, чтобы применить только выбранные",
  "Shu yerda kuryer tanlang — smenadan tashqaridagiga ham mumkin (tasdiq bilan).":
    "Выберите курьера здесь — можно и не на смене (с подтверждением).",
  "o'zgartirildi": "изменено",
  "Biriktirildi:": "Назначен:",
  "{x} ni belgilash": "Отметить {x}",
  "Kuryerni tanlash": "Выбрать курьера",
  "Boshqa kuryerlar": "Другие курьеры",
  "Kuryer qidirish...": "Поиск курьера...",
};
