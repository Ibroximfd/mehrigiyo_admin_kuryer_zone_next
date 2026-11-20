/**
 * Bugungi jadvallar (Sotuv jadvali, berish rejasi, sklad) shu oraliqda o'zi
 * yangilanadi (egasi, 2026-11-20: bog'langan joylar real vaqtda bir xil).
 * Sklad soketi hodisa bersa — darhol (`useSkladLive`); bu — hodisa kelmasa ham
 * ma'lumot eskirmasin degan zaxira. Yashirin tabda so'ralmaydi (TanStack sukuti).
 */
export const LIVE_REFETCH_MS = 30_000;
