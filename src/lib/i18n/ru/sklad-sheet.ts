import type { Dictionary } from "../matcher";

/**
 * Sklad jadvali (hujjat 85 §1) — bosh kuryerning kunlik va davr jadvali,
 * «Hozirgi qoldiq». Atamalar «Sotuv jadvali» bilan bir xil («Курьерская
 * услуга», «Отказ на месте»); kun boshi/oxiri — «остаток на начало/конец дня».
 */
export const SKLAD_SHEET: Dictionary = {
  // ── Ko'rinishlar ────────────────────────────────────────────────────────
  "Ko'rinish": "Вид",
  Kunlik: "За день",
  "Sanadan sanagacha": "С даты по дату",
  "{n} ta kirim so'rovi kutilmoqda": "ожидает заявок на выдачу: {n}",

  // ── Hozirgi qoldiq ──────────────────────────────────────────────────────
  "Hozirgi qoldiq": "Текущий остаток",
  "Sariq — minimaldan kam · qizil — tugagan yoki minus": "Жёлтый — меньше минимума · красный — закончился или в минусе",
  Qayerda: "Где",
  Omborda: "На складе",

  // ── Kunlik ──────────────────────────────────────────────────────────────
  "{x} — kunlik harakat": "{x} — движение за день",
  "Kun boshi + korxonadan − sotuv − sovg'a − korxonaga − chiqim ± tuzatish = kun oxiri":
    "Начало дня + от компании − продажа − подарок − в компанию − списание ± корректировка = конец дня",
  "Kunlik harakat": "Движение за день",
  Hudud: "Регион",
  "Kun boshiga qoldiq": "Остаток на начало дня",
  "+ Korxonadan keldi": "+ Пришло от компании",
  "JAMI · sotuv": "ИТОГО · продажа",
  "JAMI · sovg'a": "ИТОГО · подарок",
  "− Korxonaga qaytdi": "− Возвращено в компанию",
  "− Chiqim (spisaniye)": "− Списание",
  Chiqim: "Списание",
  "— yaroqsiz yoki yo'qolgan mol hisobdan chiqarilgani (faqat bo'lsa)": "— негодный или утерянный товар, списанный с учёта (только если есть)",
  Tuzatish: "Корректировка",
  "{x} kun boshiga qoldiq": "Остаток на начало дня {x}",
  sotuv: "продажа",
  "sovg'a": "подарок",
  Kuryersiz: "Без курьера",
  "Bu kunda yetkazilgan zakaz yo'q": "В этот день доставленных заказов нет",
  "Bu kunda skladda mol bo'lmagan": "В этот день на складе не было товара",
  "Kun boshida ham, kun davomida ham harakat yo'q. Boshqa kunni tanlang.":
    "Ни остатка на начало дня, ни движения за день. Выберите другой день.",
  "Bu kunda tuzatish bor": "В этот день есть корректировка",
  "Kun oxiri shu harakat bilan yopiladi — jadvaldagi «Tuzatish» qatoriga qarang.":
    "Конец дня сходится с учётом этого движения — смотрите строку «Корректировка» в таблице.",
  "Kun boshiga / kun oxiriga qoldiq": "Остаток на начало / конец дня",
  "— ombor + kuryerlar qo'lida, hammasi bir son": "— склад + на руках у курьеров, одним числом",
  Sotuv: "Продажа",
  "— kuryer ilovada «yetkazdim» qilganda o'zi yoziladi": "— записывается само, когда курьер отмечает «доставил» в приложении",
  "Korxonadan keldi / korxonaga qaytdi": "Пришло от компании / возвращено в компанию",
  "— sklad kirim va qaytarishlaridan": "— из приходов и возвратов склада",
  "Donalab sotiladigan mahsulot — faqat donada": "Товар, продаваемый поштучно, — только в штуках",

  // ── Sanadan sanagacha ───────────────────────────────────────────────────
  "Shu hafta": "Эта неделя",
  "Shu oy": "Этот месяц",
  "Kunlik savdo mahsulotlari": "Продажи товаров по дням",
  "Kunlik savdo": "Продажи по дням",
  "Umumiy summa": "Общая сумма",
  "Borib atkaz": "Отказ на месте",
  "Kuryer xizmat narxi": "Цена курьерской услуги",
  "Kuryer xizmati jami": "Курьерская услуга, итого",
  Itogo: "Итого",
  "Server davr jamisini hali bermaydi": "Сервер пока не даёт итог за период",
  "Bu hududda sotuv yo'q": "В этом регионе продаж нет",
  "Tanlangan davrda shu hududga yetkazilgan zakaz yo'q.": "За выбранный период в этот регион заказов не доставляли.",
  "Hamma hududlar": "Все регионы",
  "Kuryerlar yetkazgan zakaz yo'q. Boshqa sanalarni tanlang.": "Доставленных курьерами заказов нет. Выберите другие даты.",
  "Sana bosilsa — o'sha kunning to'liq kunlik jadvali ochiladi": "Нажмите на дату — откроется полная таблица этого дня",
  "Kuryer xizmat narxi — viloyat narxi; jami — bosh kuryer «Sotuv jadvali»da yozgani":
    "Цена курьерской услуги — тариф региона; итого — то, что старший курьер вписал в «Таблице продаж»",

  // ── Holatlar ────────────────────────────────────────────────────────────
  "Sklad jadvalini yuklashda xatolik": "Ошибка загрузки таблицы склада",
  "Sklad jadvali sizga ochilmagan": "Таблица склада вам не открыта",
  "Sklad jadvali — server hali chiqarmagan": "Таблица склада — сервер ещё не выпустил",

  // ── Kunlik harakat = hozirgi qoldiq (egasi, 2026-11-20; 97 §3) ──────────
  "Kun oxiri hozirgi qoldiqdan farq qiladi — bosh logistga ayting": "Остаток на конец дня отличается от текущего — сообщите главному логисту",
  ": kun oxiri {x}, hozir {x}": ": на конец дня {x}, сейчас {x}",
  "Logist tasdiqlamagan": "Не подтверждено логистом",
  "— kuryer «yetkazdim» bosgan, logist hali tasdiqlamagan (faqat bo'lsa); hozirgi qoldiqdan allaqachon ayirilgan":
    "— курьер нажал «доставил», логист ещё не подтвердил (только если есть); уже вычтено из текущего остатка",
  "Hozirgi qoldiq (tasdiqlanmagani ayirilgan)": "Текущий остаток (неподтверждённое вычтено)",
  "Logist tasdiqlamagan · sotuv": "Не подтверждено логистом · продажа",
  "Logist tasdiqlamagan · sovg'a": "Не подтверждено логистом · подарок",
  "Shundan logist tasdiqlamagan · sotuv": "Из них не подтверждено логистом · продажа",
  "Shundan logist tasdiqlamagan · sovg'a": "Из них не подтверждено логистом · подарок",
};
