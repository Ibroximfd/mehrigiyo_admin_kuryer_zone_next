import { dispatch, type Method } from "./router";
import { session } from "./db";

/*
 * Ishlovchilar yon ta'sir bilan ro'yxatdan o'tadi. Fayl `api.ts` dan
 * faqat `NEXT_PUBLIC_SKLAD_MOCK=1` bo'lganda dinamik import qilinadi.
 */
import "./handlers";

export function mockRequest(
  method: Method,
  path: string,
  options: { searchParams?: Record<string, unknown>; json?: unknown },
): Promise<unknown> {
  return dispatch(method, path, options);
}

/**
 * Rolni sinash: manzilga `?sklad_role=branch` qo'shilsa mock filial
 * logistiga aylanadi (Toshkent filiali, dopusk berilgan 3 mahsulot).
 */
export function applyMockRole(search: string) {
  const role = new URLSearchParams(search).get("sklad_role");
  if (role === "branch") {
    session.role = "logist.branch";
    session.filial_id = 2;
    session.user = { id: 9, full_name: "Rustam Toshmatov", kind: "logist" };
  } else if (role === "main") {
    session.role = "logist.main";
    session.filial_id = 1;
    session.user = { id: 5, full_name: "Dilshod Karimov", kind: "logist" };
  }
}
