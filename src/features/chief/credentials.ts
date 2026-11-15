import { asBool, asInt, asOptionalString, asRecord, asString } from "@/lib/parse";

/**
 * Kuryerning ilovaga kirish ma'lumoti (hujjat 67 §1).
 *
 * `password: null` — 2026-10-26 dan oldin qo'yilib, o'zgarmagan parol (bazada
 * ko'rsatib bo'lmaydigan shaklda) yoki akkaunt yo'q. Yechim — yangi parol qo'yish.
 */
export type CourierCredentials = {
  id: number;
  fullName: string;
  login: string;
  password: string | null;
  hasAccount: boolean;
};

export function mapCourierCredentials(raw: unknown): CourierCredentials {
  const json = asRecord(raw);
  return {
    id: asInt(json.id),
    fullName: asString(json.full_name),
    login: asString(json.login ?? json.phone),
    password: asOptionalString(json.password),
    hasAccount: asBool(json.has_account),
  };
}

/** `set-password/` javobi (§2) — `{id, phone, password, has_account, device}`. */
export function mapSetPasswordResult(raw: unknown, previous: CourierCredentials): CourierCredentials {
  const json = asRecord(raw);
  return {
    ...previous,
    login: asOptionalString(json.phone) ?? previous.login,
    password: asOptionalString(json.password),
    hasAccount: asBool(json.has_account, true),
  };
}
