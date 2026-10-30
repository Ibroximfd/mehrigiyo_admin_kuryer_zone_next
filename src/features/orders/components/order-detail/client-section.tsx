"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { CallButton } from "@/components/kit/call-button";
import { CopyButton } from "@/components/kit/copy-button";
import { addOrderComment } from "@/features/orders/comments";
import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import { DetailField, DetailSection, EMPTY_VALUE } from "@/features/orders/components/order-detail/section";
import { creatorKindLabel } from "@/features/orders/creator";
import { orderSourceLabel } from "@/features/orders/source";
import type { LogistOrder, PersonRef } from "@/features/orders/types";
import { errorMessage } from "@/lib/api-client";
import { abbreviateName, formatPhone, initials } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { sipCallUrl } from "@/lib/sip";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Mijoz: ism, liddagi **barcha** telefonlar (asosiy / buyurtma shu raqamga /
 * qo'shimcha, har birida 📞 va nusxa), lid mas'uli, manba, yaratuvchi,
 * mijoz izohi (`05` §6).
 */
export function ClientSection({ order }: { order: LogistOrder }) {
  const client = order.client;

  return (
    <DetailSection title="Mijoz" aside={<ResponsibleLink person={order.responsibleOperator} />}>
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="bg-brand-soft text-brand flex size-11 shrink-0 items-center justify-center rounded-full font-bold"
        >
          {initials(client.fullName || "?")}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <b className="text-ink text-lg2 font-semibold" data-no-translit>
            {client.fullName || "—"}
          </b>
          {client.phones.length === 0 ? (
            <span className="text-ink-faint text-dense">Telefon ko&apos;rsatilmagan</span>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {client.phones.map((phone, index) => (
                <PhoneRow key={phone} order={order} phone={phone} primary={index === 0} />
              ))}
            </ul>
          )}
          <MarkCalledButton orderId={order.id} />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <DetailField label="Manba">{orderSourceLabel(order.source) || EMPTY_VALUE}</DetailField>
        <DetailField label="Yaratdi">
          {order.createdBy ? (
            <span>
              {order.createdBy.kind === "client"
                ? creatorKindLabel("client")
                : (
                  <>
                    {creatorKindLabel(order.createdBy.kind)} ·{" "}
                    <span data-no-translit>{order.createdBy.name}</span>
                  </>
                )}
              {order.createdBy.phone ? (
                <span className="text-ink-faint tabular"> · {formatPhone(order.createdBy.phone)}</span>
              ) : null}
              {order.onBehalfOf ? (
                <span className="text-ink-faint block text-meta">
                  <span data-no-translit>{order.onBehalfOf.name}</span> nomidan
                </span>
              ) : null}
            </span>
          ) : (
            EMPTY_VALUE
          )}
        </DetailField>
        <DetailField label="Mijoz izohi">
          {order.customerNotes ? (
            <span data-no-translit>«{order.customerNotes}»</span>
          ) : (
            EMPTY_VALUE
          )}
        </DetailField>
        {order.doctor ? (
          <DetailField label="Shifokor">
            <span data-no-translit>{order.doctor.name}</span>
            {order.doctor.phone ? (
              <span className="text-ink-faint tabular"> · {formatPhone(order.doctor.phone)}</span>
            ) : null}
          </DetailField>
        ) : null}
      </div>
    </DetailSection>
  );
}

function PhoneRow({ order, phone, primary }: { order: LogistOrder; phone: string; primary: boolean }) {
  const orderedFor = order.client.orderedForPhone;
  const isOrdered = orderedFor ? orderedFor === phone : primary;
  const role = primary ? "asosiy" : "qo'shimcha";

  return (
    <li className="flex flex-wrap items-center gap-2 text-body">
      <CopyButton
        value={formatPhone(phone)}
        label="Telefon raqamni nusxalash"
        successMessage="Telefon raqami nusxalandi"
        className="-ml-1.5"
      >
        <span className="text-ink tabular font-medium">{formatPhone(phone)}</span>
      </CopyButton>
      <span
        className={cn(
          CARD_TAG,
          "h-5.5",
          isOrdered ? "bg-brand-soft text-brand" : "bg-subtle text-ink-muted",
        )}
      >
        {isOrdered ? `${role} · buyurtma shu raqamga` : role}
      </span>
      {primary && order.client.hasApp ? (
        <span className={cn(CARD_TAG, "bg-ok-soft text-ok h-5.5")}>ilova</span>
      ) : null}
      <CallButton phone={phone} className="bg-surface-3 text-brand size-6.5 p-0" />
    </li>
  );
}

function ResponsibleLink({ person }: { person: PersonRef | null }) {
  if (!person?.name) return null;
  const href = person.phone ? sipCallUrl(person.phone) : null;
  const text = `lid mas'uli: ${abbreviateName(person.name)}${person.phone ? ` · ${formatPhone(person.phone)}` : ""}`;
  return href ? (
    <a href={href} className="text-link hover:text-brand">
      {text}
    </a>
  ) : (
    <span className="text-ink-muted">{text}</span>
  );
}

/**
 * "Qo'ng'iroq qilindi" tez belgisi (§14): bir bosishda imzoli izoh tushadi —
 * tarix lentasida kim, qachon urgani ko'rinadi.
 */
function MarkCalledButton({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const author = useAuthStore((state) => state.user?.name) || "Logist";

  const mark = useMutation({
    mutationFn: () => addOrderComment(orderId, { author, text: "📞 Qo'ng'iroq qilindi" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderComments(orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderTimeline(orderId) });
      toast.success("Qo'ng'iroq belgilandi");
    },
    onError: (error) => toast.error(errorMessage(error, "Belgilanmadi")),
  });

  return (
    <button
      type="button"
      disabled={mark.isPending}
      onClick={() => mark.mutate()}
      className="text-ink-faint hover:text-brand w-fit text-meta font-medium transition-colors"
    >
      {mark.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : "📞 Qo'ng'iroq qilindi deb belgilash"}
    </button>
  );
}
