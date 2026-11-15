import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapMyCredentials } from "./types";
import type { MyCredentials, MyCredentialsPatch } from "./types";

export async function fetchMyCredentials(signal?: AbortSignal): Promise<MyCredentials> {
  return mapMyCredentials(await api.get<unknown>(ENDPOINTS.myCredentials, { signal }));
}

/** O'z login/parolini o'zgartiradi — sessiya saqlanadi, saytdan chiqarilmaydi. */
export async function updateMyCredentials(patch: MyCredentialsPatch): Promise<MyCredentials> {
  return mapMyCredentials(
    await api.patch<unknown>(ENDPOINTS.myCredentials, { json: patch, fallbackError: "Login va parolni saqlashda xatolik" }),
  );
}
