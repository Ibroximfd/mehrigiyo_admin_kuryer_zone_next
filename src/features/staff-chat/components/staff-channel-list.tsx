"use client";

import { Hash, MessagesSquare, Phone, RefreshCw, Receipt, RotateCcw, Users } from "lucide-react";
import { memo, useMemo } from "react";

import { SearchInput } from "@/components/kit/search-input";
import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { orderStatusInfo } from "@/features/orders/types";
import { PeerAvatar } from "@/features/staff-chat/components/peer-avatar";
import {
  directTitle,
  filterDirectChannels,
  isDirectChannel,
  isTeamChannel,
  orderChannelsOnly,
} from "@/features/staff-chat/team";
import type { StaffChannel } from "@/features/staff-chat/types";
import type { TeamSectionState } from "@/features/staff-chat/use-team-chat";
import { formatPhone, formatSmartTime, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Kanallar ro'yxati — `STAFF_CHAT_FLUTTER.md` §1.2 + jamoa chati
 * (`HUDUD_BACKEND_TALABLAR_4.md` §1). Uch bo'lim:
 *
 *   Jamoa       — xodimlar guruhi va logist+kuryer umumiy guruhi, doim
 *                 tepada (qidiruv yashirmaydi);
 *   Shaxsiy     — ikki kishilik chatlar, oxirgi xabar bo'yicha;
 *   Buyurtmalar — muhokamalar, faqat **boshlangan** bo'lsa, server tartibida.
 */
export function StaffChannelList({
  group,
  team = null,
  teamState = "ready",
  onRetryTeam,
  directs = [],
  directState = "ready",
  channels,
  activeChannelId,
  search,
  onSearchChange,
  isSearching = false,
  unreadOnly,
  onUnreadOnlyChange,
  onSelect,
  isPending,
  onRefresh,
  isRefreshing = false,
  footer,
}: {
  /** Xodimlar guruhi; hali yuklanmagan bo'lsa `null`. */
  group: StaffChannel | null;
  /** Logistlar + kuryerlar umumiy guruhi. */
  team?: StaffChannel | null;
  teamState?: TeamSectionState;
  onRetryTeam?: () => void;
  /** Shaxsiy chatlar — allaqachon tartiblangan (`sortDirectChannels`). */
  directs?: StaffChannel[];
  directState?: TeamSectionState;
  /** Server tartibida; qidiruv bo'lsa — server natijasi (`?q=`). */
  channels: StaffChannel[];
  activeChannelId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  /** Qidiruv so'rovi ketmoqda. */
  isSearching?: boolean;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
  onSelect: (channel: StaffChannel) => void;
  isPending: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Ro'yxat oxirida: qidiruv bo'yicha qo'shilish mumkin bo'lgan zakazlar. */
  footer?: React.ReactNode;
}) {
  /*
   * Tartib — serverniki (2026-10-01 C §13.3); yangi xabar kelgan kanalni
   * real vaqt keshda o'zi tepaga ko'taradi. Qidiruv ham serverda (`?q=`):
   * mijoz ismi, telefoni va buyurtma raqami bo'yicha.
   */
  const filtered = useMemo(
    () => orderChannelsOnly(channels).filter((channel) => !unreadOnly || channel.unread > 0),
    [channels, unreadOnly],
  );
  const visibleDirects = useMemo(
    () =>
      filterDirectChannels(directs, search).filter((channel) => !unreadOnly || channel.unread > 0),
    [directs, search, unreadOnly],
  );

  const groupHidden = unreadOnly && (group?.unread ?? 0) === 0;
  const teamHidden = !team || (unreadOnly && team.unread === 0);
  // O'qilmaganlar filtrida "Tez orada"/yuklanish qatorlari shovqin — yashiriladi.
  const showTeamStatus = !unreadOnly && teamState !== "ready";
  const showDirects =
    directState === "ready" && (visibleDirects.length > 0 || (!unreadOnly && !search.trim()));

  return (
    <div className="flex h-full flex-col">
      {/* ── Qidiruv ───────────────────────────────────────────────────────── */}
      <div className="border-line flex items-center gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            isSearching={isSearching}
            placeholder="Chat, mijoz, telefon yoki zakaz raqami..."
          />
        </div>

        {onRefresh ? (
          <button
            type="button"
            aria-label="Kanallarni yangilash"
            title="Kanallarni yangilash"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="text-ink-muted hover:bg-subtle hover:text-ink shrink-0 rounded-lg p-2 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          </button>
        ) : null}
      </div>

      {/* ── Filtr ─────────────────────────────────────────────────────────── */}
      <div className="border-line flex shrink-0 gap-1.5 border-b px-3 py-2">
        <FilterPill active={!unreadOnly} onClick={() => onUnreadOnlyChange(false)}>
          Barchasi
        </FilterPill>
        <FilterPill active={unreadOnly} onClick={() => onUnreadOnlyChange(true)}>
          O&apos;qilmagan
        </FilterPill>
      </div>

      {/* ── Ro'yxat ───────────────────────────────────────────────────────── */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {/* ── Jamoa ───────────────────────────────────────────────────────── */}
        {(group && !groupHidden) || !teamHidden || showTeamStatus ? (
          <section aria-label="Jamoa" className="border-line border-b p-2">
            <SectionLabel>Jamoa</SectionLabel>
            <div className="space-y-1">
              {team && !teamHidden ? (
                <ChannelRow
                  channel={team}
                  active={activeChannelId === team.id}
                  onSelect={onSelect}
                />
              ) : null}
              {showTeamStatus ? (
                <TeamStatusRow state={teamState} onRetry={onRetryTeam} />
              ) : null}
              {group && !groupHidden ? (
                <ChannelRow
                  channel={group}
                  active={activeChannelId === group.id}
                  onSelect={onSelect}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── Shaxsiy ─────────────────────────────────────────────────────── */}
        {showDirects ? (
          <section aria-label="Shaxsiy" className="border-line border-b p-2">
            <SectionLabel>Shaxsiy</SectionLabel>
            {visibleDirects.length === 0 ? (
              <p className="text-ink-faint px-2.5 pb-1.5 text-meta">
                Jamoa guruhida a&apos;zolar ro&apos;yxatini ochib, «Xabar yozish» ni bosing.
              </p>
            ) : (
              <div className="space-y-1">
                {visibleDirects.map((channel) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    active={activeChannelId === channel.id}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* ── Buyurtmalar ─────────────────────────────────────────────────── */}
        <div className="px-2 pt-2">
          <SectionLabel>Buyurtmalar</SectionLabel>
        </div>

        {isPending ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : null}

        {!isPending && filtered.length === 0 ? (
          search.trim() && !unreadOnly ? (
            <EmptyView
              Icon={MessagesSquare}
              title="Muhokama topilmadi"
              description="Buyurtma raqami yoki mijoz telefoni bilan qidirib ko'ring — ism bo'yicha qidiruv harf registriga sezgir."
              className="border-none bg-transparent"
            />
          ) : (
            <EmptyView
              Icon={MessagesSquare}
              title={unreadOnly ? "O'qilmagan yo'q" : "Muhokamalar yo'q"}
              description={
                unreadOnly
                  ? "Hamma muhokama o'qilgan."
                  : "Buyurtma muhokamasi birinchi xabardan keyin shu ro'yxatda paydo bo'ladi. Uni buyurtma kartochkasidagi «Muhokama» tugmasi bilan boshlang."
              }
              className="border-none bg-transparent"
            />
          )
        ) : null}

        <div className="space-y-1 px-2 pb-2">
          {filtered.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              active={activeChannelId === channel.id}
              onSelect={onSelect}
            />
          ))}
        </div>
        {footer}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-ink-faint px-2.5 pt-0.5 pb-1.5 text-fine font-semibold tracking-wide uppercase">
      {children}
    </p>
  );
}

/** Jamoa guruhi hali tayyor emas: yuklanmoqda · backend yo'q ("Tez orada") · xato. */
function TeamStatusRow({
  state,
  onRetry,
}: {
  state: TeamSectionState;
  onRetry?: () => void;
}) {
  if (state === "loading") return <Skeleton className="h-14 rounded-xl" />;
  const soon = state === "soon";
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-2.5 py-2.5" role="status">
      <span className="bg-subtle text-ink-faint flex size-9 shrink-0 items-center justify-center rounded-full">
        <Users className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink-muted block text-dense font-medium">
          {soon ? "Jamoa chati — tez orada" : "Jamoa guruhini yuklab bo'lmadi"}
        </span>
        <span className="text-ink-faint mt-0.5 block text-meta">
          {soon
            ? "Logistlar va kuryerlar bitta guruhda, shaxsiy yozishmalar bilan."
            : "Qayta urinib ko'ring."}
        </span>
      </span>
      {!soon && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Qayta urinish"
          title="Qayta urinish"
          className="text-ink-muted hover:bg-subtle hover:text-ink shrink-0 rounded-lg p-2 transition-colors"
        >
          <RotateCcw className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "text-meta rounded-lg px-2.5 py-1 font-medium",
        "transition-[background-color,box-shadow,color] duration-(--dur-micro)",
        active
          ? "bg-brand-soft text-brand shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--brand)_28%,transparent)]"
          : "text-ink-muted hover:text-ink hover:bg-subtle",
      )}
    >
      {children}
    </button>
  );
}

const ChannelRow = memo(function ChannelRow({
  channel,
  active,
  onSelect,
}: {
  channel: StaffChannel;
  active: boolean;
  onSelect: (channel: StaffChannel) => void;
}) {
  const isTeam = isTeamChannel(channel);
  const isDirect = isDirectChannel(channel);
  const isGroup = channel.kind === "group" || isTeam;
  // Buyurtma mijozi — `order.client` (§13.3); qatorning asosiy nomi.
  const client = channel.order?.client ?? null;
  const at = parseDate(channel.lastMessage?.at);
  const info = channel.order ? orderStatusInfo(channel.order.status) : null;
  const unread = channel.unread > 0;

  /*
   * Logist chatni mijozdan taniydi: ism — sarlavha, raqam va buyurtma
   * raqami — ikkinchi qator. Mijoz noma'lum bo'lsa kanal nomi qoladi.
   */
  const clientName = client?.fullName ?? "";
  const clientPhone = client?.phone ? formatPhone(client.phone) : "";
  const title = isDirect ? directTitle(channel) : clientName || clientPhone || channel.title;
  const fallbackTitle = isTeam ? "Logistlar va kuryerlar" : isGroup ? "Xodimlar guruhi" : "Muhokama";
  const orderNumber = channel.order?.orderNumber ?? "";

  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left",
        "transition-[background-color,box-shadow] duration-(--dur-micro)",
        active
          ? "bg-brand-soft shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--brand)_26%,transparent)]"
          : unread
            ? "bg-subtle/60 hover:bg-subtle"
            : "hover:bg-subtle",
      )}
    >
      {/* O'qilmagan qator chap chetida brend chizig'i — ko'z darhol ilinadi. */}
      {unread && !active ? (
        <span
          aria-hidden
          className="bg-brand absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full"
        />
      ) : null}

      {isDirect && channel.peer ? (
        <PeerAvatar
          id={channel.peer.id}
          fullName={channel.peer.fullName || channel.title}
          avatarUrl={channel.peer.avatarUrl}
          online={channel.peer.online}
          size="sm"
          className="size-9"
        />
      ) : (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            isGroup || unread
              ? "bg-brand-soft text-brand"
              : "bg-subtle text-ink-muted",
          )}
        >
          {isTeam ? (
            <Users className="size-4" />
          ) : isGroup ? (
            <Hash className="size-4" />
          ) : isDirect ? (
            <MessagesSquare className="size-4" />
          ) : (
            <Receipt className="size-4" />
          )}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-ink min-w-0 flex-1 truncate text-dense",
              unread ? "font-bold" : "font-medium",
            )}
            data-no-translit={title ? "" : undefined}
          >
            {title || fallbackTitle}
          </span>

          {at ? (
            <span
              className={cn(
                "tabular shrink-0 text-fine",
                unread ? "text-brand font-semibold" : "text-ink-faint",
              )}
            >
              {formatSmartTime(at)}
            </span>
          ) : null}
        </span>

        {/* Mijoz raqami · buyurtma holati · buyurtma raqami. */}
        {!isGroup && !isDirect && (info || orderNumber || (clientName && clientPhone)) ? (
          <span className="text-ink-muted mt-1 flex min-w-0 items-center gap-x-1.5 text-fine">
            {clientName && clientPhone ? (
              <span className="tabular inline-flex shrink-0 items-center gap-1">
                <Phone aria-hidden className="size-3" />
                {clientPhone}
              </span>
            ) : null}

            {info ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                {info.label}
              </span>
            ) : null}

            {orderNumber && title !== orderNumber ? (
              <span
                title={orderNumber}
                className="text-ink-faint tabular min-w-0 truncate"
                data-no-translit
              >
                {orderNumber}
              </span>
            ) : null}
          </span>
        ) : null}

        <span className="mt-1 flex items-center gap-1.5">
          {/* Xabar matni va muallif — xodim yozgani, tarjima qilinmaydi;
              "Media xabar" / "Hali xabar yo'q" esa UI matni. */}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-meta",
              unread ? "text-ink font-medium" : "text-ink-muted",
            )}
          >
            {channel.lastMessage ? (
              <>
                {channel.lastMessage.by && !isDirect ? (
                  <span data-no-translit>{`${channel.lastMessage.by}: `}</span>
                ) : null}
                {channel.lastMessage.text ? (
                  <span data-no-translit>{channel.lastMessage.text}</span>
                ) : (
                  "Media xabar"
                )}
              </>
            ) : (
              "Hali xabar yo'q"
            )}
          </span>

          {unread ? (
            <span
              aria-label={`${channel.unread} ta o'qilmagan`}
              className="bg-danger text-white tabular text-micro inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 font-bold tracking-normal"
            >
              {channel.unread > 99 ? "99+" : channel.unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
});
