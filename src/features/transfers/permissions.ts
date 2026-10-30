import type { FilialTransfer, TransferDirection } from "./types";

/**
 * Transfer holat o'tishlari va egalik — backend jadvalining ko'zgusi
 * (`BACKEND-LOGIST.md` §7):
 *
 *   requested → accepted | rejected      — qabul qiluvchi (to_filial)
 *   accepted  → preparing → in_transit   — qabul qiluvchi
 *   in_transit → received                — buyurtmachi (from_filial)
 *   → cancelled (in_transit gacha)       — buyurtmachi
 *
 * `direction` foydalanuvchi filialiga nisbatan: `incoming` = biz ta'minotchi
 * (to_filial), `outgoing` = biz buyurtmachi (from_filial).
 */

type Transition = { to: string; label: string; destructive?: boolean };

/** Joriy holatdan shu filial qaysi o'tishlarga haqli. */
export function allowedTransferTransitions(
  transfer: Pick<FilialTransfer, "status">,
  direction: TransferDirection,
): Transition[] {
  const { status } = transfer;

  if (direction === "incoming") {
    // Biz — ta'minotchi filial (to_filial).
    if (status === "requested") {
      return [
        { to: "accepted", label: "Qabul qilish" },
        { to: "rejected", label: "Rad etish", destructive: true },
      ];
    }
    if (status === "accepted") {
      return [{ to: "preparing", label: "Tayyorlashni boshlash" }];
    }
    if (status === "preparing") {
      return [{ to: "in_transit", label: "Yo'lga chiqarish" }];
    }
    return [];
  }

  // Biz — buyurtmachi filial (from_filial).
  const transitions: Transition[] = [];
  if (status === "in_transit") {
    transitions.push({ to: "received", label: "Qabul qilib oldim" });
  }
  if (
    status === "requested" ||
    status === "accepted" ||
    status === "preparing"
  ) {
    transitions.push({
      to: "cancelled",
      label: "Bekor qilish",
      destructive: true,
    });
  }
  return transitions;
}

/** Rad etishda sabab majburiy (backend `reject_reason_required`). */
export function transitionNeedsReason(to: string): boolean {
  return to === "rejected";
}
