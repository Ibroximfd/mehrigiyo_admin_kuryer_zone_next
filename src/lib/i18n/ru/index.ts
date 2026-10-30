import type { Dictionary } from "../matcher";

import { COMMON } from "./common";
import { COURIER_APP } from "./courier-app";
import { COURIERS } from "./couriers";
import { ORDERS } from "./orders";
import { PANEL } from "./panel";
import { PIPELINE } from "./pipeline";
import { AI } from "./ai";
import { CHIEF } from "./chief";
import { LOGISTS } from "./logists";
import { ANALITIKA } from "./analitika";
import { MOLIYA } from "./moliya";
import { SKLAD } from "./sklad";
import { STAFF_CHAT } from "./staff-chat";
import { TRANSFERS } from "./transfers";
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
  ...TRANSFERS,
  ...STAFF_CHAT,
  ...ZONES,
  ...PIPELINE,
  ...SKLAD,
  ...MOLIYA,
  ...ANALITIKA,
  ...AI,
  ...CHIEF,
  ...LOGISTS,
};
