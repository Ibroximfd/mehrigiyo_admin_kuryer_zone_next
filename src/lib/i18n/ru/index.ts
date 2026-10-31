import type { Dictionary } from "../matcher";

import { COMMON } from "./common";
import { COURIER_APP } from "./courier-app";
import { COURIERS } from "./couriers";
import { ORDERS } from "./orders";
import { PANEL } from "./panel";
import { CHIEF } from "./chief";
import { ZONES } from "./zones";

/**
 * Rus lug'ati — bo'limlar bo'yicha bo'lingan. Bir xil kalit ikki joyda
 * bo'lsa, keyingisi ustun (aniqroq bo'lim — oxirida).
 */
export const RU_DICTIONARY: Dictionary = {
  ...COMMON,
  ...PANEL,
  ...ORDERS,
  ...COURIERS,
  ...COURIER_APP,
  ...ZONES,
  ...CHIEF,
};
