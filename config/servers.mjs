/**
 * Backend serverlari — butun loyiha uchun yagona manba.
 *
 * Host dev-proxy (`scripts/dev.mjs`) va `next.config.ts` orqali brauzer
 * kodiga yetib boradi. Oddiy `.mjs` — uni ham Node skriptlari, ham Next o'qiydi.
 */

export const SERVERS = {
  test: { host: "imorganic.uz", label: "Test" },
  prod: { host: "my.imorganic.uz", label: "Production" },
};

/**
 * Sukut — test server (admin API hozircha faqat shu yerda).
 * Vaqtincha almashtirish: `APP_SERVER=prod npm run dev`.
 */
export const DEFAULT_SERVER = "prod";

/** Nomi bo'yicha serverni beradi; noto'g'ri nom jimgina o'tib ketmaydi. */
export function resolveServer(name = process.env.APP_SERVER || DEFAULT_SERVER) {
  const server = SERVERS[name];

  if (!server) {
    const known = Object.keys(SERVERS).join(", ");
    throw new Error(`Noma'lum server: "${name}". Mavjudlari: ${known}.`);
  }

  return { name, ...server };
}
