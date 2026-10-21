/**
 * Brauzer kodiga kerakli muhit qiymatlari — bitta joyda.
 *
 * Har ikkala rejimda nisbiy `/api` ishlatiladi: development'da dev-proxy,
 * production'da nginx uzatadi — CORS muammosi chiqmaydi.
 */
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  /** `"test"` | `"prod"` — sarlavhada "Test server" belgisi uchun. */
  serverName: process.env.NEXT_PUBLIC_SERVER ?? "prod",
} as const;

export const isTestServer = env.serverName === "test";
