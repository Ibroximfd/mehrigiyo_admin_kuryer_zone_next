/**
 * Xodimlar chatidagi xato kodlari — `STAFF_CHAT_FLUTTER.md` §1.3.
 *
 * Shoxlanish **kodga** qarab: matn o'zgarishi mumkin, kod — yo'q.
 */

import { errorCode, errorMessage } from "@/lib/api-client";
import { formatFileSize } from "@/lib/format";

import { staffSizeLimit } from "./types";

export const PEER_INACTIVE_TEXT = "Bu foydalanuvchi faol emas";

const HINTS: Record<string, string> = {
  file_too_large: "Fayl hajmi chegaradan katta",
  chat_member_forbidden: "Bu odamni qo'shishga yoki chiqarishga ruxsatingiz yo'q",
  chat_member_not_found: "Xodim topilmadi — ro'yxatni yangilang",
  chat_not_order: "Ishtirokchilar faqat zakaz chatida boshqariladi",
  channel_forbidden: "Bu zakaz chatida ishtirokchi emassiz — zakaz raqami bo'yicha qidirib qo'shiling",
  edit_window_closed:
    "Tahrir muddati tugagan — xabarni yuborilgandan keyin 15 daqiqa ichida tuzatish mumkin",
  message_not_found: "Xabar topilmadi — suhbat eskirgan",
  channel_not_found: "Kanal topilmadi",
  permission_denied: "Bu kanalga kirish huquqingiz yo'q",
  text_required: "Xabar bo'sh — matn yozing yoki fayl biriktiring",
  // Jamoa chati (`HUDUD_JAVOBLAR_4` §1).
  peer_inactive: PEER_INACTIVE_TEXT,
  delete_window_closed:
    "O'chirish muddati tugagan — o'z xabarini 24 soat ichida o'chirish mumkin",
};

/**
 * Lichkadagi suhbatdosh o'chirilgan/faol emas (`403 peer_inactive`):
 * arxiv o'qiladi, yozish maydoni esa shu matn bilan yopiladi.
 */
export function isPeerInactiveError(error: unknown): boolean {
  return errorCode(error) === "peer_inactive";
}

export function staffChatErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const code = errorCode(error);
  return (code && HINTS[code]) || errorMessage(error, fallback);
}

/**
 * Fayl chegaradan katta bo'lsa sababni yozadi — serverga yubormasdan.
 *
 * 50 MB videoni yuborib, keyin rad javobini kutish behuda vaqt va trafik.
 * `null` — fayl o'tadi.
 */
export function fileTooLargeReason(
  file: File | Blob,
  kind: string,
): string | null {
  const limit = staffSizeLimit(kind);
  if (file.size <= limit) return null;

  return `Fayl juda katta — ${formatFileSize(file.size)}. Bu tur uchun chegara: ${formatFileSize(limit)}.`;
}
