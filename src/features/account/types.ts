import { asInt, asOptionalString, asRecord, asString } from "@/lib/parse";

/**
 * Xodimning o'z login/paroli (`operator/me/credentials/`, hujjat 67 §4).
 * `password: null` — eski, ko'rsatib bo'lmaydigan parol: yangisini qo'yish kerak.
 */
export type MyCredentials = {
  id: number;
  fullName: string;
  username: string;
  password: string | null;
};

export function mapMyCredentials(raw: unknown): MyCredentials {
  const json = asRecord(raw);
  return {
    id: asInt(json.id),
    fullName: asString(json.full_name),
    username: asString(json.username),
    password: asOptionalString(json.password),
  };
}

export type MyCredentialsPatch = { username?: string; password?: string };

/** Faqat o'zgargan maydonlar yuboriladi; hech narsa o'zgarmagan bo'lsa `null`. */
export function credentialsPatch(current: MyCredentials, input: { username: string; password: string }): MyCredentialsPatch | null {
  const patch: MyCredentialsPatch = {};
  const username = input.username.trim();
  const password = input.password.trim();
  if (username && username !== current.username) patch.username = username;
  if (password) patch.password = password;
  return Object.keys(patch).length ? patch : null;
}
