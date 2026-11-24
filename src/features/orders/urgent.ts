import { parseDate } from "@/lib/format";
import { asBool, asInt, asOptionalInt, asString, isRecord } from "@/lib/parse";

/**
 * Shoshilinch zakaz belgisi (hujjat 123 §2). Bu status emas — zakaz ustidagi
 * alohida belgi: logist qo'yadi, bosh kuryer «Qabul qildim» bilan tasdiqlaydi.
 * Pul, sklad va 5 ta status o'zgarmaydi.
 */
export type UrgentPerson = { id: number | null; fullName: string };

export type OrderUrgent = {
  /**
   * Server hisoblaydi: zakaz ochiq va kuryer hali yakunlamagan. Yopilgan zakazda
   * belgi tarix uchun qoladi (`false`) — ogohlantirish yo'q. Sayt o'zi hisoblamaydi.
   */
  isActive: boolean;
  setAt: Date | null;
  /** Belgini qo'ygan logist. */
  setBy: UrgentPerson | null;
  reason: string;
  /** Bosh kuryer «Qabul qildim» bosgan payt; bosmagan — `null`. */
  ackedAt: Date | null;
  ackedBy: UrgentPerson | null;
  /** Tasdiqlanmagani uchun server yuborgan takror ogohlantirishlar (§6.2). */
  reminders: number;
};

function mapPerson(raw: unknown): UrgentPerson | null {
  if (!isRecord(raw)) return null;
  const fullName = asString(raw.full_name ?? raw.name).trim();
  const id = asOptionalInt(raw.id);
  return fullName || id !== null ? { id, fullName } : null;
}

/** `null` — zakaz shoshilinch emas (yoki belgi olib tashlangan). */
export function mapOrderUrgent(raw: unknown): OrderUrgent | null {
  if (!isRecord(raw)) return null;
  return {
    isActive: asBool(raw.is_active),
    setAt: parseDate(raw.set_at),
    setBy: mapPerson(raw.set_by),
    reason: asString(raw.reason).trim(),
    ackedAt: parseDate(raw.acked_at),
    ackedBy: mapPerson(raw.acked_by),
    reminders: asInt(raw.reminders),
  };
}

/**
 * Server funksiyani biladimi (§2, §11): reliz chiqqach kalit HAR zakazda keladi
 * (`"urgent": null` ham). Kalit umuman yo'q — eski server.
 */
export function hasUrgentKey(json: Record<string, unknown>): boolean {
  return "urgent" in json;
}
