"use client";

import { Hand, LoaderCircle } from "lucide-react";

import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import type { OrderAck } from "@/features/orders/types";
import { formatShortDateTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Kartochka uchun tayyor "Oldim" holati — doska hisoblaydi, karta faqat chizadi. */
export type CardAckState = {
  /** Hali hech kim olmagan yangi buyurtma. */
  fresh: boolean;
  acks: OrderAck[];
  /** Olingan buyurtma keyin boshqa joyda o'zgargan. */
  unseen: boolean;
  pending: boolean;
  /** Belgi faqat shu qurilmada (backend hali yo'q). */
  fallback: boolean;
  onAcknowledge: () => void;
};

/** "YANGI" — amber tabletka, kartaning boshida. */
export function FreshBadge() {
  return (
    <span className={cn(CARD_TAG, "bg-amber text-amber-ink tracking-wider uppercase")}>
      Yangi
    </span>
  );
}

/**
 * "Oldim" — logist buyurtmani ishga oldi. Karta bosilishi (ochish) va
 * sudrash bu tugmaga yetib bormasin.
 */
export function AckButton({
  state,
  className,
}: {
  state: CardAckState;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={state.pending}
      onClick={(event) => {
        event.stopPropagation();
        state.onAcknowledge();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      title={
        state.fallback
          ? "Belgi hozircha faqat shu qurilmada saqlanadi"
          : "Filialdagi boshqa logistlar ham ko'radi"
      }
      className={cn(
        "border-amber-line bg-surface text-gold hover:bg-amber-soft inline-flex h-6 items-center gap-1 rounded-md border px-2 text-fine font-semibold",
        "transition-colors duration-(--dur-micro) disabled:opacity-60",
        className,
      )}
    >
      {state.pending ? (
        <LoaderCircle className="size-3 animate-spin" aria-hidden />
      ) : (
        <Hand className="size-3" aria-hidden />
      )}
      Oldim
    </button>
  );
}

/** "Oldi: Aziz · 14:32" (+N) — kim olgani; o'zgargan bo'lsa nuqta. */
export function AckedByLine({ state }: { state: CardAckState }) {
  const [first, ...rest] = state.acks;
  if (!first) return null;
  const at = first.at ? formatShortDateTime(first.at) : "";
  const names = state.acks.map((ack) => ack.name || "Logist").join(", ");

  return (
    <p
      className="text-ink-muted flex min-w-0 items-center gap-1.5 text-fine"
      title={`Oldi: ${names}`}
    >
      <span
        aria-hidden
        className="bg-brand-soft text-brand flex size-4.5 shrink-0 items-center justify-center rounded-full text-micro font-bold"
      >
        {initials(first.name || "?")}
      </span>
      <span className="min-w-0 truncate">
        Oldi:{" "}
        <b className="text-ink font-semibold" data-no-translit={Boolean(first.name) || undefined}>
          {first.name || "Logist"}
        </b>
        {rest.length > 0 ? ` +${rest.length}` : ""}
        {at ? ` · ${at}` : ""}
      </span>
      {state.unseen ? (
        <span
          className="bg-info size-2 shrink-0 rounded-full"
          role="img"
          aria-label="Olgandan keyin boshqa joyda o'zgargan"
          title="Olgandan keyin boshqa joyda o'zgargan — ochib ko'ring"
        />
      ) : null}
    </p>
  );
}
