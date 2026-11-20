import { fieldErrors } from "@/features/chief/order-action-rules";
import { ApiError, errorMessage } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { parseDate } from "@/lib/format";
import { asArray, asInt, asOptionalBool, asOptionalNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Kuryerdan pul olish (hujjat 85 §2) — `sales-sheet` javobidagi har kuryer va
 * `totals` dagi `cash` bloki. Hisob faqat serverda:
 * `due_total = sales − online − discount − fee + opening_debt` (sovg'a sotuvga kirmaydi:
 * `gift_in_sales: false`), onlayn va skidka — tizimdagi + bosh kuryer qo'lda yozgani,
 * `closing_debt = due_total − received`; kam olingan pul ertaga `opening_debt`
 * bo'lib o'tadi. Frontend qo'shmaydi va ayirmaydi — kelmagan maydon ekranda «—».
 */

/** «Oldim» yozuvi — bir kunda bir nechta bo'lishi mumkin, serverda yig'iladi. */
export type CashReceipt = {
  id: number;
  amount: number | null;
  at: Date | null;
  /** Kim yozgan (bosh kuryer). */
  byName: string | null;
  note: string;
  /** Server aytsa (`can_delete`) — o'sha; aytmasa `null`, qoida «faqat o'sha kuni» (`cash-view`). */
  canDelete: boolean | null;
};

/**
 * Hamma pul maydoni `number | null`: server bermagan maydon ekranda «—» —
 * hech qachon o'ylab topilgan `0` emas (egasi, 2026-11-18: bu haqiqiy pul).
 */
export type CourierCash = {
  /** Umumiy sotuv — sovg'a qatorlari ham katalog narxida (shuning uchun sovg'a ayiriladi). */
  salesAmount: number | null;
  /** Onlayn jami: tizimdagi (ilovada oldindan) + bosh kuryer qo'lda yozgan Click. */
  onlineAmount: number | null;
  /** Tizim bilgan onlayn to'lov; server ajratmasa `null`. */
  onlineSystem: number | null;
  /**
   * Bosh kuryer qo'lda yozgan Click/onlayn (egasi, 2026-11-20; hujjat 101 §1) —
   * maydonda tahrirlanadigan qiymat. Server `online_manual` bermaguncha `null`:
   * maydon chiqmaydi, tizim summasi o'qish uchun ko'rinadi.
   */
  onlineManual: number | null;
  /** Skidka jami: tizimdagi (ball) + bosh kuryer yozgani. */
  discountAmount: number | null;
  /** Tizimdagi chegirma; server ajratmasa `null`. */
  discountSystem: number | null;
  /**
   * Bosh kuryer yozgan skidka — maydonda tahrirlanadigan qiymat. Server ajratmasa
   * (`discount_system` ham yo'q) butun skidka shu; tizim qismi bor-u qo'lda yozilgani
   * kelmasa — noma'lum (`null`), maydon chiqmaydi: noto'g'ri son tahrirga qo'yilmasin.
   */
  discountManual: number | null;
  giftAmount: number | null;
  /** Kuryer xizmati (hujjat 83 §3) — bosh kuryer yozgani. */
  feeAmount: number | null;
  /** O'tgan kunlardan qolgan qarz; oraliqda — davr boshidagi. */
  openingDebt: number | null;
  /** Olinishi kerak. */
  dueTotal: number | null;
  received: number | null;
  /** Qarz (ertaga o'tadi). */
  closingDebt: number | null;
  receipts: CashReceipt[];
  /**
   * Pul zanjiri shu kundan (javob 104 §5: toza boshlash 21.11). Undan oldingi
   * kunga Click, skidka va «Oldim» yozilmaydi (server `400`). Server odatda
   * faqat `totals.cash` da beradi; yo'q — `null`.
   */
  since: string | null;
};

function mapReceipt(raw: unknown): CashReceipt | null {
  const json = asRecord(raw);
  const id = asInt(json.id, -1);
  if (id < 0) return null;
  return {
    id,
    amount: asOptionalNumber(json.amount),
    at: parseDate(json.at ?? json.created_at),
    byName: asOptionalString(asRecord(json.by).full_name),
    note: asString(json.note),
    canDelete: asOptionalBool(json.can_delete),
  };
}

export function mapCourierCash(raw: unknown): CourierCash {
  const json = asRecord(raw);
  const discountAmount = asOptionalNumber(json.discount_amount);
  const discountSystem = asOptionalNumber(json.discount_system);
  return {
    salesAmount: asOptionalNumber(json.sales_amount),
    onlineAmount: asOptionalNumber(json.online_amount),
    onlineSystem: asOptionalNumber(json.online_system),
    onlineManual: asOptionalNumber(json.online_manual),
    discountAmount,
    discountSystem,
    discountManual: asOptionalNumber(json.discount_manual) ?? (discountSystem === null ? discountAmount : null),
    giftAmount: asOptionalNumber(json.gift_amount),
    feeAmount: asOptionalNumber(json.fee_amount),
    openingDebt: asOptionalNumber(json.opening_debt),
    dueTotal: asOptionalNumber(json.due_total),
    received: asOptionalNumber(json.received),
    closingDebt: asOptionalNumber(json.closing_debt),
    receipts: asArray(json.receipts)
      .map(mapReceipt)
      .filter((receipt): receipt is CashReceipt => receipt !== null),
    since: asOptionalString(json.since),
  };
}

/** Blok yo'q (server hali chiqarmagan) — `null`: pul kataklari «—», jadval yiqilmaydi. */
export function mapOptionalCash(raw: unknown): CourierCash | null {
  return isRecord(raw) ? mapCourierCash(raw) : null;
}

/**
 * Skidka, «Oldim» va bekor qilish xatosi — maydon ostida yoki oynada: `400` da
 * serverning maydon matni, `404` da sabab, `403` da `forbidden` (amalga qarab
 * farq qiladi); qolgani umumiy matn (`fallback`).
 */
export function cashErrorText(error: unknown, texts: { fallback: string; forbidden: string }): string {
  if (error instanceof ApiError) {
    const fields = fieldErrors(error.data, ["amount", "date", "courier_id", "note"] as const);
    const field = fields.amount ?? fields.date ?? fields.courier_id ?? fields.note;
    if (field) return field;
    if (isEndpointMissing(error)) return "Bu amal serverda hali yoqilmagan";
    if (error.code === "courier_not_found") return "Kuryer topilmadi — jadvalni yangilang";
    if (error.status === 404) return "Yozuv topilmadi — jadvalni yangilang";
    if (error.status === 403) return texts.forbidden;
  }
  return errorMessage(error, texts.fallback);
}
