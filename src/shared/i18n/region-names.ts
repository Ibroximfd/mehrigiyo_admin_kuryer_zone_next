import type { Locale } from "./locale";

/**
 * Viloyat nomlari: backend `name` ni faqat o'zbekcha beradi (backend #1),
 * `region` kodi esa barqaror. `uz` da server nomi qoladi; `ru` uchun 14 ta
 * nom shu yerda, kod bo'yicha. Noma'lum kod — server nomi (yangi viloyat
 * qo'shilsa ilova yiqilmaydi).
 */
const RU_REGION_NAMES: Readonly<Record<string, string>> = {
  toshkent_shahar: "г. Ташкент",
  toshkent: "Ташкентская область",
  andijon: "Андижанская область",
  buxoro: "Бухарская область",
  fargona: "Ферганская область",
  jizzax: "Джизакская область",
  xorazm: "Хорезмская область",
  namangan: "Наманганская область",
  navoiy: "Навоийская область",
  qashqadaryo: "Кашкадарьинская область",
  samarqand: "Самаркандская область",
  sirdaryo: "Сырдарьинская область",
  surxondaryo: "Сурхандарьинская область",
  qoraqalpogiston: "Республика Каракалпакстан",
};

const REGION_NAMES: Partial<Record<Locale, Readonly<Record<string, string>>>> = { ru: RU_REGION_NAMES };

export function regionDisplayName(code: string, serverName: string, locale: Locale): string {
  return REGION_NAMES[locale]?.[code] ?? serverName;
}
