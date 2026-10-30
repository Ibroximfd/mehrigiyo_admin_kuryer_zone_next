"use client";

import {
  MessageSquareText,
  MessagesSquare,
  Pencil,
  PhoneCall,
  Printer,
  Send,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/kit/copy-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppPresenceTag } from "@/features/orders/components/app-presence-tag";
import { ConfirmationChip } from "@/features/orders/components/confirmation-chip";
import { CARD_TAG, creatorTagText } from "@/features/orders/components/kanban/card-parts";
import { StatusTag } from "@/features/orders/components/status-tag";
import { printWaybills } from "@/features/orders/components/waybill";
import { copyCourierText, smsShareUrl, telegramShareUrl } from "@/features/orders/share";
import type { LogistOrder } from "@/features/orders/types";
import { useDiscussionUnread } from "@/features/staff-chat/components/discussion-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Kartochka sarlavhasi (dizayn `Logist_Order_Card`): raqam + sana, status,
 * kim yaratgan, ilova, tasdiq; o'ngda Muhokama · Kuryerga · Chop
 * etish · **Tahrirlash**.
 */
export function OrderDetailHeader({
  order,
  onDiscuss,
  onEdit,
}: {
  order: LogistOrder;
  onDiscuss?: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h1 className="text-ink text-title flex min-w-0 flex-wrap items-center gap-1 font-bold">
        <CopyButton
          value={order.orderNumber || order.id}
          label="Buyurtma raqamini nusxalash"
          successMessage="Buyurtma raqami nusxalandi"
          className="-ml-1.5"
        >
          <span className="tabular" data-no-translit>
            #{order.orderNumber || "—"}
          </span>
        </CopyButton>
        {order.createdAt ? (
          <span className="text-ink-faint font-medium">— {formatDate(order.createdAt)}</span>
        ) : null}
      </h1>
      <StatusTag status={order.status} label={order.statusDisplay} size="md" />
      {order.createdBy ? (
        <span className={cn(CARD_TAG, "bg-subtle text-ink-muted h-5.5 max-w-full")}>
          <span className="truncate">Yaratdi: {creatorTagText(order.createdBy)}</span>
        </span>
      ) : null}
      <AppPresenceTag client={order.client} className="h-5.5" />
      <ConfirmationChip confirmation={order.confirmation} className="h-5.5" />

      <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
        {onDiscuss ? <DiscussButton orderId={order.id} onClick={onDiscuss} /> : null}
        <ShareMenu order={order} />
        <Button variant="outline" onClick={() => void printWaybills([order])}>
          <Printer />
          Chop etish
        </Button>
        <Button onClick={onEdit}>
          <Pencil />
          Tahrirlash
        </Button>
      </div>
    </div>
  );
}

function DiscussButton({ orderId, onClick }: { orderId: string; onClick: () => void }) {
  const unread = useDiscussionUnread(orderId);
  return (
    <Button variant="outline" onClick={onClick}>
      <MessagesSquare />
      Muhokama
      {unread > 0 ? (
        <span className="bg-amber text-amber-ink tabular rounded-md px-1.5 text-fine font-bold">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Button>
  );
}

/** Kuryerga ulashish: nusxa / Telegram / SMS (§14). */
function ShareMenu({ order }: { order: LogistOrder }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Share2 />
          Kuryerga ▾
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-44">
        <DropdownMenuItem
          onSelect={async () => {
            const ok = await copyCourierText(order);
            if (ok) toast.success("Matn nusxalandi");
            else toast.error("Nusxalab bo'lmadi");
          }}
        >
          <MessageSquareText />
          Matnni nusxalash
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(telegramShareUrl(order), "_blank")}>
          <Send />
          Telegram orqali
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={smsShareUrl(order)}>
            <PhoneCall />
            SMS orqali
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
