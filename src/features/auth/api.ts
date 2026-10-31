import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapLoginResponse } from "./types";
import type { LoginResult } from "./types";

/** Bosh kuryer sayti (`TUZILMA_V2` §7.2). */
const LOGIN_SITE = "chief";

/**
 * Kirish — bitta `/operator/login/` (CRM va logist bilan umumiy) va
 * `site: "chief"`. Akkaunt turi mos kelmasa server token bermaydi
 * (`403 wrong_site` + `account_kind`); ko'p urinishda — `429 too_many_attempts`
 * + `retry_after` (soniya). Eski support login (telefon) bu saytga yo'q:
 * bosh kuryer — operator akkaunti, ortiqcha urinish qulfni tezlashtiradi.
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  const raw = await api.post<unknown>(ENDPOINTS.operatorLogin, {
    json: { username, password, site: LOGIN_SITE },
    fallbackError: "Login yoki parol xato",
  });
  return mapLoginResponse(raw);
}
