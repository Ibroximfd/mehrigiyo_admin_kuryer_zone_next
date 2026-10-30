import type { LogistOrder } from "./types";

/**
 * Buyurtma JORIY statusga qachon o'tgan — `status_changed_at`
 * (2026-10-01 C §7). `.update()` bilan yozilgan kamdan-kam qatorda u
 * `null`: xato emas, zaxira — `created_at` (§7.4). `updated_at` bu savolga
 * javob bermaydi (har tahrirda yangilanadi).
 */
export function statusSince(
  order: Pick<LogistOrder, "statusChangedAt" | "createdAt">,
): Date | null {
  return order.statusChangedAt ?? order.createdAt;
}
