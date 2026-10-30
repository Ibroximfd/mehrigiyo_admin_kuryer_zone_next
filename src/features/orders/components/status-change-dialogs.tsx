"use client";

import { CancelOrderDialog } from "@/features/orders/components/cancel-order-dialog";
import { ConfirmOrderDialog } from "@/features/orders/components/confirm-order-dialog";
import { DeliverConfirmDialog } from "@/features/orders/components/deliver-confirm-dialog";
import { RestoreOrderDialog } from "@/features/orders/components/restore-order-dialog";
import { RevertOrderDialog } from "@/features/orders/components/revert-order-dialog";
import { boardTransition, needsShipAfterConfirm } from "@/features/orders/permissions";
import type { LogistOrder } from "@/features/orders/types";

/** Sabab so'raydigan o'tish so'rovi — qaysi oyna ochilishi matritsadan. */
export type StatusChangeRequest = { order: LogistOrder; to: string };

/**
 * Uchala sabab oynasi bitta joyda: chaqiruvchi faqat "shu buyurtmani shu
 * holatga" deb aytadi, qaysi dialog kerakligini `02` §2.3 matritsasi hal
 * qiladi. Doska, ro'yxat va detal shu komponentni ishlatadi.
 */
export function StatusChangeDialogs({
  request,
  onClose,
  onChanged,
  onShip,
}: {
  request: StatusChangeRequest | null;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
  /** `pending → shipping`: tasdiqdan keyin yo'lga chiqarish oynasi. */
  onShip?: (order: LogistOrder) => void;
}) {
  const kind = request ? boardTransition(request.order, request.to) : null;
  const to = request?.to ?? "";

  const shipAfter = request ? needsShipAfterConfirm(request.order.status, request.to) : false;

  return (
    <>
      <ConfirmOrderDialog
        order={kind === "confirm" ? request!.order : null}
        to={to}
        onClose={onClose}
        onChanged={(updated) => {
          onChanged?.(updated);
          if (shipAfter && updated.status === "confirmed") onShip?.(updated);
        }}
      />
      <DeliverConfirmDialog
        order={kind === "deliver" ? request!.order : null}
        onClose={onClose}
        onChanged={onChanged}
      />
      <CancelOrderDialog
        order={kind === "cancel" ? request!.order : null}
        onClose={onClose}
        onChanged={onChanged}
      />
      <RevertOrderDialog
        order={kind === "revert" ? request!.order : null}
        to={to}
        onClose={onClose}
        onChanged={onChanged}
      />
      <RestoreOrderDialog
        order={kind === "restore" ? request!.order : null}
        to={to}
        onClose={onClose}
        onChanged={onChanged}
      />
    </>
  );
}
