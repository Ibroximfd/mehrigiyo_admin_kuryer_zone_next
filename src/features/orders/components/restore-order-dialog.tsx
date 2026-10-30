"use client";

import { RotateCcw } from "lucide-react";

import { StatusReasonDialog } from "@/features/orders/components/status-reason-dialog";
import { REVERT_REASONS } from "@/features/orders/reasons";
import type { LogistOrder } from "@/features/orders/types";

/** Atkazni tiklash — buyurtma oqimga qaytadi, sabab tarixda qoladi. */
export function RestoreOrderDialog({
  order,
  to,
  onClose,
  onChanged,
}: {
  order: LogistOrder | null;
  to: string;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
}) {
  return (
    <StatusReasonDialog
      order={order}
      to={to}
      title={(current) => `#${current.orderNumber} ni tiklash`}
      Icon={RotateCcw}
      tone="brand"
      reasons={REVERT_REASONS}
      notePlaceholder="Nima bo'lgani — qisqacha"
      submitLabel="Tiklash"
      info={() => (
        <p className="text-ink-faint text-meta">
          Bekor qilingan buyurtma oqimga qaytadi; atkaz sababi tarixda saqlanadi.
        </p>
      )}
      buildPatch={(value) => ({
        status: to,
        revertReason: value.reason,
        note: value.note || null,
      })}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}
