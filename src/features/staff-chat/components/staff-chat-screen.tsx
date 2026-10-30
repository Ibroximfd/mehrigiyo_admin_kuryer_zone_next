"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MessagesSquare, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import {
  fetchStaffChannels,
  fetchStaffGroupChannel,
  fetchStaffOrderChannel,
} from "@/features/staff-chat/api";
import { OrderJoinResults } from "@/features/staff-chat/components/order-chat-search";
import { StaffChannelList } from "@/features/staff-chat/components/staff-channel-list";
import { StaffChatRoom } from "@/features/staff-chat/components/staff-chat-room";
import { TeamMembersSheet } from "@/features/staff-chat/components/team-members-sheet";
import { staffChatErrorMessage } from "@/features/staff-chat/error-hints";
import { useStaffFallbackPoll } from "@/features/staff-chat/poll";
import { useStaffLiveStore } from "@/features/staff-chat/store";
import { isTeamChannel } from "@/features/staff-chat/team";
import type { TeamMember } from "@/features/staff-chat/team";
import type { StaffChannel } from "@/features/staff-chat/types";
import { useDirectChannels, useOpenDirect, useTeamChannel } from "@/features/staff-chat/use-team-chat";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-media-query";
import { isEndpointMissing } from "@/lib/api-availability";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Xodimlar chati — `STAFF_CHAT_FLUTTER.md` §1.
 *
 * Logist filialidagi **har qanday** buyurtma muhokamasini ko'radi (operator
 * esa faqat o'zinikini) — bu farq serverda hal qilinadi, ekran ikkalasi
 * uchun bitta (`LOGIST_CHAT_FLUTTER.md` §1).
 *
 * Manzil qatori uch parametrni tushunadi:
 *   `?channel=12`   — ochiq kanal (havolani hamkasbga tashlash mumkin);
 *   `?order=<uuid>` — buyurtma muhokamasi; kanal id'si oldindan ma'lum
 *                     emas, shuning uchun u shu yerda ochiladi va manzil
 *                     `?channel=` ga almashadi (kanal birinchi so'rovda
 *                     yaratiladi, §1.1);
 *   `?message=502`  — eslatma bildirishnomasidan kelinganda o'sha xabarga
 *                     surish.
 */
export function StaffChatScreen() {
  const isMobile = useIsMobile();
  const router = useRouter();

  const [channelId, setChannelId] = useQueryState("channel", parseAsInteger);
  const [orderId, setOrderId] = useQueryState("order", parseAsString);
  const [messageId, setMessageId] = useQueryState("message", parseAsInteger);

  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  /* Qidiruv serverda (`?q=`, 2026-10-01 C §13.3) — yuklangan 50 tadan emas. */
  const query = useDebouncedValue(search.trim(), 300);

  /* Guruh alohida so'raladi: u ro'yxatning bir qismi emas, doimiy kanal. */
  /*
   * Soket ochiq — hodisalar yetarli; uzilgan bo'lsa ro'yxat backoff bilan
   * so'raladi (`poll.ts`). Tabga qaytganda baribir yangilanadi.
   */
  const groupPoll = useStaffFallbackPoll();
  const channelsPoll = useStaffFallbackPoll();

  const group = useQuery({
    queryKey: queryKeys.staffGroupChannel,
    queryFn: ({ signal }) => fetchStaffGroupChannel(signal),
    refetchInterval: groupPoll,
  });

  /*
   * Ro'yxat server tartibida (oxirgi ODAM xabari, `NULLS LAST`, `-id`) —
   * qayta saralanmaydi; real vaqt yangi xabarli kanalni o'zi tepaga
   * ko'taradi. "O'qilmagan" ekranda suziladi: chip darhol ishlaydi.
   * Qidiruv — buyurtma raqami, mijoz ismi yoki telefoni bo'yicha serverda.
   */
  const channels = useQuery({
    queryKey: queryKeys.staffChannels(query ? { kind: null, q: query } : { kind: null }),
    queryFn: ({ signal }) => fetchStaffChannels({ limit: 50, q: query || null }, signal),
    refetchInterval: channelsPoll,
    placeholderData: query ? keepPreviousData : undefined,
  });

  /*
   * Jamoa chati (`HUDUD_BACKEND_TALABLAR_4.md` §1): umumiy guruh va shaxsiy
   * chatlar. Backend hali yo'q bo'lsa (404) bo'lim "Tez orada" bo'lib turadi.
   */
  const team = useTeamChannel();
  const directs = useDirectChannels();
  const [membersOpen, setMembersOpen] = useState(false);
  const openDirect = useOpenDirect();

  /*
   * Buyurtma muhokamasi. Kanal birinchi so'rovda yaratiladi, shuning uchun
   * "topilmadi" degan holat yo'q — faqat huquq yetmasligi mumkin.
   */
  const orderChannel = useQuery({
    queryKey: queryKeys.staffOrderChannel(orderId ?? ""),
    queryFn: ({ signal }) => fetchStaffOrderChannel(orderId as string, signal),
    enabled: Boolean(orderId),
    retry: false,
  });

  /* Kanal ochildi — manzil `?channel=` ga almashadi. */
  useEffect(() => {
    if (!orderId || !orderChannel.data) return;
    void setChannelId(orderChannel.data.id);
    void setOrderId(null);
  }, [orderId, orderChannel.data, setChannelId, setOrderId]);

  useEffect(() => {
    if (!orderId || !orderChannel.isError) return;
    toast.error(
      staffChatErrorMessage(orderChannel.error, "Muhokamani ochib bo'lmadi"),
    );
    void setOrderId(null);
  }, [orderId, orderChannel.isError, orderChannel.error, setOrderId]);

  /*
   * Obuna rad etilgan bo'lsa kanal yopiladi (§1.4). Bu odatda huquq
   * o'zgarganda bo'ladi — masalan buyurtma boshqa operatorga o'tgan.
   */
  const deniedChannelId = useStaffLiveStore((state) => state.deniedChannelId);
  const setDeniedChannel = useStaffLiveStore((state) => state.setDeniedChannel);

  useEffect(() => {
    if (deniedChannelId === null) return;

    /*
     * Guruh bundan mustasno: unga obuna avtomatik va biz buyruqni faqat
     * xabar oqimini yoqish uchun yuboramiz. Server uni ortiqcha deb rad
     * etsa ham kanal yopilmasligi kerak — u hamma xodim uchun ochiq.
     */
    const isGroup = group.data?.id === deniedChannelId;

    if (!isGroup && deniedChannelId === channelId) {
      toast.error("Bu kanalga kirish huquqingiz yo'q");
      void setChannelId(null);
    }
    setDeniedChannel(null);
  }, [deniedChannelId, channelId, group.data?.id, setChannelId, setDeniedChannel]);

  const openChannel = useCallback(
    (channel: StaffChannel) => {
      void setChannelId(channel.id);
      // Eski chuqur havola qolib ketmasin.
      void setMessageId(null);
    },
    [setChannelId, setMessageId],
  );

  /** "Xabar yozish": mavjud chat yoki yangisi — ochiladi, varaq yopiladi. */
  const messageMember = async (member: TeamMember) => {
    const result = await openDirect.open(member);
    if (result.ok) {
      setMembersOpen(false);
      openChannel(result.channel);
      return;
    }
    toast.error(
      isEndpointMissing(result.error)
        ? "Shaxsiy chat tez orada ishga tushadi"
        : staffChatErrorMessage(result.error, "Shaxsiy chatni ochib bo'lmadi"),
    );
  };

  const known = [
    team.channel,
    group.data,
    orderChannel.data,
    ...directs.channels,
    ...(channels.data ?? []),
  ].filter((item): item is StaffChannel => Boolean(item));

  const active = known.find((channel) => channel.id === channelId) ?? null;


  const showList = isMobile ? active === null : true;
  const showRoom = isMobile ? active !== null : true;

  if (channels.isError && group.isError) {
    return (
      <ErrorView
        message={errorMessage(
          group.error ?? channels.error,
          "Xodimlar chatini yuklashda xatolik",
        )}
        onRetry={() => {
          void group.refetch();
          void channels.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex h-full">
      {showList ? (
        <aside
          className={cn(
            "border-line bg-surface flex flex-col md:w-[340px] md:shrink-0 md:border-r",
            isMobile ? "w-full" : "",
          )}
        >
          <StaffChannelList
            group={group.data ?? null}
            team={team.channel}
            teamState={team.state}
            onRetryTeam={() => void team.refetch()}
            directs={directs.channels}
            directState={directs.state}
            channels={channels.data ?? []}
            activeChannelId={channelId}
            search={search}
            isSearching={search.trim() !== query || (Boolean(query) && channels.isFetching)}
            onSearchChange={setSearch}
            unreadOnly={unreadOnly}
            onUnreadOnlyChange={setUnreadOnly}
            onSelect={openChannel}
            isPending={channels.isPending || orderChannel.isFetching}
            onRefresh={() => {
              void group.refetch();
              void channels.refetch();
              if (team.state !== "soon") void team.refetch();
              if (directs.state !== "soon") void directs.refetch();
            }}
            isRefreshing={channels.isRefetching || group.isRefetching}
            // Bitta qidiruv: a'zo chatlar ro'yxatda, qo'shilish mumkin bo'lganlari — pastda (§D 3).
            footer={<OrderJoinResults query={search} onOpenOrder={(id) => void setOrderId(id)} />}
          />
        </aside>
      ) : null}

      {showRoom ? (
        <section className="min-w-0 flex-1">
          {active ? (
            <StaffChatRoom
              // Kanal almashganda xona butunlay qaytadan quriladi.
              key={active.id}
              channel={active}
              client={active.order?.client ?? null}
              onBack={() => void setChannelId(null)}
              focusMessageId={messageId}
              onOpenOrder={(id) => router.push(ROUTES.orderDetail(id))}
              headerActions={
                isTeamChannel(active) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMembersOpen(true)}
                    aria-label="Guruh a'zolari"
                  >
                    <Users className="size-3.5" />
                    <span className="hidden sm:inline">A&apos;zolar</span>
                  </Button>
                ) : null
              }
            />
          ) : (
            <EmptyView
              Icon={MessagesSquare}
              title="Kanalni tanlang"
              description="Xodimlar guruhida umumiy masalalar muhokama qilinadi; buyurtma muhokamasini esa buyurtma kartochkasidagi «Muhokama» tugmasi bilan boshlash mumkin."
              className="h-full"
            />
          )}
        </section>
      ) : null}

      <TeamMembersSheet
        open={membersOpen}
        onOpenChange={setMembersOpen}
        onMessage={(member) => void messageMember(member)}
        pendingKey={openDirect.pendingKey}
      />
    </div>
  );
}
