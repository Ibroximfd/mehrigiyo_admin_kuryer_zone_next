/** Ilova manzillari — kodda yo'l satri faqat shu yerdan olinadi. */
export const ROUTES = {
  home: "/",
  login: "/login",
  zones: "/zones",
  districts: "/districts",
  couriers: "/couriers",
  settings: "/settings",
  interfilial: "/interfilial",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
