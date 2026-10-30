/**
 * Yetkazish manzili tuzilmasi — CRM (`mehrigiyo_crm_next`,
 * `features/orders/delivery-address.ts`) bilan bir xil, 2026-10-17:
 *
 *   Viloyat → Tuman/shahar → Qishloq/mahalla → Ko'cha, uy, mo'ljal.
 *
 * Backendga uch xil narsa ketadi (`HUDUD_BACKEND_TALABLAR_3` §1,
 * `HUDUD_BACKEND_JAVOBLAR` №29–31):
 *   • `region` va `district` — tanlangan tuman KODI (`fargona/qoqon_sh`).
 *     Kod faqat ro'yxatdan tanlanganda ketadi; noma'lum kod — `400`;
 *   • `locality` — qishloq/mahalla, alohida maydon (trim, bo'sh — `null`);
 *   • `address_text` — bitta matn:
 *
 *       [qo'lda yozilgan tuman nomi], [ko'cha, uy, mo'ljal]
 *
 *     Ro'yxatdan tanlangan tuman nomi va mahalla matnga QO'SHILMAYDI —
 *     ular `district` va `locality` da, nomlarni server o'zi beradi.
 *     Qo'lda tuman uchun alohida maydon yo'q — shuning uchun u matnda.
 *     Ko'cha matni qism bilan allaqachon boshlansa (tahrirda eski matn
 *     qaytib keladi) — qism qayta qo'shilmaydi.
 */
export type DeliveryAddressFields = {
  region: string;
  /** Tanlangan tuman kodi; `""` — tanlanmagan yoki qo'lda yozilgan. */
  district: string;
  /** "Ro'yxatda yo'q — qo'lda yozaman". */
  districtManual: boolean;
  districtManualName: string;
  /** Qishloq / mahalla — ixtiyoriy. */
  locality: string;
  /** Ko'cha, uy, mo'ljal. */
  addressText: string;
};

/** `400 {district: [...]}` — nofaol/noma'lum yoki viloyatga mos kelmagan kod. */
export const DISTRICT_REPICK_MESSAGE =
  "Tuman topilmadi yoki faol emas — tumanni qayta tanlang";

/** Ko'cha matni shu qism bilan boshlanadimi (katta-kichik harf farqsiz). */
export function startsWithPart(text: string, part: string): boolean {
  return text.toLocaleLowerCase("uz").startsWith(part.toLocaleLowerCase("uz"));
}

/** Ko'cha matnida shu qism allaqachon bormi — ko'rsatishda takrorlanmasin. */
export function containsPart(text: string, part: string): boolean {
  return text.toLocaleLowerCase("uz").includes(part.toLocaleLowerCase("uz"));
}

/** Qo'lda yozilgan tuman nomi — faqat qo'lda rejimda, trim qilingan. */
export function manualDistrictName(
  fields: Pick<DeliveryAddressFields, "districtManual" | "districtManualName">,
): string {
  return fields.districtManual ? fields.districtManualName.trim() : "";
}

/** `address_text` matni (yuqoridagi qoida). */
export function composeDeliveryAddress(
  fields: Pick<DeliveryAddressFields, "districtManual" | "districtManualName" | "addressText">,
): string {
  const street = fields.addressText.trim();
  const manual = manualDistrictName(fields);
  const prefix = manual && !startsWithPart(street, manual) ? [manual] : [];
  return [...prefix, street].filter(Boolean).join(", ");
}

/** `district` kodi — faqat ro'yxatdan tanlanganda; aks holda `null`. */
export function districtPayload(
  fields: Pick<DeliveryAddressFields, "district" | "districtManual">,
): string | null {
  if (fields.districtManual) return null;
  return fields.district.trim() || null;
}
