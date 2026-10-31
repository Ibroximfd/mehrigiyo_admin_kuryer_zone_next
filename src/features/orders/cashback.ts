import { parseDate } from "@/lib/format";
import { asInt, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Buyurtma keshbegi — `order.cashback` bloki (2026-10-01 C, §3).
 *
 * ⚠️ Bu YANGI ball keshbegi (sog'liq hamyoni, 1 ball = 100 so'm) — eski
 * so'mdagi referral keshbek (`payment_method: "cashback"`,
 * `cashback_used`) bilan hech qayerda qo'shilmaydi (§1.1). Logist uni
 * faqat o'qiydi: hisoblamaydi, foizni bilmaydi — server `points` ni
 * aytadi (§1.2, §3.4).
 *
 * `status`:
 *   `pending`   — yozilmagan, `points` hisoblangan VA'DA (yetkazilganda);
 *   `credited`  — yozilgan; `awaiting_account` bo'lsa hamyonga hali tushmagan;
 *   `reversed`  — bekor/razvrat, `reversed_points` qaytarib olingan
 *                 (`points` dan kichik bo'lishi NORMAL — qolgani kechirilgan);
 *   `cancelled` — hech qachon yozilmagan, `points` doim `0` — chizilmaydi.
 */
export type OrderCashbackStatus = "pending" | "credited" | "reversed" | "cancelled";

export type OrderCashback = {
  status: OrderCashbackStatus;
  /** Yagona ball miqdori — boshqa maydondan olinmaydi. */
  points: number;
  /**
   * Ballning pul ko'rinishi — server matni (`display.display`). `display`
   * OBYEKT (`{amount, currency, display, market}`), satr emas; bo'lmasa
   * (`Market` jadvali bo'sh) `null`.
   */
  displayText: string | null;
  creditedAt: Date | null;
  /** Faqat `credited` va `points > 0` da to'ladi; aks holda `null`. */
  expiresAt: Date | null;
  /** Ball yozilgan, lekin ilovasi yo'q mijoz raqamida kutib turibdi (§1.7). */
  awaitingAccount: boolean;
  /** Qaytarib olingan ball; yozuv bo'lmasa `0`. */
  reversedPoints: number;
};

const STATUSES: readonly OrderCashbackStatus[] = ["pending", "credited", "reversed", "cancelled"];

function isCashbackStatus(value: string): value is OrderCashbackStatus {
  return (STATUSES as readonly string[]).includes(value);
}

/** Price obyektining matni; satr yoki boshqa shakl kelsa — `null` (crash emas). */
function priceText(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  const text = asOptionalString(raw.display);
  return text && text.trim() ? text.trim() : null;
}

/**
 * Blok yo'q (kalit kelmagan — eski deploy yoki `status/` endpointi) yoki
 * notanish `status` — `null`: UI keshbek satrini chizmaydi, taxmin qilmaydi.
 */
export function mapOrderCashback(raw: unknown): OrderCashback | null {
  if (!isRecord(raw)) return null;
  const status = asString(raw.status).trim().toLowerCase();
  if (!isCashbackStatus(status)) return null;
  const json = asRecord(raw);
  return {
    status,
    points: Math.max(0, asInt(json.points)),
    displayText: priceText(json.display),
    creditedAt: parseDate(json.credited_at),
    expiresAt: parseDate(json.expires_at),
    awaitingAccount: json.awaiting_account === true,
    reversedPoints: Math.max(0, asInt(json.reversed_points)),
  };
}
