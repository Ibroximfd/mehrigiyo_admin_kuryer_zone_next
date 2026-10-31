/**
 * Marshrutlar — bosh kuryer saytining barcha manzillari bitta joyda.
 * Bo'limlar ildizda (alohida sayt, 2026-10-30); filtr va tanlov holati
 * so'rov parametrida (`nuqs`), alohida `[id]` sahifa yo'q — statik eksport.
 */
export const ROUTES = {
  login: "/login",
  home: "/",
  orders: "/",
  couriers: "/couriers",
  zones: "/zones",
  sklad: "/sklad",
  cash: "/cash",
  report: "/report",
} as const;
