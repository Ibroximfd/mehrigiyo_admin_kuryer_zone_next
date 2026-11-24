import type { Dictionary } from "../matcher";

/**
 * Sklad himoyasi (backend hujjati 125, 2026-11-24): juft tuzatish (§A),
 * yetkazilgan zakazga kuryerni keyin biriktirish (C §2) va Sotuv jadvalidagi
 * «Kuryersiz (bosh kuryer)» qatori (C §4).
 */
export const SKLAD_125: Dictionary = {
  // ── §A. Kuryer tuzatishi ombor bilan juft ───────────────────────────────
  "Kuryerga qo'shilgan mol ombordan ayiriladi, kamaygani omborga qaytadi. Sklad jamisi o'zgarmaydi.":
    "Добавленный курьеру товар списывается со склада, уменьшенный — возвращается на склад. Итог по складу не меняется.",
  "Ombordan chiqadi:": "Со склада уйдёт:",
  "Omborga qaytadi:": "На склад вернётся:",
  "Ombordan chiqdi:": "Со склада ушло:",
  "Omborga qaytdi:": "На склад вернулось:",
  "Topilmani faqat logist yozadi": "Находку оформляет только логист",
  "Sklad jamisi o'zgardi — kuryerning ombori topilmadi": "Итог по складу изменился — склад курьера не найден",
  "Bosh logistga xabar bering.": "Сообщите главному логисту.",

  // ── C §2. Yetkazilgan zakazga kuryerni keyin biriktirish ────────────────
  "Kuryerni biriktirish": "Назначить курьера",
  Biriktirish: "Назначить",
  "Zakazni kim yetkazganini yozish": "Указать, кто доставил заказ",
  "— yetkazilgan zakaz. Kim yetkazganini tanlang.": "— доставленный заказ. Выберите, кто его доставил.",
  "Sotuv ombordan shu kuryerga, pul uning qatoriga o'tadi. Zakaz sanasi o'zgarmaydi. Keyin kuryerni faqat logist o'zgartira oladi.":
    "Продажа перейдёт со склада на этого курьера, деньги — в его строку. Дата заказа не изменится. После этого курьера сможет изменить только логист.",
  "Sotuv va pul shu kuryer qatoriga o'tdi": "Продажа и деньги перешли в строку этого курьера",
  "Kuryerni biriktirishda xatolik": "Ошибка при назначении курьера",
  "Faol kuryer yo'q": "Нет активных курьеров",
  "Avval «Kuryerlar» bo'limida kuryer qo'shing yoki blokdan chiqaring.":
    "Сначала добавьте курьера в разделе «Курьеры» или разблокируйте его.",
  "Kuryerlarni yuklashda xatolik": "Ошибка загрузки курьеров",
  "Kuryersiz — bosh kuryerning o'zida": "Без курьера — у самого главного курьера",
  "Zakaz sizning o'rningizda yopilgan — sotuv omboringizdan ayirilgan. Kuryer yetkazgan bo'lsa, o'sha kuryerni biriktiring; o'zingiz yetkazgan bo'lsangiz, o'zgartirish kerak emas.":
    "Заказ закрыт на вашем месте — продажа списана с вашего склада. Если доставил курьер — назначьте его; если доставили вы сами — ничего менять не нужно.",
  "Kuryerni faqat logist o'zgartira oladi": "Курьера может изменить только логист",
  "Kuryerni almashtirish uchun sabab kerak — bu zakazni logist o'zgartiradi":
    "Для замены курьера нужна причина — этот заказ изменяет логист",
  "Kuryer topilmadi — ro'yxatni yangilang": "Курьер не найден — обновите список",
  "Bu kuryer sizning jamoangizda emas": "Этот курьер не из вашей команды",
  "Kuryer bloklangan — faol kuryerni tanlang": "Курьер заблокирован — выберите активного",
  "Kuryer yetkazilgandan keyin biriktirildi": "Курьер назначен после доставки",

  // ── C §4. Sotuv jadvali: «Kuryersiz (bosh kuryer)» ──────────────────────
  "Kuryersiz (bosh kuryer)": "Без курьера (главный курьер)",
  "sotuv omboringizdan ayirilgan": "продажа списана с вашего склада",
  Zakazlari: "Заказы",
  "kuryer emas": "не курьер",
  "pul sizda": "деньги у вас",
  "Bu zakazlar sizning o'rningizda yopilgan — sotuvi omboringizdan ayirilgan. Kuryer yetkazgan bo'lsa, o'sha kuryerni biriktiring: sotuv va pul uning qatoriga o'tadi, sana o'zgarmaydi. O'zingiz yetkazgan bo'lsangiz, o'zgartirish kerak emas.":
    "Эти заказы закрыты на вашем месте — продажа списана с вашего склада. Если доставил курьер — назначьте его: продажа и деньги перейдут в его строку, дата не изменится. Если доставили вы сами — ничего менять не нужно.",
  "Sizning o'rningizda yopilgan": "Закрыт на вашем месте",
  "{x}: kuryerni biriktirish": "{x}: назначить курьера",
  "Kuryer qatoriga o'tkazish": "Перенести в строку курьера",
  "{x}: kuryer qatoriga o'tkazish": "{x}: перенести в строку курьера",
  "Ro'yxatda {x} ta, jami {x} ta zakaz": "В списке: {x}, всего заказов: {x}",
  "#{x} — sotuv kuryer qatoriga o'tdi": "#{x} — продажа перенесена в строку курьера",
  "Sotuvni kuryer qatoriga o'tkazib bo'lmadi": "Не удалось перенести продажу в строку курьера",
};
