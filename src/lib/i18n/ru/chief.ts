import type { Dictionary } from "../matcher";

/** Bosh kuryer sayti: zakazlar, kuryerlar, zonalar, sklad, kassa, moliya. */
export const CHIEF: Dictionary = {
  "{n} zakaz": "{n} {n|заказ|заказа|заказов}",
  // ── Bosh kuryer sayti (alohida, 2026-10-30) ─────────────────────────
  "Bosh kuryer: zakazlarni zona bo'yicha taqsimlash, kuryerlar, zonalar, sklad, kassa va moliya":
    "Старший курьер: распределение заказов по зонам, курьеры, зоны, склад, касса и финансы",
  "Zakazlar, kuryerlar, sklad va kassa — bitta joyda":
    "Заказы, курьеры, склад и касса — в одном месте",
  "Kuryerlardan qabul": "Приём от курьеров",
  "Serverda bosh kuryer bo'limi hali yoqilmagan":
    "На сервере раздел старшего курьера ещё не включён",
  "Bu sayt bosh kuryerlar uchun": "Этот сайт — для старших курьеров",
  "Backend bosh kuryer API'sini chiqargach shu yerdan ishlaysiz.":
    "Когда бэкенд выпустит API старшего курьера, вы будете работать здесь.",
  "Akkauntingizda bosh kuryer roli yo'q. Rolni bosh logist beradi; logistlar logist saytida ishlaydi.":
    "У вашего аккаунта нет роли старшего курьера. Роль выдаёт главный логист; логисты работают на сайте логиста.",
  "Naqd hisobi": "Учёт наличных",
  // ── Bo'lim ──────────────────────────────────────────────────────────────
  "Bosh kuryer": "Старший курьер",
  "Bosh kuryer bo'limlari": "Разделы старшего курьера",
  "Bosh kuryer uchun backend hali chiqmagan":
    "Бэкенд для старшего курьера ещё не выпущен",
  "Bosh kuryer bo'limi backend'ni kutmoqda":
    "Раздел старшего курьера ожидает бэкенд",
  "API chiqishi bilan zakazlar, kuryerlar va kassa shu yerda bo'ladi.":
    "Как только выйдет API, здесь будут заказы, курьеры и касса.",
  "Faqat bosh kuryer uchun": "Только для старшего курьера",
  "Bu bo'lim bosh kuryer roli berilgan akkauntda ochiladi. Rolni bosh logist beradi.":
    "Раздел открывается в аккаунте с ролью старшего курьера. Роль выдаёт главный логист.",
  "Logist bergan zakazlarni o'z kuryerlaringizga taqsimlang":
    "Распределяйте заказы от логиста своим курьерам",
  Zakazlar: "Заказы",
  Kelganlar: "Поступившие",
  Faoliyatda: "В работе",
  "kuryerga berilmagan": "не переданы курьеру",
  "{n} tasi smenada": "{n} на смене",
  "Bugun yakunlandi": "Завершено сегодня",
  "logist tasdiqlagan": "подтверждено логистом",
  "Hammasini avto taqsimlash": "Распределить все автоматически",
  "Taqsimlanadigan zakaz yo'q": "Нет заказов для распределения",
  "{n} ta zakaz kuryerlarga taqsimlandi": "Распределено курьерам: {n}",
  "{n} ta taqsimlandi · {n2} tasi qoldi ({x})":
    "Распределено: {n} · осталось {n2} ({x})",
  "mos kuryer yo'q": "нет подходящего курьера",
  "zona aniqlanmagan": "зона не определена",
  "Avto taqsimlashda xatolik": "Ошибка автораспределения",
  "{x} — yana «Kelganlar» da": "{x} — снова в «Поступивших»",
  "Kuryerdan olishda xatolik": "Ошибка при снятии с курьера",
  "Kelgan zakaz yo'q": "Поступивших заказов нет",
  "Zakaz yo'q": "Заказов нет",
  "Logist zakazni sizga bersa shu yerda paydo bo'ladi.":
    "Когда логист передаст вам заказ, он появится здесь.",
  "Bu ro'yxatda hozircha zakaz yo'q.": "В этом списке пока нет заказов.",
  "{n} ta zakaz · eski birinchi":
    "{n} {n|заказ|заказа|заказов} · сначала старые",
  "Kuryerdan olib, «Kelganlar» ga qaytarish":
    "Снять с курьера и вернуть в «Поступившие»",
  Olish: "Взять",
  Almashtirish: "Заменить",
  "{x} tafsiloti": "{x} — подробно",
  "{x} — jamoangizdan mos kuryer": "{x} — подходящий курьер из вашей команды",
  "Kuryerga biriktirishda xatolik": "Ошибка назначения курьера",

  "Jamoangizda kuryer yo'q": "В вашей команде нет курьеров",
  "o'chirilgan": "отключена",
  "{x} jamoaga qo'shildi": "{x} добавлен в команду",
  "Kuryerni saqlashda xatolik": "Ошибка сохранения курьера",
  "Kuryerni tahrirlash": "Редактирование курьера",
  "Ism, telefon, zonalar va faollik": "Имя, телефон, зоны и активность",
  "Kuryer sizning jamoangizga qo'shiladi":
    "Курьер будет добавлен в вашу команду",
  "Faol (zakaz oladi)": "Активен (получает заказы)",
  "Zona qo'shish": "Добавить зону",
  "Zonani tahrirlash": "Редактирование зоны",
  "Zona yo'q": "Зон нет",
  "Tumanlarni zonalarga bo'ling — avto taqsimlash zonaga qarab ishlaydi.":
    "Разделите районы на зоны — автораспределение работает по зонам.",
  "Tumanlarni belgilang — avto taqsimlash shunga qarab ishlaydi.":
    "Отметьте районы — по ним работает автораспределение.",
  "Zonasiz tumanlar · {n}:": "Районы без зоны · {n}:",
  "Tumanlar · {n}": "Районы · {n}",
  Nomi: "Название",
  "Zonalarni yuklashda xatolik": "Ошибка загрузки зон",
  "Zonani saqlashda xatolik": "Ошибка сохранения зоны",

  Kassa: "Касса",
  "Kassani yuklashda xatolik": "Ошибка загрузки кассы",
  "hammasi topshirilgan": "всё сдано",
  Topshirish: "Сдать",
  "Pulni topshirishda xatolik": "Ошибка при сдаче денег",
  "Zakazlarni yuklashda xatolik": "Ошибка загрузки заказов",

  // ── Demo rejim ──────────────────────────────────────────────────────────
  Demo: "Демо",
  "Namuna ma'lumot — backendga so'rov ketmaydi":
    "Пример данных — запросы на бэкенд не уходят",
  "Kirish uchun telefon": "Для входа: телефон",
  "va parol": "и пароль",

  // ── Sahifa sarlavhalari (v2, 2026-10-30) ────────────────────────────────
  Sklad: "Склад",
  Moliya: "Финансы",
  "Kelgan zakazlarni kuryerlarga zona bo'yicha taqsimlang":
    "Распределяйте поступившие заказы курьерам по зонам",
  "Kuryer qo'shing, zonaga biriktiring yoki bloklang":
    "Добавляйте курьеров, привязывайте к зоне или блокируйте",
  "Viloyatlaringizni zonalarga bo'ling — zakaz zona kuryeriga tushadi":
    "Разделите свои области на зоны — заказ попадает курьеру зоны",
  "Skladingiz va kuryerlaringiz qo'lidagi mol":
    "Ваш склад и товар на руках у курьеров",
  "Kuryerlardan pulni qabul qiling va har filialga to'liq topshiring":
    "Принимайте деньги у курьеров и сдавайте каждому филиалу полностью",
  "Yetkazilgan mahsulot, manzillar va pul — kuryerlar va filiallar bo'yicha":
    "Доставленный товар, адреса и деньги — по курьерам и филиалам",
  "Internet aloqasi yo'q — ko'rganingiz oxirgi saqlangan holat":
    "Нет интернета — вы видите последнее сохранённое состояние",
  "Profil menyusi": "Меню профиля",
  "Holat bo'yicha filtr": "Фильтр по статусу",
  Chiqish: "Выйти",

  // ── Kuryerlar (§5b) ─────────────────────────────────────────────────────
  "Kuryerga berish": "Передать курьеру",
  "{x} zonadan olindi": "{x} снят с зоны",
  Ishlayapti: "Работают",
  Zonasiz: "Без зоны",
  Bloklangan: "Заблокированы",
  "Ism yoki telefon": "Имя или телефон",
  "Birinchi kuryerni qo'shing va uni zonaga biriktiring — zakazlar unga zona bo'yicha tushadi.":
    "Добавьте первого курьера и привяжите его к зоне — заказы будут приходить ему по зоне.",
  "Qidiruv yoki holat filtrini o'zgartiring.":
    "Измените поиск или фильтр статуса.",
  "{x} blokdan chiqarildi": "{x} разблокирован",
  "{x} bloklansinmi?": "Заблокировать {x}?",
  "Kuryer zonadan olinadi va yangi zakaz olmaydi.":
    "Курьер будет снят с зоны и не будет получать новые заказы.",
  "Keyin blokdan chiqarib, yana zonaga biriktirish mumkin.":
    "Позже можно разблокировать и снова привязать к зоне.",
  Bloklash: "Заблокировать",
  "{x} bloklandi": "{x} заблокирован",
  "telefon yo'q": "нет телефона",
  "Zona tanlang": "Выберите зону",
  Saqlanmoqda: "Сохраняется",
  "Blokdan chiqarish": "Разблокировать",
  "Ism, telefon va zona": "Имя, телефон и зона",
  "Kuryer jamoangizga qo'shiladi va tanlangan zonadan zakaz oladi":
    "Курьер будет добавлен в вашу команду и получит заказы выбранной зоны",
  "Ism familiya": "Имя и фамилия",
  "Avval «Zonalar» bo'limida zona yarating.":
    "Сначала создайте зону в разделе «Зоны».",
  "Hozircha zonasiz": "Пока без зоны",
  "Kuryer ilovasiga kirish uchun parol yaratish":
    "Создать пароль для входа в приложение курьера",

  // ── Zonalar (§5b) ───────────────────────────────────────────────────────
  "Hech qaysi zonada emas · {x}:": "Не входят ни в одну зону · {x}:",
  "Hali zona yo'q": "Зон пока нет",
  "Viloyatingiz tuman va shaharlarini zonalarga bo'ling — zakaz manzili qaysi zonada bo'lsa, o'sha zona kuryeriga tushadi.":
    "Разделите районы и города вашей области на зоны — заказ попадает курьеру той зоны, где адрес.",
  "{x} tuman · {x2} kuryer": "{x} р-н · {x2} кур.",
  "Tuman biriktirilmagan": "Районы не привязаны",
  "Zona saqlandi": "Зона сохранена",
  "Yangi zona": "Новая зона",
  "Tuman va shaharlarni belgilang. Boshqa zonadagisini belgilasangiz — shu zonaga o'tadi.":
    "Отметьте районы и города. Если отметить район из другой зоны — он перейдёт в эту.",
  "Zona nomi": "Название зоны",
  "· {x} tasi o'tadi": "· перейдут: {x}",
  "Tuman qidirish": "Поиск района",
  "Viloyat tumanlari yuklanmoqda yoki topilmadi":
    "Районы области загружаются или не найдены",
  "Bunday tuman yo'q": "Такого района нет",
  "Zona ishlayapti": "Зона работает",

  // ── Sklad (§5) ──────────────────────────────────────────────────────────
  "Skladni yuklashda xatolik": "Ошибка загрузки склада",
  "{x} skladi": "Склад «{x}»",
  Skladda: "На складе",
  Kuryerlarda: "У курьеров",
  "Mahsulot turi": "Видов товара",
  "Kam qolgan": "Заканчивается",
  "Kuryerlar ombori": "Склад курьеров",
  "Kuryerlar qo'lidagi mol — kuryer ilovasi yozgan holatda":
    "Товар на руках у курьеров — по данным приложения курьера",
  "Skladlar xaritasi": "Карта складов",
  "Bir rang — bitta sklad. Sizning skladingiz to'liq rangda.":
    "Один цвет — один склад. Ваш склад — насыщенным цветом.",
  "O'zbekiston viloyatlari skladlar bo'yicha": "Области Узбекистана по складам",
  Skladlar: "Склады",
  Sizniki: "Ваш",
  "Hamma filial": "Все филиалы",
  "Skladda mahsulot yo'q": "На складе нет товара",
  "Logist kirim qilgach shu yerda ko'rinadi.":
    "Появится здесь после прихода от логиста.",
  "Filtr yoki qidiruvni o'zgartiring.": "Измените фильтр или поиск.",
  "kam qoldi": "мало",
  "Kuryer qo'shsangiz, uning qo'lidagi mol shu yerda ko'rinadi.":
    "Добавьте курьера — его товар на руках появится здесь.",
  "Qo'lida mol yo'q": "Товара на руках нет",

  // ── Kassa (§6) ──────────────────────────────────────────────────────────
  "Har kuni, 3–4 kunda yoki haftada bir — bir necha kunni birga qabul qilsa bo'ladi":
    "Каждый день, раз в 3–4 дня или раз в неделю — можно принять несколько дней сразу",
  "Kuryer qo'shsangiz, uning yig'gan puli shu yerda ko'rinadi.":
    "Добавьте курьера — собранные им деньги появятся здесь.",
  "bugun yig'gan naqdi": "наличные за сегодня",
  "bugun naqd yo'q": "сегодня наличных нет",
  "Qabul qilingan": "Принято",
  "Qabul qilish": "Принять",
  "topshirish kuni {x}": "сдать {x}",
  "{x} kun kechikdi": "опоздание {x} дн.",
  "muddati o'tdi · {x} kun": "срок прошёл · {x} дн.",
  "Kuryerlarda (bugun)": "У курьеров (сегодня)",
  "hali qabul qilinmagan": "ещё не принято",
  "Filiallarga topshirish kerak": "Нужно сдать филиалам",
  "Filial qabul qilishi kutilmoqda": "Ожидает приёма филиалом",
  "Filiallarga topshirish": "Сдача филиалам",
  "Har filialga alohida, to'liq summa. Odatda har kuni; kechiksa {x} kungacha mumkin.":
    "Каждому филиалу отдельно, полной суммой. Обычно ежедневно; при задержке — до {x} дней.",
  "Topshiriqlar tarixi": "История сдачи",
  "Filial yo'q": "Филиалов нет",
  "Filiallar ochilgach har biriga alohida topshirasiz.":
    "Когда откроются филиалы, будете сдавать каждому отдельно.",
  "asosiy filial": "основной филиал",
  "{x} dan beri": "с {x}",
  "Hali topshiriq yo'q": "Сдач пока нет",
  "Filialga topshirgan pulingiz shu yerda sana bilan ko'rinadi.":
    "Деньги, сданные филиалу, будут видны здесь с датой.",
  "qabul qilindi": "принято",
  "qabul kutilmoqda": "ждёт приёма",
  "{x} — {x2} filialiga topshirildi": "{x} — сдано филиалу «{x2}»",
  "{x} filialiga topshirish": "Сдача филиалу «{x}»",
  "Summa to'liq topshiriladi. Haqingiz undan ushlanmaydi — filial alohida to'laydi.":
    "Сумма сдаётся полностью. Ваше вознаграждение из неё не удерживается — филиал платит отдельно.",
  "{x} dan beri yig'ilgan": "собрано с {x}",
  "Topshirish kuni": "Дата сдачи",
  Topshirdim: "Сдал",
  "Bu filialga topshiriladigan pul yo'q": "Этому филиалу нечего сдавать",

  // ── Moliya va hisobot (§4.5, §7) ────────────────────────────────────────
  "Hisobotni yuklashda xatolik": "Ошибка загрузки отчёта",
  "Bu davrda yetkazilgan zakaz yo'q": "За период нет доставленных заказов",
  "Boshqa kunni yoki kengroq oraliqni tanlang.":
    "Выберите другой день или более широкий период.",
  "Kechani ko'rish": "Показать вчера",
  "{x} dona mahsulot": "{x} шт. товара",
  "hozir kuryerlarda": "сейчас у курьеров",
  Manzillar: "Адреса",
  "haqingiz {x}": "ваше вознаграждение {x}",
  "Kuryerlardagi pul": "Деньги у курьеров",
  "sizga topshirildi {x}": "сдано вам {x}",
  "Filiallar bilan hisob": "Расчёт с филиалами",
  "Haqingiz = manzil soni × {x}. Narx hamma filial uchun bitta; filial haqni alohida to'laydi.":
    "Вознаграждение = число адресов × {x}. Цена одна для всех филиалов; филиал платит отдельно.",
  Haqingiz: "Вознаграждение",
  "Filialga pul": "Деньги филиалу",
  Topshirildi: "Сдано",
  "Har kuryer: yetkazgani, manzili va qo'lidagi pul":
    "По каждому курьеру: доставлено, адреса и деньги на руках",
  Kuryerda: "У курьера",
  Topshirdi: "Сдал",
  "Yetkazilgan mahsulotlar": "Доставленные товары",
  "Mahsulot dopuski filial bo'yicha — har mahsulot bitta filialniki":
    "Доступ к товарам — по филиалам: каждый товар принадлежит одному филиалу",

  // ── Zakazlar: qidiruv, filtr, detal, avto-taqsimlash rejasi ─────────────
  Yetkazilgan: "Доставленные",
  "Raqam, mijoz, telefon, manzil yoki mahsulot":
    "Номер, клиент, телефон, адрес или товар",
  Filtrlar: "Фильтры",
  "Faol filtrlar": "Активные фильтры",
  "{x}: olib tashlash": "{x}: убрать",
  "Hammasini tozalash": "Очистить всё",
  "Hamma zona": "Все зоны",
  "Hamma kuryer": "Все курьеры",
  "Hamma viloyat": "Все области",
  "Hamma tuman": "Все районы",
  "Qidiruv yoki filtrlarni o'zgartiring.": "Измените поиск или фильтры.",
  "Avto taqsimlash": "Автораспределение",
  "{x}: batafsil": "{x}: подробнее",
  Zakaz: "Заказ",
  "Zakazni yuklashda xatolik": "Ошибка загрузки заказа",
  "Zakaz topilmadi": "Заказ не найден",
  "To'lanadi": "К оплате",
  "Tarix backendda hali yo'q": "История на бэкенде пока не доступна",
  "Kuryerni almashtirish": "Заменить курьера",
  "Tarix bo'sh": "История пуста",
  "Zakaz yaratildi": "Заказ создан",
  "Sizga berildi": "Передан вам",
  "Kuryerga berildi": "Передан курьеру",
  "Kuryerdan olindi": "Снят с курьера",
  "Pul qabul qilindi": "Деньги приняты",
  "Pul filialga topshirildi": "Деньги сданы филиалу",
  "Avto taqsimlash rejasi": "План автораспределения",
  "Tekshiring: zona yoki kuryer xato bo'lsa — shu yerda almashtiring. Yuborish «Taqsimlash» bilan.":
    "Проверьте: если зона или курьер неверны — замените здесь. Отправка — кнопкой «Распределить».",
  "Rejani tuzishda xatolik": "Ошибка составления плана",
  "Kelgan zakazlar hammasi kuryerlarda.":
    "Все поступившие заказы уже у курьеров.",
  "Zonasi topilmadi · {x}": "Зона не найдена · {x}",
  "Zonani o'zingiz tanlang yoki zakazni chiqarib qo'ying.":
    "Выберите зону сами или исключите заказ.",
  "Zona bo'yicha · {x}": "По зонам · {x}",
  "{x} ta zakaz yuboriladi · {x2} tasi qoladi":
    "Будет отправлено: {x} · останется: {x2}",
  "Yuborilmoqda: {x} / {x2}": "Отправка: {x} / {x2}",
  "Kuryer yo'q": "Нет курьера",
  "Kuryer tanlang": "Выберите курьера",
  "{x}: zona": "{x}: зона",
  "{x}: kuryer": "{x}: курьер",
  Chiqarish: "Исключить",
  Qaytarish: "Вернуть",
  Taqsimlash: "Распределить",
  "{x} ta taqsimlandi · {x2} tasi o'tmadi: {x3}":
    "Распределено: {x} · не прошло: {x2}: {x3}",

  // ── Zonalar: qo'lda kiritilgan joy ──────────────────────────────────────
  "Joyni qo'shishda xatolik": "Ошибка добавления места",
  "Boshqa — o'zim yozaman": "Другое — впишу сам",
  "Ro'yxatda yo'q joy": "Места нет в списке",
  "Tuman, shahar yoki qishloq nomi — saqlangach ro'yxatda turadi.":
    "Название района, города или села — после сохранения появится в списке.",
  "Joy nomi": "Название места",
  "Masalan, Yangiqo'rg'on qishlog'i": "Например, село Янгикурган",
  "{x} qo'shildi": "{x} добавлено",
  "Qo'shish": "Добавить",

  // ── Sklad: faqat o'zi ───────────────────────────────────────────────────
  "Sizga sklad biriktirilmagan": "Вам не назначен склад",
  "Skladni asosiy filialning bosh logisti biriktiradi.":
    "Склад назначает главный логист основного филиала.",
  Qoldiq: "Остаток",
  "{x} skladi viloyatlari": "Области склада «{x}»",
  "Sizga biriktirilgan sklad — hamma viloyatlaringiz uchun bitta.":
    "Назначенный вам склад — один на все ваши области.",
  Viloyatlar: "Области",

  // ── Kassa: kun × filial, filtr va tartib ────────────────────────────────
  "muddati o'tgan": "просрочено",
  "Sana: yangi birinchi": "Дата: сначала новые",
  "Sana: eski birinchi": "Дата: сначала старые",
  "Summa: katta birinchi": "Сумма: сначала большие",
  "Summa: kichik birinchi": "Сумма: сначала меньшие",
  "Kuryer: A–Z": "Курьер: А–Я",
  Tartib: "Сортировка",
  "Kuryerlar pulini yuklashda xatolik": "Ошибка загрузки денег курьеров",
  "Sana yoki filtrlarni o'zgartiring.": "Измените дату или фильтры.",
  "Bu davrda naqd yo'q": "За период наличных нет",
  "Kuryerlar yetkazgan zakazlar puli shu yerda kun bo'yicha ko'rinadi.":
    "Деньги за доставленные заказы видны здесь по дням.",
  "Hamma holat": "Все статусы",
  "{x} ta yozuv · jami {x2}": "Записей: {x} · всего {x2}",
  "qabul qilinmagan {x}": "не принято {x}",
  "· {x} ta zakaz": "· заказов: {x}",

  // ── Backend v2 ulanishi (2026-10-31) ────────────────────────────────────
  "Urinishlar ko'payib ketdi — {x} soniyadan keyin qayta urinib ko'ring":
    "Слишком много попыток — повторите через {x} с",
  "Urinishlar ko'payib ketdi. Birozdan keyin qayta urinib ko'ring.":
    "Слишком много попыток. Повторите чуть позже.",
  "Bu akkaunt bosh kuryer sayti uchun emas — {x} kiring":
    "Этот аккаунт не для сайта старшего курьера — войдите {x}",
  "logist saytidan": "через сайт логиста",
  "CRM saytidan": "через CRM",
  "o'z saytidan": "через свой сайт",
  "kam qabul qilindi": "принято меньше",
  "Har kuni, 3–4 kunda yoki haftada bir — kuryer topshirgan pulni qabul qiling":
    "Ежедневно, раз в 3–4 дня или раз в неделю — принимайте деньги, сданные курьером",
  "Kuryerlardan topshiriq yo'q": "Сдач от курьеров нет",
  "Kuryer ilovadan pul topshirsa shu yerda kun bo'yicha ko'rinadi.":
    "Когда курьер сдаст деньги в приложении, они появятся здесь по дням.",
  "{x} ta yozuv": "Записей: {x}",
  "qabul {x}": "принято {x}",
  "{x} · {x2} qabul qilindi": "{x} · принято {x2}",
  "Pulni qabul qilish": "Приём денег",
  "· {x} · e'lon {x2}": "· {x} · заявлено {x2}",
  "Kam bo'lsa farq kuryerda qarz bo'lib qoladi.":
    "Если меньше — разница останется долгом курьера.",
  "E'londan farq {x}": "Разница с заявленным {x}",
  "Qabul qildim": "Принял",
  "kamomad bilan qabul qilindi": "принято с недостачей",
  "Topshiriladigan pul yo'q": "Нечего сдавать",
  "Kuryerlardan pul qabul qilganingizdan keyin u filiallar bo'yicha shu yerda ko'rinadi.":
    "После приёма денег от курьеров они появятся здесь по филиалам.",
  "{x} dan beri topshirilmagan": "не сдано с {x}",
  Taqsimlanmagan: "Нераспределённые",
  "davrda qabul qilindi {x} · topshirildi {x2}":
    "принято за период {x} · сдано {x2}",
  "davrda qabul qilindi {x}": "принято за период {x}",
  Filialsiz: "Без филиала",
  "· kamomad {x}": "· недостача {x}",
  "{x} topshirildi — filial qabul qiladi": "{x} сдано — филиал примет",
  "Filialga topshirish": "Сдача филиалу",
  "Pul bir nechta filialniki — qaysi filialga topshirayotganingizni tanlang":
    "Деньги нескольких филиалов — выберите, какому филиалу сдаёте",
  "Qoldiqdan farq {x} — filial qabul qilganda ko'radi.":
    "Разница с остатком {x} — филиал увидит при приёме.",
  "· qidiruv yuklanganlar ichida — pastdan yana yuklang":
    "· поиск среди загруженных — подгрузите ещё внизу",
  "Haqingiz = manzil soni × bitta umumiy narx; filial uni alohida to'laydi. «Topshirish kerak» — joriy qoldiq, davrga bog'liq emas.":
    "Вознаграждение = число адресов × единая цена; филиал платит его отдельно. «Нужно сдать» — текущий остаток, не зависит от периода.",
  "Topshirish kerak": "Нужно сдать",
  "Sana — logist yakunlagan kun; «Jarayonda» — kuryer yakunlagan, logist hali tasdiqlamagan":
    "Дата — день завершения логистом; «В процессе» — курьер завершил, логист ещё не подтвердил",
  "Skladingiz viloyatlari": "Области вашего склада",
  Skladingiz: "Ваш склад",
  "Sklad ma'lumoti backendda hali chiqmagan — viloyatlar profilingizdan":
    "Данные склада на бэкенде пока нет — области из вашего профиля",
  "Sklad qoldig'i hali ochilmagan": "Остаток склада пока не открыт",
  "Backend bosh kuryerga hozircha faqat kuryerlar omborini beradi.":
    "Бэкенд пока отдаёт старшему курьеру только склады курьеров.",
  "Qidiruvni o'zgartiring.": "Измените поиск.",
  "Kuryerlaringizda mol yo'q": "У ваших курьеров нет товара",
  "Kuryer skladdan mol olsa, u shu yerda ko'rinadi.":
    "Когда курьер возьмёт товар со склада, он появится здесь.",

  // ── V-javoblari ulanishi (2026-10-31) ───────────────────────────────────
  "· {x} · kutilgan {x}": "· {x} · ожидается {x}",
  "Kutilgandan farq {x}": "Разница с ожидаемым {x}",
  "Naqd hisobi — kunma-kun, e'lon qilinmagan kunlar ham":
    "Учёт наличных — по дням, включая незаявленные дни",
  "Kuryer naqdga yetkazgan zakazlar kunma-kun shu yerda ko'rinadi.":
    "Заказы, доставленные курьером за наличные, видны здесь по дням.",
  "Hammasini qabul qilish · {x}": "Принять всё · {x}",
  "e'lon qilingan": "заявлено",
  "zonada kuryer yo'q": "в зоне нет курьера",
  "zonada smenadagi kuryer yo'q": "в зоне нет курьера на смене",
  "kuryerlarda {x}": "у курьеров {x}",
  "«Kuryerda» — hozir qo'lidagi pul; «Topshirdi» — davrda sizga topshirgani":
    "«У курьера» — деньги на руках сейчас; «Сдал» — сдано вам за период",
  "Bu viloyat sizga biriktirilmagan — joyni faqat o'z viloyatingizga qo'sha olasiz":
    "Эта область вам не назначена — место можно добавить только в своей области",
  "Tarixni yuklashda xatolik": "Ошибка загрузки истории",

  // ── Dopusk, manzilni tuzatish, logistga qaytarish, formalar (2026-10-31) ──
  "Bu bo'lim sizga ochilmagan": "Этот раздел вам не открыт",
  "Dopuskni asosiy filialning bosh logisti beradi.": "Доступ выдаёт старший логист основного филиала.",
  "Pul qabul qilish va topshirish dopuski yo'q — kassani faqat ko'rasiz. Dopuskni bosh logist beradi.":
    "Нет доступа к приёму и сдаче денег — кассу вы только просматриваете. Доступ выдаёт старший логист.",
  "Bu amal backendda hali yo'q — backend kutilmoqda": "Этого действия на бэкенде пока нет — ждём бэкенд",
  "Tuman o'z viloyatlaringizdan bo'lishi kerak": "Район должен быть из ваших областей",
  "Manzilni tuzatish": "Исправить адрес",
  "Logistga qaytarish": "Вернуть логисту",
  "Manzil o'zgardi": "Адрес изменён",
  "Manzil o'zgardi · {x}": "Адрес изменён · {x}",
  "Logistga qaytarildi": "Возвращён логисту",
  "{x} — manzil tuzatildi": "{x} — адрес исправлен",
  "{x} — logistga qaytarildi": "{x} — возвращён логисту",
  "Manzilni saqlashda xatolik": "Ошибка сохранения адреса",
  "Logistga qaytarishda xatolik": "Ошибка возврата логисту",
  "· faqat o'z viloyatlaringiz ichida. Boshqa viloyat bo'lsa — logistga qaytaring.":
    "· только в пределах ваших областей. Если область другая — верните логисту.",
  "· zakaz sizdan va kuryerdan olinadi, logist qayta taqsimlaydi.":
    "· заказ снимается с вас и курьера, логист распределит заново.",
  "Tuman yoki shahar": "Район или город",
  "Tanlang": "Выберите",
  "Ko'cha, uy": "Улица, дом",
  "Mo'ljal": "Ориентир",
  "Ixtiyoriy — kuryerga yo'l ko'rsatadi": "Необязательно — подскажет курьеру дорогу",
  "Ixtiyoriy — logist ko'radi": "Необязательно — увидит логист",
  "«Boshqa sabab» uchun izoh majburiy": "Для «Другой причины» комментарий обязателен",
  "Sababni tanlang": "Выберите причину",
  "Mijoz xato aytgan": "Клиент назвал неверно",
  "Mijoz ko'chib o'tgan": "Клиент переехал",
  "Manzil boshqa viloyatda": "Адрес в другой области",
  "Manzil topilmadi": "Адрес не найден",
  "Mijoz javob bermayapti": "Клиент не отвечает",
  "Ism kamida 2 harf bo'lsin": "Имя — минимум 2 буквы",
  "Telefon 9 yoki 12 raqam bo'lsin": "Телефон — 9 или 12 цифр",
  "Zona nomi kamida 2 harf bo'lsin": "Название зоны — минимум 2 буквы",
  "Joy nomi kamida 2 harf bo'lsin": "Название места — минимум 2 буквы",
  "Sanalgan summani kiriting": "Введите пересчитанную сумму",
  "Summa noldan katta bo'lsin": "Сумма должна быть больше нуля",
};
