"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowLeftRight,
  ArrowRight,
  History,
  LoaderCircle,
  MessageSquareText,
  PackageOpen,
  PartyPopper,
  RefreshCw,
  Tags,
  Trash2,
  TriangleAlert,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchActivity } from "@/features/activity/api";
import type { ActivityEntry } from "@/features/activity/types";
import { orderStatusInfo } from "@/features/orders/types";
import { transferStatusInfo } from "@/features/transfers/types";
import { errorCode, errorMessage } from "@/lib/api-client";
import { formatSmartTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useActivityStore } from "@/stores/activity-store";
import { useRemindersStore } from "@/stores/reminders-store";

/**
 * Harakatlar lentasi paneli — filialda kim nima qilganining jurnali.
 *
 * Bir necha logist parallel ishlaganda "buni kim ko'chirdi, kuryer kim
 * biriktirdi" degan savolga shu yerdan javob topiladi.
 *
 * Manba — server jurnali (§4.11): u boshqa qurilmada, boshqa smenada
 * bo'lgan harakatlarni ham ko'rsatadi va sahifalanadi. So'rov faqat panel
 * ochiq turganda faol bo'ladi, ya'ni yopiq panel tarmoqni band qilmaydi;
 * WS hodisasi kelganda esa aynan shu faol so'rov yangilanadi
 * (`panel-shell.tsx`).
 *
 * Endpoint bo'lmasa panel qurilma ko'rgan hodisalarga tushadi
 * (`stores/activity-store.ts`) — hech qanday oq ekran yo'q.
 */
export function ActivityFeed() {
  const open = useActivityStore((state) => state.open);
  const setOpen = useActivityStore((state) => state.setOpen);
  const liveEntries = useActivityStore((state) => state.entries);
  const clear = useActivityStore((state) => state.clear);

  const journal = useInfiniteQuery({
    queryKey: queryKeys.activity,
    queryFn: ({ pageParam, signal }) => fetchActivity(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      last.hasNextPage ? pages.length + 1 : undefined,
    enabled: open,
    retry: false,
    staleTime: 15_000,
  });

  // Marshrut yo'q — jurnal qurilma xotirasidan chiziladi.
  const missing = errorCode(journal.error) === "endpoint_missing";
  const serverEntries = journal.data?.pages.flatMap((page) => page.entries);
  const entries = missing || !serverEntries ? liveEntries : serverEntries;
  const loading = journal.isPending && !missing;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-[400px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
      >
        <div className="border-line flex items-start justify-between gap-2 border-b px-5 py-4 pr-12">
          <div>
            <SheetTitle className="text-ink flex items-center gap-2 text-base font-semibold">
              <History className="text-brand size-4.5" />
              Harakatlar lentasi
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-meta">
              {missing
                ? "Shu qurilma ko'rgan hodisalar"
                : "Filialda kim nima qilgani — real vaqtda"}
            </SheetDescription>
          </div>

          {missing ? (
            entries.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                title="Lentani tozalash"
                aria-label="Lentani tozalash"
                className="text-ink-faint hover:text-danger hover:bg-danger-soft mt-0.5 rounded-md p-1.5 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={() => void journal.refetch()}
              disabled={journal.isFetching}
              title="Jurnalni yangilash"
              aria-label="Jurnalni yangilash"
              className="text-ink-faint hover:text-ink hover:bg-subtle mt-0.5 rounded-md p-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={cn("size-4", journal.isFetching && "animate-spin")}
              />
            </button>
          )}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <RemindersSection onNavigate={() => setOpen(false)} />

          {loading ? (
            <div className="text-ink-faint flex items-center justify-center gap-2 py-10 text-meta">
              <LoaderCircle className="size-4 animate-spin" />
              Jurnal yuklanmoqda
            </div>
          ) : null}

          {journal.isError && !missing ? (
            <p className="text-danger px-2 py-3 text-meta">
              {errorMessage(journal.error, "Jurnalni yuklashda xatolik")}
            </p>
          ) : null}

          {!loading && entries.length === 0 ? (
            <div className="py-10 text-center">
              <History className="text-ink-faint mx-auto size-8" />
              <p className="text-ink mt-2 text-body font-semibold">
                Hozircha tinch
              </p>
              <p className="text-ink-faint mx-auto mt-1 max-w-[240px] text-meta leading-relaxed">
                Buyurtma ko&apos;chirilishi, kuryer biriktirilishi va boshqa
                hodisalar shu yerga tushib boradi.
              </p>
            </div>
          ) : entries.length > 0 ? (
            <>
              <ol className="space-y-1">
                {entries.map((entry) => (
                  <ActivityRow
                    key={entry.id}
                    entry={entry}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </ol>

              {journal.hasNextPage && !missing ? (
                <button
                  type="button"
                  onClick={() => void journal.fetchNextPage()}
                  disabled={journal.isFetchingNextPage}
                  className="border-line text-ink-muted hover:bg-subtle hover:text-ink mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-meta font-medium transition-colors disabled:opacity-60"
                >
                  {journal.isFetchingNextPage ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : null}
                  Oldingi harakatlar
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Eslatmalar bo'limi — lentaning tepasida: kutilayotganlar va yonganlari.
 * O'chirish shu yerda; yonganlari o'chirilmaguncha ko'rinib turadi.
 */
function RemindersSection({ onNavigate }: { onNavigate: () => void }) {
  const reminders = useRemindersStore((state) => state.list);
  const remove = useRemindersStore((state) => state.remove);

  if (reminders.length === 0) return null;

  return (
    <section className="mb-4">
      <p className="text-ink-faint text-micro mb-1.5 px-2 uppercase">
        Eslatmalar
      </p>
      <ul className="space-y-1">
        {reminders.map((reminder) => {
          const due = reminder.at <= new Date().toISOString();
          return (
            <li
              key={reminder.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-2 py-2",
                due ? "bg-warn-soft" : "bg-subtle/60",
              )}
            >
              <AlarmClock
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  due ? "text-warn" : "text-ink-faint",
                )}
              />
              <Link
                href={ROUTES.orderDetail(reminder.orderId)}
                onClick={onNavigate}
                className="min-w-0 flex-1"
              >
                <span className="text-ink flex flex-wrap items-baseline gap-x-1.5 text-dense">
                  <b className="tabular" data-no-translit>
                    {reminder.orderNumber}
                  </b>
                  {reminder.note ? <span data-no-translit>{reminder.note}</span> : "Eslatma"}
                </span>
                <span className="text-ink-faint block text-fine">
                  {formatSmartTime(new Date(reminder.at))}
                  {due ? " · vaqti keldi" : ""}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(reminder.id)}
                aria-label="Eslatmani o'chirish"
                className="text-ink-faint hover:text-danger mt-0.5 rounded p-1 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Hodisa turi → ikonka, rang va matn. */
function describe(entry: ActivityEntry): {
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  detail: string | null;
} {
  const from = entry.fromStatus ? orderStatusInfo(entry.fromStatus).label : "";
  const to = entry.toStatus ? orderStatusInfo(entry.toStatus).label : "";

  switch (entry.type) {
    case "order_created":
      return {
        Icon: PackageOpen,
        color: "var(--order-confirmed)",
        title: "Yangi buyurtma tushdi",
        detail: to || null,
      };
    case "order_status_changed":
      return {
        Icon: ArrowRight,
        color: entry.toStatus
          ? orderStatusInfo(entry.toStatus).color
          : "var(--ink-muted)",
        title: from && to ? `${from} → ${to}` : "Status o'zgardi",
        detail: null,
      };
    case "order_confirmed":
      // Kim tasdiqlagani `note` da (mijoz / operator / onlayn to'lov) — §5.4.
      return {
        Icon: PartyPopper,
        color: "var(--order-confirmed)",
        title: "Buyurtma tasdiqlandi",
        detail: entry.note,
      };
    case "order_payment_changed":
      // To'lov o'qi (§5.7) — buyurtma statusidan alohida.
      return {
        Icon: Wallet,
        color: "var(--ok)",
        title: "To'lov holati o'zgardi",
        detail: entry.note,
      };
    case "order_courier_assigned":
      return {
        Icon: Truck,
        color: "var(--brand)",
        title: "Kuryer biriktirildi",
        detail: entry.note,
      };
    case "order_delivery_attempt":
      return {
        Icon: TriangleAlert,
        color: "var(--warn)",
        title: "Yetkazib bo'lmadi",
        detail: entry.note,
      };
    case "transfer_created":
      return {
        Icon: ArrowLeftRight,
        color: "var(--transfer-requested)",
        title: "Yangi filiallararo zakaz",
        detail: entry.note,
      };
    case "transfer_status_changed": {
      const fromT = entry.fromStatus
        ? transferStatusInfo(entry.fromStatus).label
        : "";
      const toT = entry.toStatus
        ? transferStatusInfo(entry.toStatus).label
        : "";
      return {
        Icon: ArrowLeftRight,
        color: entry.toStatus
          ? transferStatusInfo(entry.toStatus).color
          : "var(--ink-muted)",
        title:
          fromT && toT ? `Zakaz: ${fromT} → ${toT}` : "Zakaz holati o'zgardi",
        detail: null,
      };
    }
    case "order_tags_changed":
      return {
        Icon: Tags,
        color: "var(--info)",
        title: entry.note ? "Teglar" : "Teglar o'zgardi",
        detail: entry.note,
      };
    case "order_comment_added":
      return {
        Icon: MessageSquareText,
        color: "var(--brand)",
        title: "Izoh yozildi",
        detail: entry.note,
      };
    case "order_transfer_requested":
      return {
        Icon: ArrowLeftRight,
        color: "var(--warn)",
        title: "Buyurtma filialga taklif qilindi",
        detail: entry.note,
      };
    case "order_transfer_resolved":
      return {
        Icon: ArrowLeftRight,
        color: "var(--ok)",
        title: entry.note ?? "O'tkazish yakunlandi",
        detail: null,
      };
    case "order_change_requested":
      return {
        Icon: MessageSquareText,
        color: "var(--warn)",
        title: "Kuryer o'zgarish so'radi",
        detail: entry.note,
      };
    case "order_change_request_resolved":
      return {
        Icon: MessageSquareText,
        color: "var(--ok)",
        title: "O'zgarish so'roviga javob berildi",
        detail: entry.note,
      };
    default:
      return {
        Icon: History,
        color: "var(--ink-muted)",
        title: entry.type,
        detail: entry.note,
      };
  }
}

function ActivityRow({
  entry,
  onNavigate,
}: {
  entry: ActivityEntry;
  onNavigate: () => void;
}) {
  const { Icon, color, title, detail } = describe(entry);
  const orderLabel =
    entry.orderNumber ||
    (entry.orderId ? `#${entry.orderId.slice(0, 8)}` : null) ||
    (entry.transferId ? `TRF-${entry.transferId}` : null);

  const body = (
    <>
      <span
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: `color-mix(in oklab, ${color} 14%, var(--surface-1))`,
          color,
        }}
      >
        <Icon className="size-3.5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {orderLabel ? (
            <span className="text-ink tabular text-meta font-semibold" data-no-translit>
              {orderLabel}
            </span>
          ) : null}
          <span className="text-ink text-dense">{title}</span>
        </span>

        {detail ? (
          <span className="text-ink-muted block truncate text-meta" data-no-translit>
            {detail}
          </span>
        ) : null}

        <span className="text-ink-faint mt-0.5 flex items-center gap-1 text-fine">
          {entry.actor ? (
            <>
              <UserRound className="size-3" />
              <span className="truncate" data-no-translit>
                {entry.actor}
              </span>
              <span>·</span>
            </>
          ) : null}
          {formatSmartTime(new Date(entry.at))}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left",
    "transition-colors duration-(--dur-micro)",
    entry.orderId ? "hover:bg-subtle" : "",
  );

  if (entry.orderId) {
    return (
      <li>
        <Link
          href={ROUTES.orderDetail(entry.orderId)}
          onClick={onNavigate}
          className={className}
        >
          {body}
        </Link>
      </li>
    );
  }

  if (entry.transferId) {
    return (
      <li>
        <Link
          href={`${ROUTES.transfers}?transfer=${entry.transferId}`}
          onClick={onNavigate}
          className={className}
        >
          {body}
        </Link>
      </li>
    );
  }

  return <li className={className}>{body}</li>;
}
