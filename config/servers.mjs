/**
 * Backend serverlari — butun loyiha uchun yagona manba.
 *
 * Bu yerdagi host quyidagilarning hammasini boshqaradi:
 *   • dev-proxy (`scripts/dev.mjs`) — `/api`, `/media`, `/ws` qayerga ketadi;
 *   • nginx konfiguratsiyasi (`nginx.conf`, shablondan generatsiya qilinadi);
 *   • brauzer kodidagi zaxira host (`src/lib/api-constants.ts`).
 *
 * Oddiy `.mjs` — chunki uni ham Node skriptlari, ham `next.config.ts` o'qiydi.
 */

export const SERVERS = {
  test: { host: "imorganic.uz", label: "Test" },
  prod: { host: "my.imorganic.uz", label: "Production" },
};

/**
 * ⬇︎ SERVERNI ALMASHTIRISH UCHUN FAQAT SHU QATORNI O'ZGARTIRING.
 *
 * Vaqtincha almashtirish uchun esa `APP_SERVER` yetarli, faylga tegmasdan:
 *   APP_SERVER=test npm run dev
 *   APP_SERVER=test npm run build
 */
export const DEFAULT_SERVER = "prod";

/**
 * ⬇︎ DEMO REJIM. `true` — sayt backendga umuman chiqmaydi: har so'rovga
 * brauzerdagi namuna baza (`src/lib/demo/mock/`) javob beradi. Kirish —
 * demo telefon va parol (login sahifasida ko'rinadi). Sahifa yangilansa
 * namuna boshlang'ich holatiga qaytadi.
 *
 * Sukut — haqiqiy backend (v2 tayyor, 2026-10-31). Demo vaqtincha, faylga
 * tegmasdan:
 *   APP_DEMO=1 npm run dev
 */
export const DEFAULT_DEMO = false;

/** `APP_DEMO=1` / `APP_DEMO=0` fayldagi qiymatdan ustun turadi. */
export function isDemoMode(value = process.env.APP_DEMO) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return DEFAULT_DEMO;
}

/** Nomi bo'yicha serverni beradi; noto'g'ri nom jimgina o'tib ketmaydi. */
export function resolveServer(name = process.env.APP_SERVER || DEFAULT_SERVER) {
  const server = SERVERS[name];

  if (!server) {
    const known = Object.keys(SERVERS).join(", ");
    throw new Error(`Noma'lum server: "${name}". Mavjudlari: ${known}.`);
  }

  return { name, ...server };
}
