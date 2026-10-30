"use client";

import { BadgeCheck, TriangleAlert } from "lucide-react";

import type { LogistOrderPatch } from "@/features/orders/api";
import {
  confirmationSummary,
  confirmationView,
  withConfirmerFallback,
} from "@/features/orders/confirmation";
import { confirmSwitchesToCash } from "@/features/orders/payment-guard";
import { StatusReasonDialog } from "@/features/orders/components/status-reason-dialog";
import { CONFIRM_REASONS } from "@/features/orders/reasons";
import { paymentSummary } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Mijoz tasdig'ini chetlab o'tish — `pending → confirmed` (`02` §2.3: logist
 * "✅ (sabab)"; backend 2026-10-01 §5.1: `confirm_reason` oq ro'yxati +
 * `other` da izoh). `to = shipping` bo'lsa tasdiqdan keyin chaqiruvchi yo'lga
 * chiqarish oynasini ochadi (kuryer majburiy), ya'ni bu oyna faqat tasdiq.
 *
 * To'lov: mijoz Payme/Click ni tanlab to'lamay qaytgan buyurtma tasdiqlansa
 * usulni **server o'zi** naqdga o'tkazadi (`cash` + `cod_pending`, §5.2/§9.3)
 * — panel alohida to'lov PATCH yubormaydi. Onlayn pul allaqachon kelgan
 * bo'lsa yoki boshqa har qanday o'tishda to'lovga tegilmaydi. Tasdiq
 * qaytarilsa (undo) to'lov onlaynga QAYTMAYDI.
 */
export function ConfirmOrderDialog({
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
  const thenShip = to === "shipping";
  const me = useAuthStore((state) => state.user);

  // "Logist {men} tasdiqladi · sabab" — server ism bermasa joriy foydalanuvchidan.
  const successDetail = (updated: LogistOrder, patch: LogistOrderPatch) =>
    confirmationSummary(
      confirmationView(
        withConfirmerFallback(updated.confirmation, {
          confirmer: {
            type: me?.role === "admin" ? "admin" : "logist",
            id: me ? Number(me.id) || null : null,
            name: me?.name ?? "",
          },
          reason: patch.confirmReason ?? null,
          at: new Date(),
        }),
      ),
    );

  return (
    <StatusReasonDialog
      order={order}
      to="confirmed"
      title={(current) => `#${current.orderNumber} ni tasdiqlash`}
      Icon={BadgeCheck}
      tone="brand"
      reasons={CONFIRM_REASONS}
      notePlaceholder="Kim bilan, qachon gaplashildi — qisqacha"
      submitLabel={thenShip ? "Tasdiqlash → kuryer tanlash" : "Tasdiqlash"}
      warning={(current) => <ConfirmWarning order={current} />}
      info={(current) => (
        <p className="text-ink-faint text-meta">
          {confirmSwitchesToCash(current) ? (
            <>
              To&apos;lov <b className="text-ink">naqdga</b> o&apos;tadi — mijoz onlayn to&apos;lamagan,
              pulni kuryer oladi. Tasdiqni qaytarsangiz ham to&apos;lov naqdligicha qoladi.
            </>
          ) : (
            <>
              To&apos;lov o&apos;zgarmaydi: <b className="text-ink">{paymentSummary(current)}</b>.
            </>
          )}{" "}
          Tasdiq
          tarixga sizning nomingiz va sabab bilan yoziladi.
          {thenShip ? " Keyingi qadam — bosh kuryerga berish." : ""}
        </p>
      )}
      buildPatch={(value) => ({
        status: "confirmed",
        confirmReason: value.reason,
        note: value.note || null,
      })}
      successDetail={successDetail}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

function ConfirmWarning({ order }: { order: LogistOrder }) {
  const online = order.pendingReason === "awaiting_online_payment";
  const hasApp = order.client.hasApp === true;
  if (!online && !hasApp) return null;
  return (
    <p className="bg-amber-soft text-gold flex items-start gap-2 rounded-lg px-3 py-2 text-meta font-medium">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {online
        ? "Mijoz onlayn to'lovni tugatmagan. Tasdiqlasangiz buyurtma naqd to'lovga o'tadi — pulni kuryer oladi."
        : "Mijozda ilova bor — odatda u o'zi tasdiqlaydi. Faqat mijoz bilan gaplashgan bo'lsangiz tasdiqlang."}
    </p>
  );
}
