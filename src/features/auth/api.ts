import { api, ApiError } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapLoginResponse, mapSupportLoginResponse } from "./types";
import type { LoginResult } from "./types";

/**
 * Kirish — ikki bosqichli:
 *
 *   1. CRM bilan bitta `/operator/login/` (username + parol) — asosiy yo'l,
 *      backend §4.1 `logist` roli ham shu yerdan keladi.
 *   2. O'tmasa — eski support tizimi `/support/operator/login/` (telefon +
 *      parol): eski operator sayti akkauntlari ham kira olsin. Bunday
 *      sessiyada filial va rol yo'q, ma'lumot qamrovi cheklangan
 *      (butun filial emas, faqat o'z buyurtmalari) — CRM operator akkauntiga
 *      o'tish tavsiya etiladi.
 *
 * Operator API'da profil endpointi yo'q — login javobi to'liq saqlanadi va
 * sahifa yangilanganda `localStorage` dan tiklanadi.
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const raw = await api.post<unknown>(ENDPOINTS.operatorLogin, {
      json: { username, password },
      fallbackError: "Login yoki parol xato",
    });
    return mapLoginResponse(raw);
  } catch (error) {
    // Faqat "login/parol noto'g'ri" holatida zaxira sinaladi — tarmoq yoki
    // server xatosida asl xato ko'tariladi.
    const status = error instanceof ApiError ? error.status : undefined;
    if (status !== 400 && status !== 401) throw error;

    try {
      const raw = await api.post<unknown>(ENDPOINTS.supportLogin, {
        json: { phone: username, password },
        fallbackError: "Login yoki parol xato",
      });
      return mapSupportLoginResponse(raw);
    } catch {
      // Ikkalasida ham yo'q — foydalanuvchiga asl (birinchi) xato ko'rinadi.
      throw error;
    }
  }
}
