import { parseDate } from "@/lib/format";
import { asArray, asOptionalInt, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Qo'shimcha manzil (2026-11-26): kuryer zakazga borgan, lekin mijoz telefonni
 * olmagan, chiqmagan yoki «boshqa kuni olaman» degan — zakaz holati
 * o'zgarmaydi, kuryerga o'sha kun uchun bitta manzil hisoblanadi. Logist izoh
 * bilan qo'shadi; bosh kuryer faqat ko'radi. Hisob (manzil soni, kuryer
 * xizmati) — SERVERDA.
 */
export type ExtraAddress = {
  id: number;
  /** Hisoblangan kun (`YYYY-MM-DD`, Toshkent). */
  date: string;
  courier: { id: number | null; fullName: string } | null;
  note: string;
  /** Qo'shgan logist. */
  byName: string;
  createdAt: Date | null;
};

function mapExtraAddress(raw: unknown): ExtraAddress | null {
  const json = asRecord(raw);
  const id = asOptionalInt(json.id);
  const date = asString(json.date);
  if (id === null || !date) return null;
  return {
    id,
    date,
    courier: isRecord(json.courier)
      ? { id: asOptionalInt(json.courier.id), fullName: asString(json.courier.full_name).trim() }
      : null,
    note: asString(json.note).trim(),
    byName: asString(asRecord(json.created_by).full_name ?? json.created_by_name).trim(),
    createdAt: parseDate(json.created_at),
  };
}

/**
 * Zakazdagi `extra_addresses`. Kalit yo'q (eski server) yoki bo'sh — bo'sh
 * ro'yxat: ekranda blok chizilmaydi. Kun bo'yicha, eskisi birinchi.
 */
export function mapExtraAddresses(raw: unknown): ExtraAddress[] {
  return asArray(raw)
    .map(mapExtraAddress)
    .filter((item): item is ExtraAddress => item !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** `2026-11-25` → `25.11.2026`. Noto'g'ri qiymat — o'z holicha. */
export function extraAddressDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}.${month}.${year}` : iso;
}
