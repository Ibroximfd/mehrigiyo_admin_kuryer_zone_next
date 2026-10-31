/**
 * Demo rejim bayrog'i — `config/servers.mjs` (`DEFAULT_DEMO` / `APP_DEMO`)
 * dan `next.config.ts` orqali keladi. Yoqilganda `api-client` har so'rovni
 * brauzerdagi namuna bazaga (`./mock/router.ts`) beradi — tarmoqqa hech
 * narsa chiqmaydi. Testlarda o'zgaruvchi yo'q — haqiqiy rejim.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === "1";

export { DEMO_CREDENTIALS } from "./mock/credentials";
