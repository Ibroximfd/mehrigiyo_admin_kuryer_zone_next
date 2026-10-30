"use client";

import { AlarmClock, Lock, PhoneCall, Truck, UserRoundCog } from "lucide-react";

import { CallButton } from "@/components/kit/call-button";
import { Checkbox } from "@/components/ui/checkbox";
import { creatorKindLabel } from "@/features/orders/creator";
import { isTransferLocked, statusBlockedReason } from "@/features/orders/permissions";
import type { LogistOrder, OrderCreator } from "@/features/orders/types";
import { CourierMessageBadge } from "@/features/orders/components/kanban/courier-message-badge";
import { OrderChatBadge } from "@/features/orders/components/kanban/order-chat-badge";
import {
  abbreviateName,
  formatDayMonth,
  formatPhone,
  formatShortDateTime,
  groupThousands,
  initials,
} from "@/lib/format";
import { statusSince } from "@/features/orders/order-times";
import { cn } from "@/lib/utils";
import { useOrderHasReminder } from "@/stores/reminders-store";

/** Kichik rangli teg — dizayndagi `.tag` (20px, 6px burchak). */
export const CARD_TAG =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-fine font-semibold whitespace-nowrap";

export function CardField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-ink-faint text-micro leading-none uppercase">{label}</p>
      <div className="text-ink mt-1 text-dense leading-snug">{children}</div>
    </div>
  );
}

/** "#DA-184011 · 27.09"; tanlash katakchasi hover/tanlov rejimida. */
export function CardHead({
  order,
  selected,
  selectionActive,
  onToggleSelect,
  onOpen,
  onDiscuss,
}: {
  order: LogistOrder;
  selected: boolean;
  selectionActive: boolean;
  onToggleSelect?: (id: string) => void;
  /** Kartochkani ochish — raqam haqiqiy tugma (klaviatura bilan ham ochiladi). */
  onOpen: (order: LogistOrder) => void;
  /** Buyurtma chatini ochish (chat belgisi bosilganda). */
  onDiscuss?: (orderId: string) => void;
}) {
  const blocked = statusBlockedReason(order);
  const hasReminder = useOrderHasReminder(order.id);
  const since = statusSince(order);
  return (
    <div className="flex items-center justify-between gap-2 text-meta font-semibold">
      <span className="flex min-w-0 items-center gap-1.5">
        {onToggleSelect ? (
          <span
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className={cn(
              "-ml-0.5 flex transition-opacity duration-(--dur-micro)",
              selected || selectionActive
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(order.id)}
              aria-label={`${order.orderNumber} ni tanlash`}
            />
          </span>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(order);
          }}
          // Ustun tartibining asosi — statusga o'tgan payt (2026-10-01 C §7).
          title={since ? `Shu statusda: ${formatShortDateTime(since)} dan` : undefined}
          className="text-ink hover:text-brand tabular min-w-0 truncate rounded-sm text-left transition-colors duration-(--dur-micro)"
        >
          <span data-no-translit>#{order.orderNumber || order.id.slice(0, 8)}</span>
          {order.createdAt ? (
            <span className="text-ink-faint font-medium"> · {formatDayMonth(order.createdAt)}</span>
          ) : null}
        </button>
        <OrderChatBadge orderId={order.id} onOpen={onDiscuss} />
        <CourierMessageBadge orderId={order.id} onOpen={() => onOpen(order)} />
        {hasReminder ? (
          <AlarmClock className="text-brand size-3 shrink-0" aria-label="Eslatma qo'yilgan" />
        ) : null}
        {blocked ? (
          <Lock className="text-ink-faint size-3 shrink-0" aria-label={blocked} />
        ) : null}
        {isTransferLocked(order) ? (
          <span className={cn(CARD_TAG, "bg-warn-soft text-warn")}>O&apos;tkazilmoqda</span>
        ) : null}
      </span>
    </div>
  );
}

export function creatorTagText(creator: OrderCreator): string {
  const kind = creatorKindLabel(creator.kind);
  if (creator.kind === "client" || !creator.name) return kind;
  return `${kind} · ${abbreviateName(creator.name)}`;
}

export function CreatorTag({ creator }: { creator: OrderCreator | null }) {
  if (!creator) return null;
  return (
    <span
      title={creator.phone ? `${creatorTagText(creator)} · ${formatPhone(creator.phone)}` : undefined}
      className={cn(CARD_TAG, "bg-subtle text-ink-muted max-w-full")}
    >
      <span className="truncate">{creatorTagText(creator)}</span>
    </span>
  );
}

/** MIJOZ qatori: ism, birinchi telefon, "+N" va 📞. */
export function ClientLine({
  order,
  inline = false,
}: {
  order: LogistOrder;
  /** Yopilgan kartochkalarda: "Ism · telefon", tugmasiz. */
  inline?: boolean;
}) {
  const [first, ...rest] = order.client.phones;
  const name = order.client.fullName || "—";

  if (inline) {
    return (
      <CardField label="Mijoz">
        <b className="font-semibold" data-no-translit>
          {name}
        </b>
        {first ? <span className="tabular text-ink-muted"> · {formatPhone(first)}</span> : null}
      </CardField>
    );
  }

  return (
    <CardField label="Mijoz">
      <span className="flex flex-wrap items-center gap-1.5">
        <b className="font-semibold" data-no-translit>
          {name}
        </b>
        {first ? <span className="tabular text-meta">{formatPhone(first)}</span> : null}
        {rest.length > 0 ? (
          <span
            title={rest.map(formatPhone).join(", ")}
            className={cn(CARD_TAG, "bg-subtle text-ink-muted h-4.5 px-1")}
          >
            +{rest.length}
          </span>
        ) : null}
        {first ? (
          <CallButton
            phone={first}
            className="bg-brand-soft text-brand size-5.5 rounded-md p-0"
          />
        ) : (
          <PhoneCall className="text-ink-faint size-3" aria-hidden />
        )}
      </span>
    </CardField>
  );
}

/**
 * Yetkazuvchilar — ikki qator, bir xil ko'rinishda (2026-10-30): **bosh
 * kuryer** (logist bergan) va **kuryer** (bosh kuryer tanlagan). Logist
 * ikkalasini bir qarashda ko'radi; bo'sh qator nima kutilayotganini aytadi.
 */
export function CourierLine({
  order,
  withAvatar = false,
}: {
  order: LogistOrder;
  withAvatar?: boolean;
}) {
  const chief = order.chiefCourier;
  const courier = order.courier;
  return (
    <div className="bg-subtle/70 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-1.5 text-dense">
      <PersonRow
        Icon={UserRoundCog}
        label="Bosh kuryer"
        name={chief?.fullName ?? null}
        empty={order.status === "confirmed" ? "berilmagan" : "—"}
        emptyTone={order.status === "confirmed" ? "danger" : "muted"}
        withAvatar={withAvatar}
      />
      <PersonRow
        Icon={Truck}
        label="Kuryer"
        name={courier?.fullName ?? null}
        empty={chief ? "bosh kuryer tanlaydi" : "—"}
        emptyTone="muted"
        withAvatar={withAvatar}
      />
    </div>
  );
}

function PersonRow({
  Icon,
  label,
  name,
  empty,
  emptyTone,
  withAvatar,
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  name: string | null;
  empty: string;
  emptyTone: "danger" | "muted";
  withAvatar: boolean;
}) {
  return (
    <>
      <span className="text-ink-faint flex items-center gap-1 text-fine">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      {name ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {withAvatar ? (
            <span
              aria-hidden
              className="bg-brand text-brand-ink text-micro flex size-5 shrink-0 items-center justify-center rounded-full tracking-normal"
            >
              {initials(name)}
            </span>
          ) : null}
          <span className="text-ink truncate font-medium" data-no-translit>
            {name}
          </span>
        </span>
      ) : (
        <span className={cn("truncate", emptyTone === "danger" ? "text-danger font-medium" : "text-ink-faint")}>
          {empty}
        </span>
      )}
    </>
  );
}

/**
 * Kartochkadagi summa qatori: summa — asosiy, hech qachon ikki qatorga
 * bo'linmaydi (`250 000` "250 / 000" bo'lib sinardi, chunki yonidagi
 * to'lov nishonchasi `shrink-0` edi va ruscha "Наличные · при получении"
 * hamma joyni olardi). Endi qator `flex-wrap`: joy yetmasa nishoncha
 * KEYINGI qatorga tushadi, summa joyida qoladi.
 */
export function CardAmountRow({
  amount,
  struck = false,
  children,
}: {
  amount: number;
  /** Bekor qilingan buyurtma — chizilgan, xira. */
  struck?: boolean;
  /** O'ng tomondagi nishoncha (to'lov / bekor qilgan). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <span
        className={cn(
          "tabular shrink-0 text-lg2 leading-tight font-bold whitespace-nowrap",
          struck ? "text-ink-faint line-through" : "text-ink",
        )}
      >
        {groupThousands(amount)}
      </span>
      {children ? <span className="flex max-w-full min-w-0 justify-end">{children}</span> : null}
    </div>
  );
}
