"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Hash,
  LoaderCircle,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JumpToLatest } from "@/features/staff-chat/components/jump-to-latest";
import { useJumpToMessage } from "@/features/staff-chat/use-jump-to-message";
import { OrderAmount } from "@/features/orders/components/order-amount";
import { orderStatusInfo } from "@/features/orders/types";
import {
  deleteStaffMessage,
  editStaffMessage,
  fetchStaffMessages,
  markStaffChannelRead,
  sendStaffFile,
  sendStaffMessage,
} from "@/features/staff-chat/api";
import { StaffComposer } from "@/features/staff-chat/components/staff-composer";
import type { MentionCandidate } from "@/features/staff-chat/components/staff-composer";
import { PeerAvatar } from "@/features/staff-chat/components/peer-avatar";
import { StaffMessageBubble } from "@/features/staff-chat/components/staff-message-bubble";
import { directTitle, isDirectChannel, isTeamChannel } from "@/features/staff-chat/team";
import {
  PEER_INACTIVE_TEXT,
  isPeerInactiveError,
  staffChatErrorMessage,
} from "@/features/staff-chat/error-hints";
import { clearStaffChannelUnread } from "@/features/staff-chat/realtime";
import {
  useStaffDeletedIds,
  useStaffLiveMessages,
  useStaffLiveStore,
  useStaffReadCursors,
  useStaffTyping,
} from "@/features/staff-chat/store";
import { useStaffFallbackPoll } from "@/features/staff-chat/poll";
import {
  findFirstUnreadId,
  groupStaffByDay,
  mergeStaffTimeline,
} from "@/features/staff-chat/timeline";
import { useDocumentVisible } from "@/hooks/use-document-visible";
import { createPendingStaffMessage } from "@/features/staff-chat/types";
import type {
  StaffChannel,
  StaffMessage,
  StaffSender,
} from "@/features/staff-chat/types";
import { sendOperatorCommand } from "@/hooks/use-operator-socket";
import { errorMessage } from "@/lib/api-client";
import { formatPhone, formatRelative, parseDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ChatMembersButton } from "@/features/staff-chat/components/chat-members-button";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Xodimlar chati xonasi — `STAFF_CHAT_FLUTTER.md` §1.
 *
 * Kanal ochilganda soketga `subscribe` yuboriladi, yopilganda
 * `unsubscribe` (§1.4). Umumiy guruh bundan mustasno: unga obuna
 * avtomatik, ya'ni hech narsa yuborilmaydi.
 *
 * Komponent kanal almashganda butunlay qaytadan yaratiladi (chaqiruvchida
 * `key={channel.id}`), shuning uchun holatni tozalovchi effekt yo'q.
 */
export function StaffChatRoom({
  channel,
  client,
  onBack,
  backButton = "mobile",
  onOpenOrder,
  focusMessageId,
  headerActions,
}: {
  channel: StaffChannel;
  /** Sarlavhadagi qo'shimcha tugmalar (masalan jamoa guruhida "A'zolar"). */
  headerActions?: React.ReactNode;
  /**
   * Buyurtma mijozi — sarlavhada **asosiy** o'rinni egallaydi.
   *
   * Kanal yuklamasida mijoz yo'q (faqat buyurtma raqami, holati va
   * summasi), shuning uchun uni chaqiruvchi beradi. Sabab oddiy: xodim
   * "kim haqida gaplashyapmiz" degan savolga birinchi javob oladi —
   * `ORD-20260907181754-4F2E` esa hech kimga hech narsa demaydi.
   *
   * Berilmasa sarlavha kanal nomiga qaytadi.
   */
  client?: { fullName: string; phone: string } | null;
  onBack?: () => void;
  /**
   * Orqaga tugmasi qachon ko'rinadi.
   *
   * `mobile` — yonma-yon ko'rinishda u faqat telefonda kerak (kompyuterda
   * ro'yxat chapda turadi). `always` — panel ichida ochilganda: u yerda
   * ro'yxat umuman yo'q va yopishning yagona yo'li shu.
   */
  backButton?: "mobile" | "always";
  /** Muhokama qilinayotgan buyurtmani ochish. */
  onOpenOrder?: (orderId: string) => void;
  /** Bildirishnomadan kelinganda — o'sha xabarga surish. */
  focusMessageId?: number | null;
}) {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");

  const [replyTo, setReplyTo] = useState<StaffMessage | null>(null);
  const [editing, setEditing] = useState<StaffMessage | null>(null);
  const [deleting, setDeleting] = useState<StaffMessage | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [newWhileAway, setNewWhileAway] = useState(0);
  /**
   * Ochilgan paytdagi o'qilmaganlar — "Yangi xabarlar" ajratgichi shundan.
   * Xona kanal bilan qayta quriladi (`key`), ya'ni qiymat bir marta olinadi.
   */
  const [unreadAtOpen] = useState(channel.unread);
  /** Xona ochiq, lekin logist ko'rmayotganda kelgan birinchi xabar. */
  const [awayDividerId, setAwayDividerId] = useState<number | null>(null);
  const visible = useDocumentVisible();

  const scrollRef = useRef<HTMLDivElement>(null);
  /** Lentaning ichki o'rami — balandligi kuzatiladi. */
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);
  /** Oxirgi o'qilgan deb belgilangan xabar — takror so'rov ketmasin. */
  const lastReadId = useRef(0);
  /** Yuborilmay qolgan kursor — xona yopilganda baribir jo'natiladi. */
  const pendingRead = useRef(0);

  const live = useStaffLiveMessages(channel.id);
  const deletedIds = useStaffDeletedIds(channel.id);
  const typing = useStaffTyping(channel.id);
  /** Kim qayergacha o'qigani — o'z xabarlaridagi ✓✓ shundan chiqadi. */
  const readCursors = useStaffReadCursors(channel.id);

  // ── Tarix ────────────────────────────────────────────────────────────────
  /* Soket uzilgan bo'lsa ochiq kanal ham so'rov bilan tirik turadi. */
  const messagesPoll = useStaffFallbackPoll();
  const messages = useInfiniteQuery({
    queryKey: queryKeys.staffMessages(channel.id),
    queryFn: ({ pageParam, signal }) =>
      fetchStaffMessages(channel.id, { beforeId: pageParam, signal }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.oldestId : undefined,
    refetchInterval: messagesPoll,
  });

  const timeline = useMemo(
    () => mergeStaffTimeline(messages.data?.pages, live, deletedIds, readCursors),
    [messages.data?.pages, live, deletedIds, readCursors],
  );
  const grouped = useMemo(() => groupStaffByDay(timeline), [timeline]);

  /*
   * "Yangi xabarlar" ajratgichi. Ochilgandagi o'qilmaganlar faqat tarix
   * sahifalaridan hisoblanadi — jonli oqim keyin keladi va ajratgichni
   * siljitmasligi kerak. Ochiq turganda, lekin logist ko'rmayotganda
   * (tepaga surgan yoki boshqa tabda) kelgan xabar ham ajratgich qo'yadi.
   */
  const historyMessages = useMemo(
    () => mergeStaffTimeline(messages.data?.pages),
    [messages.data?.pages],
  );
  const dividerId =
    findFirstUnreadId(historyMessages, unreadAtOpen) ?? awayDividerId;

  /*
   * Begona yangi xabar: logist pastda va tab ko'rinib tursa — lenta o'zi
   * pastga yopishadi; aks holda "N ta yangi" hisoblagichi o'sadi va
   * ajratgich qo'yiladi. Obuna do'konga to'g'ridan-to'g'ri — holat
   * hodisa ichida yangilanadi, chizishdan keyin emas.
   */
  useEffect(() => {
    const channelId = channel.id;
    return useStaffLiveStore.subscribe((state, previous) => {
      const next = state.live[channelId];
      const before = previous.live[channelId];
      if (!next || next === before) return;

      const known = new Set((before ?? []).map((item) => item.id));
      const fresh = next.filter(
        (item) => item.id > 0 && !item.isMine && !known.has(item.id),
      );
      if (fresh.length === 0) return;

      const watching = shouldStickToBottom.current && !document.hidden;
      if (watching) return;

      setAwayDividerId((current) => current ?? fresh[0].id);
      if (!shouldStickToBottom.current) {
        setNewWhileAway((count) => count + fresh.length);
      }
    });
  }, [channel.id]);

  /*
   * `@login` nomzodlari — shu kanalda yozganlar. Xodimlar ro'yxati
   * endpointi logistda yo'q; muhokamada esa javob beriladigan odam
   * allaqachon yozgan bo'ladi, ya'ni ro'yxat amalda yetarli.
   */
  const mentionCandidates = useMemo(() => {
    const seen = new Map<string, MentionCandidate>();
    for (const message of timeline) {
      const sender = message.sender;
      if (!sender?.username || seen.has(sender.username)) continue;
      seen.set(sender.username, {
        username: sender.username,
        fullName: sender.fullName,
        role: sender.role,
      });
    }
    return [...seen.values()];
  }, [timeline]);

  // ── Obuna ────────────────────────────────────────────────────────────────
  /*
   * Obuna — kanal ochilganda `subscribe`, yopilganda `unsubscribe` (§1.4).
   *
   * ⚠️ Hujjatda guruhga obuna avtomatik deyilgan va ilgari unga buyruq
   * yuborilmasdi. Amalda esa guruhdagi xabarlar jonli kelmasdi — ular
   * faqat sahifa yangilangandan keyin (tarix so'rovi bilan) ko'rinardi.
   * Ya'ni avtomatik obuna badge'ga yetadi, xabar oqimiga esa aniq
   * `subscribe` kerak. Buyruq ikki marta yuborilgani zarar qilmaydi —
   * server uni shunchaki tasdiqlaydi.
   *
   * `unsubscribe` esa guruhga yuborilmaydi: u doimiy kanal va undan
   * uzilib qolish badge'ni ham o'chirib qo'yardi.
   */
  useEffect(() => {
    const setOpenChannel = useStaffLiveStore.getState().setOpenChannel;
    setOpenChannel(channel.id);

    sendOperatorCommand({ action: "subscribe", channel_id: channel.id });

    return () => {
      // Doimiy guruhlar (xodimlar, jamoa) — obuna saqlanadi, badge o'chmasin.
      if (channel.kind !== "group" && !isTeamChannel({ kind: channel.kind })) {
        sendOperatorCommand({ action: "unsubscribe", channel_id: channel.id });
      }
      // Boshqa kanal ochilgan bo'lsa uni o'chirib yubormaymiz.
      if (useStaffLiveStore.getState().openChannelId === channel.id) {
        setOpenChannel(null);
      }
    };
  }, [channel.id, channel.kind]);

  // ── O'qildi ──────────────────────────────────────────────────────────────
  /*
   * Kursor faqat oldinga suriladi (§1.3), shuning uchun eng oxirgi xabar
   * id'si yuboriladi. Kanal ochiq turganda har yangi xabarda takrorlanadi,
   * lekin faqat id o'zgarganda — bosh so'rov ketmaydi.
   */
  /*
   * Eng oxirgi **server** xabari — yuborilayotgan (manfiy id) hisobga
   * olinmaydi: u lentaning oxirida turadi, lekin kursorni surolmaydi.
   */
  let newestId = 0;
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    if (timeline[index].id > 0) {
      newestId = timeline[index].id;
      break;
    }
  }
  useEffect(() => {
    // Yashirin tabda o'qilmagan qoladi — logist qaytganda belgilanadi.
    if (!visible) return;
    if (newestId === 0 || newestId <= lastReadId.current) return;
    lastReadId.current = newestId;
    pendingRead.current = newestId;

    // Belgi darhol so'nadi — so'rov javobini kutmasdan.
    clearStaffChannelUnread(queryClient, channel.id);

    /*
     * So'rovning o'zi biroz kechiktiriladi: jonli suhbatda xabarlar
     * ketma-ket keladi va har biriga alohida POST yuborish behuda. Kursor
     * faqat oldinga suriladi, ya'ni oxirgisini yuborish yetarli.
     */
    const timer = setTimeout(() => {
      pendingRead.current = 0;
      void markStaffChannelRead(channel.id, newestId).catch(() => {
        // O'qildi belgisi ikkinchi darajali — jimgina o'tkazib yuboriladi.
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [newestId, channel.id, queryClient, visible]);

  /* Xona yopilganda kutib qolgan kursor yo'qolmasin. */
  useEffect(() => {
    const channelId = channel.id;
    return () => {
      if (pendingRead.current === 0) return;
      const messageId = pendingRead.current;
      pendingRead.current = 0;
      void markStaffChannelRead(channelId, messageId).catch(() => {});
    };
  }, [channel.id]);

  // ── Pastga yopishish ────────────────────────────────────────────────────
  /*
   * Oddiy "xabarlar soni o'zgarganda pastga sur" yetmaydi: lenta
   * balandligi keyinroq ham o'sadi — rasm yuklanadi, shrift almashadi,
   * yozish indikatori chiqadi. Natijada kirganda 1–2 ta xabar ekran
   * ostida qolib ketardi. Shuning uchun kontentning o'lchami kuzatiladi
   * va operator pastda turgan ekan, har o'sishda qaytadan yopishtiriladi.
   *
   * `useLayoutEffect` — birinchi surish chizishdan OLDIN bo'ladi, ya'ni
   * sakrash ko'rinmaydi.
   */
  useLayoutEffect(() => {
    const node = scrollRef.current;
    const content = contentRef.current;
    if (!node || !content) return;

    const pin = () => {
      if (shouldStickToBottom.current) node.scrollTop = node.scrollHeight;
    };
    pin();

    const observer = new ResizeObserver(pin);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!shouldStickToBottom.current) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [timeline.length]);

  /* Kimdir yozayotganda indikator o'zi so'nishi kerak — sekundlik yurish. */
  const typingNames = Object.keys(typing);
  useEffect(() => {
    if (typingNames.length === 0) return;
    const timer = setInterval(
      () => useStaffLiveStore.getState().pruneTyping(),
      1000,
    );
    return () => clearInterval(timer);
  }, [typingNames.length]);

  // ── Eskiroq xabarlar va "asl xabarga o'tish" ─────────────────────────────
  const fetchNextPage = messages.fetchNextPage;
  const fetchOlder = useCallback(async () => {
    shouldStickToBottom.current = false;
    const result = await fetchNextPage();
    return result.hasNextPage ?? false;
  }, [fetchNextPage]);

  const jumpToMessage = useJumpToMessage({ scrollRef, fetchOlder });

  /* Bildirishnomadan kelingan xabar — bir marta topib suriladi. */
  const jumpedTo = useRef<number | null>(null);
  useEffect(() => {
    if (!focusMessageId || messages.isPending) return;
    if (jumpedTo.current === focusMessageId) return;
    jumpedTo.current = focusMessageId;
    void jumpToMessage(focusMessageId);
  }, [focusMessageId, messages.isPending, jumpToMessage]);

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    shouldStickToBottom.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, []);

  // ── Yuborish ─────────────────────────────────────────────────────────────
  /*
   * Yuborish optimistik — Telegram'dagi kabi. Tugma bosilgan zahoti xabar
   * lentaga "soat" belgisi bilan tushadi (`addPending`), POST javobi
   * kelgach o'sha o'rinda haqiqiysi bilan almashadi (`resolvePending`):
   * javob — o'z xabarimizning **ishonchli** nusxasi (`is_mine` shu yerda
   * to'g'ri). Soket aks-sadosi javobdan oldin kelsa ham xabar ikkilanmaydi
   * (`resolvePendingByEcho`). Yiqilsa pufak qizil bo'lib "qayta yuborish /
   * o'chirish" taklif qiladi — fayl qaytadan tanlanmaydi, u xabarning
   * o'zida (`outbox`) turadi.
   *
   * Yozish maydoni yuborish paytida QULFLANMAYDI: har xabar o'z holatini
   * pufakda ko'rsatadi, operator ketma-ket yozaveradi.
   *
   * `useMutation` ataylab ishlatilmadi: holat global do'konda va kanal
   * almashib komponent yo'q qilinsa ham javob o'z joyiga tushadi.
   */
  const currentUser = useAuthStore((state) => state.user);
  /** Vaqtinchalik xabardagi "kim yozdi" — ketma-ketlik va javob sarlavhasi uchun. */
  const senderSelf = useMemo<StaffSender | null>(() => {
    if (!currentUser) return null;
    const operatorId = Number(currentUser.id);
    return {
      userId: null,
      operatorId: Number.isFinite(operatorId) && operatorId > 0 ? operatorId : null,
      fullName: currentUser.name,
      username: currentUser.username ?? "",
      role: currentUser.role,
      kind: "staff",
      avatarUrl: null,
    };
  }, [currentUser]);

  /**
   * `403 peer_inactive` kelgan kanal — suhbatdosh o'chirilgan: arxiv
   * o'qiladi, yozish maydoni yopiladi. Kanal id si bilan saqlanadi —
   * boshqa chatga o'tilsa qulf o'z-o'zidan tushadi.
   */
  const [inactiveChannelId, setInactiveChannelId] = useState<number | null>(null);
  const peerInactive = inactiveChannelId === channel.id;

  const deliver = useCallback(
    async (message: StaffMessage) => {
      const outbox = message.outbox;
      if (!outbox) return;
      const store = useStaffLiveStore.getState();
      const channelId = channel.id;

      try {
        const sent = outbox.file
          ? await sendStaffFile(
              {
                channelId,
                file: outbox.file,
                fileName: outbox.file.name || "fayl",
                text: outbox.text || null,
                duration: outbox.duration,
                replyToId: outbox.replyToId,
              },
              {
                signal: outbox.abort?.signal,
                // Baytlar ketib bo'lgach halqa noaniq rejimga o'tadi —
                // endi server javobi kutilmoqda, 100% da qotib turmaydi.
                onProgress: (fraction) =>
                  store.setPendingProgress(
                    channelId,
                    message.id,
                    fraction >= 1 ? null : fraction,
                  ),
              },
            )
          : await sendStaffMessage({
              channelId,
              text: outbox.text,
              replyToId: outbox.replyToId,
            });

        store.resolvePending(channelId, message.id, { ...sent, isMine: true });
      } catch (error) {
        // Operator o'zi bekor qildi — xabar shunchaki yo'qoladi.
        if (error instanceof DOMException && error.name === "AbortError") {
          store.removePending(channelId, message.id);
          return;
        }
        const reason = staffChatErrorMessage(
          error,
          outbox.file ? "Fayl yuborishda xatolik" : "Xabar yuborishda xatolik",
        );
        store.failPending(channelId, message.id, reason);
        if (isPeerInactiveError(error)) setInactiveChannelId(channelId);
        toast.error(reason);
      }
    },
    [channel.id],
  );

  const enqueue = (text: string, file: File | null, duration: number | null) => {
    const message = createPendingStaffMessage({
      channelId: channel.id,
      text,
      file,
      duration,
      replyTo,
      sender: senderSelf,
    });
    shouldStickToBottom.current = true;
    useStaffLiveStore.getState().addPending(message);
    setReplyTo(null);
    void deliver(message);
  };

  const retry = (message: StaffMessage) => {
    useStaffLiveStore
      .getState()
      .restartPending(
        channel.id,
        message.id,
        message.outbox?.file ? new AbortController() : null,
      );
    // Yangi `abort` do'kondagi nusxada — holat qaytadan o'qiladi
    // (`getState()` ning oldingi qaytargani eskirgan).
    const fresh = useStaffLiveStore
      .getState()
      .live[channel.id]?.find((item) => item.id === message.id);
    if (fresh) void deliver(fresh);
  };

  const discard = (message: StaffMessage) =>
    useStaffLiveStore.getState().removePending(channel.id, message.id);

  const cancelUpload = (message: StaffMessage) => message.outbox?.abort?.abort();

  const edit = useMutation({
    mutationFn: (input: { id: number; text: string }) =>
      editStaffMessage(input.id, input.text),
    onSuccess: (message) => {
      useStaffLiveStore.getState().upsert(message);
      setEditing(null);
    },
    onError: (error) =>
      toast.error(staffChatErrorMessage(error, "Tahrirlashda xatolik")),
  });

  const remove = useMutation({
    mutationFn: (message: StaffMessage) => deleteStaffMessage(message.id),
    onSuccess: (_result, message) => {
      useStaffLiveStore.getState().markDeleted(channel.id, message.id);
      setDeleting(null);
    },
    onError: (error) =>
      toast.error(staffChatErrorMessage(error, "O'chirishda xatolik")),
  });

  const orderInfo = channel.order ? orderStatusInfo(channel.order.status) : null;

  /*
   * Sarlavha: mijoz ismi (yoki raqami) — asosiy qator; buyurtma raqami,
   * holati va summasi — ikkinchi darajali. Buyurtma chati ekani ikonka,
   * holat nishonchasi va raqam bilan baribir ko'rinib turadi.
   */
  const clientName = client?.fullName?.trim() ?? "";
  const clientPhone = client?.phone ? formatPhone(client.phone) : "";
  const isTeam = isTeamChannel(channel);
  const isDirect = isDirectChannel(channel);
  const isGroupLike = channel.kind === "group" || isTeam;
  const peer = isDirect ? channel.peer : null;
  const peerSeen = parseDate(peer?.lastSeenAt);
  const title =
    (isDirect && directTitle(channel)) ||
    (channel.kind === "order" && (clientName || clientPhone)) ||
    channel.title ||
    (isTeam ? "Logistlar va kuryerlar" : "Muhokama");

  return (
    <div className="flex h-full flex-col">
      {/* ── Sarlavha ──────────────────────────────────────────────────────── */}
      <header className="border-line bg-surface/80 flex shrink-0 items-center gap-3 border-b px-3 py-2.5 backdrop-blur-md sm:px-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Yopish"
            className={cn(
              "text-ink-muted hover:bg-subtle hover:text-ink rounded-lg p-2 transition-colors",
              backButton === "mobile" && "md:hidden",
            )}
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}

        {peer ? (
          <PeerAvatar
            id={peer.id}
            fullName={peer.fullName || channel.title}
            avatarUrl={peer.avatarUrl}
            online={peer.online}
            className="size-9"
          />
        ) : (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              isGroupLike
                ? "bg-brand-soft text-brand"
                : "bg-info-soft text-info",
            )}
          >
            {isTeam ? (
              <Users className="size-4" />
            ) : channel.kind === "group" ? (
              <Hash className="size-4" />
            ) : (
              <Receipt className="size-4" />
            )}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p
            className="text-ink truncate text-body font-semibold"
            data-no-translit={
              (isDirect && directTitle(channel)) || clientName || clientPhone || channel.title
                ? ""
                : undefined
            }
          >
            {title}
          </p>

          <div className="text-ink-muted flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta">
            {channel.order && orderInfo ? (
              <>
                {/* Ism sarlavhada bo'lsa raqam shu yerda — ikkalasi ham
                    ko'rinib tursin. */}
                {clientName && clientPhone ? (
                  <span className="tabular">{clientPhone}</span>
                ) : null}

                <StatusPill
                  label={orderInfo.label}
                  color={orderInfo.color}
                  size="sm"
                />
                <OrderAmount order={channel.order} className="tabular" />

                {channel.order.orderNumber ? (
                  <span
                    title={channel.order.orderNumber}
                    className="text-ink-faint tabular min-w-0 truncate"
                    data-no-translit
                  >
                    {channel.order.orderNumber}
                  </span>
                ) : null}
              </>
            ) : isDirect ? (
              <span className={cn(peer?.online && "text-ok")}>
                {peer?.online
                  ? "onlayn"
                  : peerSeen
                    ? `oxirgi marta ${formatRelative(peerSeen)}`
                    : peer?.kind === "courier"
                      ? "Kuryer"
                      : "Xodim"}
              </span>
            ) : isTeam ? (
              <span>Logistlar va kuryerlar · jamoa guruhi</span>
            ) : (
              <span>Barcha xodimlar</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {channel.kind === "order" ? (
            <ChatMembersButton
              channelId={channel.id}
              onLeft={onBack}
            />
          ) : null}
          {headerActions}
          <button
            type="button"
            aria-label="Xabarlarni yangilash"
            title="Xabarlarni yangilash"
            disabled={messages.isRefetching}
            onClick={() => {
              useStaffLiveStore.getState().reset(channel.id);
              lastReadId.current = 0;
              void messages.refetch();
            }}
            className="text-ink-muted hover:bg-subtle hover:text-ink rounded-lg p-2 transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={cn("size-4", messages.isRefetching && "animate-spin")}
            />
          </button>

          {channel.order && onOpenOrder ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenOrder(channel.order!.id)}
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Buyurtma</span>
            </Button>
          ) : null}
        </div>
      </header>

      {/* ── Lenta ─────────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const node = event.currentTarget;
            const fromBottom =
              node.scrollHeight - node.scrollTop - node.clientHeight;
            shouldStickToBottom.current = fromBottom < 80;
            setShowJump((current) =>
              current === fromBottom > 400 ? current : fromBottom > 400,
            );
            if (fromBottom < 80) {
              setNewWhileAway((count) => (count === 0 ? count : 0));
            }
          }}
          className="scrollbar-thin h-full overflow-y-auto px-3 py-4 sm:px-4"
        >
          <div ref={contentRef} className="space-y-3">
          {messages.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton
                  key={index}
                  className={cn(
                    "h-12 rounded-2xl",
                    index % 2 === 0 ? "w-3/5" : "ml-auto w-2/5",
                  )}
                />
              ))}
            </div>
          ) : null}

          {messages.isError ? (
            <p className="text-danger py-8 text-center text-body">
              {errorMessage(messages.error, "Xabarlarni yuklashda xatolik")}
            </p>
          ) : null}

          {messages.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={messages.isFetchingNextPage}
                onClick={() => {
                  shouldStickToBottom.current = false;
                  void messages.fetchNextPage();
                }}
              >
                {messages.isFetchingNextPage ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : null}
                Eskiroq xabarlar
              </Button>
            </div>
          ) : null}

          {grouped.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <div className="sticky top-1 z-[1] flex justify-center py-1">
                <span className="border-line bg-surface/70 text-ink-muted rounded-full border px-2.5 py-0.5 text-fine font-medium backdrop-blur-sm">
                  {group.label}
                </span>
              </div>

              {group.rows.map(({ message, showSender }) => (
                <div
                  key={message.id}
                  className={showSender ? "pt-1.5" : undefined}
                >
                  {dividerId === message.id ? <NewMessagesDivider /> : null}
                  <StaffMessageBubble
                    message={message}
                    showSender={showSender}
                    isAdmin={isAdmin}
                    onReply={setReplyTo}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                    onJumpToReply={jumpToMessage}
                    onRetry={retry}
                    onDiscard={discard}
                    onCancelUpload={cancelUpload}
                    highlighted={focusMessageId === message.id}
                  />
                </div>
              ))}
            </div>
          ))}

          {!messages.isPending && timeline.length === 0 ? (
            <p className="text-ink-faint py-12 text-center text-body">
              {isGroupLike
                ? "Guruh bo'sh — birinchi bo'lib yozing."
                : isDirect
                  ? "Hali xabar yo'q — birinchi bo'lib yozing."
                  : "Bu buyurtma bo'yicha muhokama hali boshlanmagan."}
            </p>
          ) : null}

          {/* Kimdir yozmoqda — lentaning eng ostida, xabarlar bilan birga
              suriladi: alohida qatlamda turgani bilan bir xil ko'rinadi,
              lekin layoutni sakratmaydi. */}
          {typingNames.length > 0 ? (
            <p className="text-ink-muted flex items-center gap-1.5 px-1 text-meta">
              <span className="flex gap-0.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    style={{ animationDelay: `${dot * 150}ms` }}
                    className="bg-ink-faint size-1.5 animate-bounce rounded-full"
                  />
                ))}
              </span>
              {typingNames.length === 1
                ? `${typingNames[0]} yozmoqda...`
                : `${typingNames.length} kishi yozmoqda...`}
            </p>
          ) : null}
          </div>
        </div>

        <JumpToLatest
          visible={showJump || newWhileAway > 0}
          count={newWhileAway}
          onClick={() => {
            setNewWhileAway(0);
            scrollToBottom();
          }}
        />
      </div>

      {peerInactive ? (
        <p
          role="status"
          className="border-line bg-subtle text-ink-muted shrink-0 border-t px-4 py-3 text-center text-body"
        >
          {PEER_INACTIVE_TEXT}
        </p>
      ) : (
      <StaffComposer
        mentionCandidates={mentionCandidates}
        replyTo={replyTo}
        editing={editing}
        isSending={edit.isPending}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSubmit={(text) => enqueue(text, null, null)}
        onFile={(file, duration) => enqueue("", file, duration)}
        onEditSave={(text) =>
          editing ? edit.mutate({ id: editing.id, text }) : undefined
        }
        onTyping={(isTyping) =>
          sendOperatorCommand({
            action: "typing",
            channel_id: channel.id,
            is_typing: isTyping,
          })
        }
      />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Xabar o'chirilsinmi?"
        description="Xabar suhbatdan yo'qolmaydi — o'rnida «xabar o'chirildi» yozuvi qoladi."
        confirmLabel="O'chirish"
        isPending={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
      />
    </div>
  );
}

/** "Yangi xabarlar" — o'qilmaganlar shu chiziqdan boshlanadi. */
function NewMessagesDivider() {
  return (
    <div
      role="separator"
      aria-label="Yangi xabarlar"
      className="text-brand flex items-center gap-2 py-2 text-fine font-semibold"
    >
      <span aria-hidden className="bg-brand/40 h-px flex-1" />
      Yangi xabarlar
      <span aria-hidden className="bg-brand/40 h-px flex-1" />
    </div>
  );
}
