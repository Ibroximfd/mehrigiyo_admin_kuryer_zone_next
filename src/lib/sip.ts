/**
 * MicroSIP orqali qo'ng'iroq.
 *
 * Har bir operator kompyuterida MicroSIP (Windows softphone ilovasi)
 * o'rnatilgan. O'rnatilishda MicroSIP `sip:` protokolini o'ziga bog'laydi,
 * shuning uchun brauzer `sip:+998...` havolasini ochganda tizim uni
 * MicroSIP'ga uzatadi va raqam terila boshlaydi — server integratsiyasi
 * kerak emas.
 *
 * Eslatma: MicroSIP sozlamalarida "sip:" protokol assotsiatsiyasi yoqilgan
 * bo'lishi kerak (o'rnatishda sukut bo'yicha yoqiladi).
 */

/** Raqamni terish formatiga keltiradi: `+` va raqamlar, boshqasi tashlanadi. */
function normalize(phone: string): string {
  const trimmed = (phone ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/** Click-to-call havolasi. Raqam bo'sh bo'lsa `null`. */
export function sipCallUrl(phone: string): string | null {
  const normalized = normalize(phone);
  if (!normalized) return null;
  return `sip:${normalized}`;
}
