"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { History, Menu, MessagesSquare, Search, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ActivityFeed } from "@/components/panel/activity-feed";
import { BrandLogo } from "@/components/brand-logo";
import { SceneBackdrop } from "@/components/fx/scene-backdrop";
import { AppSidebar } from "@/components/panel/app-sidebar";
import { CommandPalette } from "@/components/panel/command-palette";
import { PANEL_MAIN_ID } from "@/components/panel/main-scroll-memory";
import { NAV, isNavActive, type NavItem } from "@/components/panel/nav";
import { TopBar } from "@/components/panel/top-bar";
import { UserMenu } from "@/components/panel/user-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  applyCourierLocationEvent,
  applyCourierUpdatedEvent,
} from "@/features/couriers/realtime";
import { isOrdersBoard } from "@/features/orders/board";
import type { OrdersBoard } from "@/features/orders/board";
import { applyCourierMessageEvent, readEventEffect } from "@/features/orders/courier-messages";
import { useCourierInboxStore } from "@/stores/courier-inbox-store";
import { notifyCourierMessage } from "@/features/orders/courier-inbox";
import {
  changeRequestKindLabel,
  changeRequestStatusLabel,
} from "@/features/orders/change-request";
import { applyOrderEvent, eventActor } from "@/features/orders/realtime";
import { applyLeadStageEvent, applyPipelineOrderEvent } from "@/features/pipeline/realtime";
import { tagInfo } from "@/features/orders/tags";
import {
  attemptReasonLabel,
  confirmedByLabel,
  normalizeStatus,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/features/orders/types";
import type { LogistOrder, LogistOrderDetail } from "@/features/orders/types";
import { fetchStaffUnread } from "@/features/staff-chat/api";
import { useOrderDiscussionUnread } from "@/features/staff-chat/components/discussion-badge";
import {
  applyStaffBadge,
  applyStaffMessage,
  applyStaffMessageDeleted,
  applyStaffMessageUpdated,
  applyStaffChannelRead,
  applyStaffRead,
  applyStaffTyping,
  findStaffChannel,
} from "@/features/staff-chat/realtime";
import { useStaffLiveStore } from "@/features/staff-chat/store";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  sendOperatorCommand,
  useOperatorSocket,
} from "@/hooks/use-operator-socket";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useTabBadge } from "@/hooks/use-tab-badge";
import {
  playChime,
  requestNotificationPermission,
  showNotification,
} from "@/lib/alerts";
import { tr } from "@/lib/i18n/now";
import { asBool, asOptionalInt, asString, isRecord } from "@/lib/parse";
import type { SocketEvent } from "@/lib/reconnecting-socket";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useActivityStore, useUnseenActivityCount } from "@/stores/activity-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBadgeStore } from "@/stores/badge-store";
import { useRemindersStore } from "@/stores/reminders-store";
import { isQuietNow, useUiStore } from "@/stores/ui-store";
import { isDuplicateWsEvent } from "@/lib/ws-dedupe";

/**
 * Panel karkasi — barcha logist sahifalari uchun umumiy.
 *
 *   < 768px  → tepada panel + surilma menyu + pastki navigatsiya
 *   >= 768px → chapda yon panel (yig'iladigan)
 *
 * Shu yerda real vaqt ham yashaydi: operator soketi, yangi buyurtma/transfer
 * hisoblagichlari va ish stoli signallari.
 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const pathname = usePathname();

  const refreshEverything = useCallback(() => {
    void queryClient.invalidateQueries();
  }, [queryClient]);

  useShortcuts({ onRefresh: refreshEverything });
  useRealtime({ enabled: online });
  useReminderTicker();
  useTabBadge();

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Yon panel: ikonka + nom; ⌘B yoki tugma bilan ikonkagacha yig'iladi. */}
      <div className="hidden shrink-0 md:flex">
        <AppSidebar />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Bo'lim sahnasi — kontent ostida, bosishga sezgir emas (Tungi yo'l). */}
        <SceneBackdrop />

        {!online ? <OfflineBanner /> : null}

        <MobileTopBar />
        <TopBar />

        <main
          id={PANEL_MAIN_ID}
          className="relative min-w-0 flex-1 overflow-y-auto overscroll-contain pb-16 md:pb-0"
        >
          {/* `key` — marshrut o'zgarganda kirish animatsiyasi qaytadan o'ynaydi. */}
          <div key={pathname} className="section-enter h-full">
            {children}
          </div>
        </main>

        <MobileBottomNav />
      </div>

      <CommandPalette />
      <ActivityFeed />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Real vaqt: soket hodisalari + signallar
// ─────────────────────────────────────────────────────────────────────────────

function useRealtime({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const soundEnabled = useUiStore((state) => state.soundEnabled);
  const alertsEnabled = useUiStore((state) => state.desktopAlertsEnabled);
  const incrementOrders = useBadgeStore((state) => state.incrementOrders);
  const clearOrders = useBadgeStore((state) => state.clearOrders);
  const incrementTransfers = useBadgeStore((state) => state.incrementTransfers);
  const clearTransfers = useBadgeStore((state) => state.clearTransfers);

  // Bildirishnoma ruxsatini oldindan so'raymiz — birinchi hodisa kelganda
  // emas, panel ochilganidayoq tayyor bo'lsin.
  useEffect(() => {
    if (alertsEnabled) void requestNotificationPermission();
  }, [alertsEnabled]);

  // Bo'lim ochilganda tegishli hisob nolga tushadi.
  useEffect(() => {
    if (isNavActive(pathname, ROUTES.orders)) clearOrders();
    if (isNavActive(pathname, ROUTES.transfers)) clearTransfers();
  }, [pathname, clearOrders, clearTransfers]);

  /**
   * Logist ishi boshlanadigan ikki hodisa: `confirmed` buyurtma tushdi yoki
   * mijoz ilovada tasdiqladi (`02` §3.1). Badge, ovoz va ish stoli
   * bildirishnomasi bir xil — faqat matn farq qiladi.
   */
  const notifyNewOrder = useCallback(
    (orderId: string, kind: "created" | "confirmed" | "client_confirmed") => {
      const copy =
        kind === "client_confirmed"
          ? {
              title: "Mijoz buyurtmani tasdiqladi 🎉",
              body: "Buyurtma tasdiqlandi — yo'lga chiqarish mumkin",
              tag: "order-confirmed",
            }
          : kind === "confirmed"
          ? {
              title: "Buyurtma tasdiqlandi",
              body: "Buyurtma tasdiqlandi — yo'lga chiqarish mumkin",
              tag: "order-confirmed",
            }
          : {
              title: "Yangi buyurtma tushdi",
              body: "Yetkazish uchun yangi buyurtma tushdi",
              tag: "new-order",
            };
      const href = orderId ? ROUTES.orderDetail(orderId) : ROUTES.orders;

      toast.info(copy.title, {
        action: orderId
          ? { label: "Ochish", onClick: () => router.push(href) }
          : undefined,
      });
      if (soundEnabled && !isQuietNow()) playChime();
      if (alertsEnabled) {
        // Bildirishnoma DOM emas — `LocaleProvider` unga yetmaydi.
        showNotification({
          title: tr(copy.title),
          body: tr(copy.body),
          tag: copy.tag,
          onClick: () => router.push(href),
        });
      }
    },
    [router, soundEnabled, alertsEnabled],
  );

  const notifyIncomingOrderTransfer = useCallback(() => {
    toast.warning("Boshqa filial buyurtma taklif qildi", {
      duration: 8000,
      action: {
        label: "Ko'rish",
        onClick: () => router.push(ROUTES.transfers),
      },
    });
    if (soundEnabled && !isQuietNow()) playChime();
    if (alertsEnabled) {
      showNotification({
        title: tr("Buyurtma taklifi"),
        body: tr("Kiruvchi buyurtma javobingizni kutmoqda"),
        tag: "order-transfer",
        onClick: () => router.push(ROUTES.transfers),
      });
    }
  }, [router, soundEnabled, alertsEnabled]);

  /**
   * Kuryer eshikda tarkibni o'zgartirishni so'radi — u mijoz oldida kutadi
   * va so'rov yopilmaguncha buyurtmani yakunlay olmaydi. Shuning uchun
   * signal sokin soatlarda ham toast bilan chiqadi.
   */
  const notifyChangeRequest = useCallback(
    (orderId: string, orderNumber: string) => {
      const title = "Kuryer o'zgarish so'radi";
      const href = orderId ? ROUTES.orderDetail(orderId) : ROUTES.orders;
      toast.warning(title, {
        description: orderNumber ? <span data-no-translit>{`#${orderNumber}`}</span> : undefined,
        duration: 12_000,
        action: orderId ? { label: "Ochish", onClick: () => router.push(href) } : undefined,
      });
      if (soundEnabled && !isQuietNow()) playChime();
      if (alertsEnabled) {
        showNotification({
          title: tr(title),
          body: tr("Kuryer mijoz oldida javobingizni kutmoqda"),
          tag: `change-request-${orderId}`,
          onClick: () => router.push(href),
        });
      }
    },
    [router, soundEnabled, alertsEnabled],
  );

  useOperatorSocket({
    enabled,
    onReconnect: () => {
      // Uzilib turgan vaqtdagi hodisalar takrorlanmaydi — hammasini
      // qaytadan yuklaymiz.
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["couriers"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incomingOrderTransfers,
      });
      void queryClient.invalidateQueries({ queryKey: ["staff-chat"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["stops"] });

      /*
       * Chat obunasi soket bilan birga uzilgan (`LOGIST_CHAT_FLUTTER.md`
       * §4) — ochiq kanalga qaytadan yoziladi, aks holda xona jimib
       * qolardi va logist yangilashga majbur bo'lardi.
       */
      const openChannel = useStaffLiveStore.getState().openChannelId;
      if (openChannel !== null) {
        sendOperatorCommand({ action: "subscribe", channel_id: openChannel });
      }
    },
    onEvent: (type, payload) => {
      // Filial + bo'lim guruhidan bir xil lid hodisasi ikki marta keladi (B6).
      if (isDuplicateWsEvent(type, payload)) return;
      // Bosh kuryer sahifalari (ochiq bo'lsa) zakaz hodisasida yangilanadi.
      if (type.startsWith("order_") || type === "zone_updated") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chief,
          refetchType: "active",
          // Rol so'rovi faqat bosh kuryerda yangilanadi — oddiy logistda har
          // hodisada `403` qaytarib turmasin.
          predicate: (query) => query.queryKey[1] !== "me" || query.state.data !== undefined,
        });
      }
      // Har hodisa harakatlar lentasiga tushadi — kim nima qilgani ko'rinsin.
      recordActivity(queryClient, type, payload);
      /*
       * Panel ochiq bo'lsa server jurnali ham yangilanadi (§4.11) — faqat
       * jurnalga tushadigan hodisalarda. `staff_typing`, `presence`,
       * `timeline_event` kabi tez-tez keladiganlar uni qayta-qayta
       * so'ratmasin.
       */
      if (ACTIVITY_TYPES.has(type)) void refreshActivityJournal(queryClient);

      switch (type) {
        // Kuryer bilan chat (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.8).
        case "order_message_created":
        case "order_messages_read": {
          applyCourierMessageEvent(queryClient, type, payload);
          // Boshqa tab/logist o'qidi va server "0 qoldi" dedi — belgi tushadi.
          if (type === "order_messages_read" && readEventEffect(payload).clearInbox) {
            const readOrderId = typeof payload.order_id === "string" ? payload.order_id : "";
            if (readOrderId) useCourierInboxStore.getState().clear(readOrderId);
          }
          if (type === "order_message_created") {
            const notice = notifyCourierMessage(queryClient, payload, (id) =>
              router.push(ROUTES.orderDetail(id)),
            );
            if (notice) {
              if (soundEnabled && !isQuietNow()) playChime();
              // Panel boshqa oynada bo'lsa ham logist bilsin.
              if (alertsEnabled && document.hidden) {
                showNotification({
                  title: notice.title,
                  body: notice.body,
                  tag: `courier-message-${notice.orderId}`,
                  onClick: () => router.push(ROUTES.orderDetail(notice.orderId)),
                });
              }
            }
          }
          break;
        }

        case "order_created": {
          applyOrderEvent(queryClient, type, payload);

          /*
           * Faqat `confirmed` buyurtma logist ishini boshlaydi (§6.4) —
           * signal ham shunga chiqadi. Buyurtmalar bo'limi ochiq ko'rinib
           * turgan bo'lsa badge oshirilmaydi: karta ekranda o'zi paydo
           * bo'ladi.
           */
          const status = normalizeStatus(asString(payload.status));
          if (status === "confirmed" || asString(payload.status) === "") {
            if (!isViewingPath(ROUTES.orders)) incrementOrders();
            notifyNewOrder(asString(payload.order_id), "created");
          }
          break;
        }

        case "order_confirmed": {
          /*
           * Tasdiq (§5.4) — `order_status_changed` ga QO'SHIMCHA, kim
           * tasdiqlaganini aytadi. Onlayn to'lov tanlanganda buyurtma
           * `pending` da qoladi — logist ishi yo'q, signal ham chiqmaydi.
           */
          applyOrderEvent(queryClient, type, payload);
          const rawStatus = asString(payload.status);
          if (rawStatus && normalizeStatus(rawStatus) !== "confirmed") break;
          if (!isViewingPath(ROUTES.orders)) incrementOrders();
          notifyNewOrder(
            asString(payload.order_id),
            asString(payload.by) === "client" ? "client_confirmed" : "confirmed",
          );
          break;
        }

        // Eshikdagi o'zgarish so'rovi (`LOGIST_02` §2) — kuryer mijoz oldida kutmoqda.
        case "order_change_requested": {
          applyOrderEvent(queryClient, type, payload);
          notifyChangeRequest(asString(payload.order_id), asString(payload.order_number));
          break;
        }

        case "order_change_request_resolved": {
          applyOrderEvent(queryClient, type, payload);
          break;
        }

        // Bitrix oqimi: karta bo'limdan bo'limga o'tdi (`LOGIST_01` §5).
        case "lead_stage_changed": {
          applyLeadStageEvent(queryClient, payload);
          break;
        }

        // 24 soat o'tdi — «Yetkazildi» dagi karta Bazaga (B4, `lead_handover`).
        case "lead_handover": {
          applyLeadStageEvent(queryClient, { ...payload, from_stage: "delivery", to_stage: "base" });
          break;
        }

        case "order_acknowledged": {
          // "Oldim" — boshqa logist buyurtmani oldi: karta joyida yamaladi.
          applyOrderEvent(queryClient, type, payload);
          break;
        }

        case "order_payment_changed": {
          // To'lov o'qi jonli (§5.7) — kartochka joyida yamaladi. Eshikdagi
          // onlayn to'lov (§2.4b) lentada: ochiq detal belgisi yangilanadi.
          applyOrderEvent(queryClient, type, payload);
          const paidOrderId = asString(payload.order_id);
          if (paidOrderId) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.orderTimeline(paidOrderId),
            });
          }
          break;
        }

        case "timeline_event": {
          // Ochiq detalning tarixi yangilanadi; yopiq bo'lsa so'rov yo'q.
          const orderId = asString(
            payload.order_id ??
              (isRecord(payload.event) ? payload.event.order_id : undefined),
          );
          if (orderId) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.orderTimeline(orderId),
              refetchType: document.hidden ? "none" : "active",
            });
          }
          break;
        }

        case "order_status_changed":
        case "order_updated":
        case "order_courier_assigned":
        case "order_delivery_attempt":
        case "order_tags_changed": {
          // Doska keshi joyida to'g'rilanadi; ro'yxatlar eskirgan deb
          // belgilanadi — batafsili `orders/realtime.ts` da.
          applyOrderEvent(queryClient, type, payload);
          // Dostavka doskasida shu buyurtma turgan BITTA lid kartasi yamaladi.
          applyPipelineOrderEvent(queryClient, type, payload);
          // To'xtashlar kuryer/status bilan o'zgaradi — faqat ochiq ekranda so'raladi.
          void queryClient.invalidateQueries(
            { queryKey: ["stops"], refetchType: document.hidden ? "none" : "active" },
            { cancelRefetch: false },
          );
          break;
        }

        // Zonalar bo'yicha taqsimlash (2026-10-15) — kartalar joyida yamaladi.
        case "order_suggestion":
        case "order_auto_assigned": {
          applyOrderEvent(queryClient, type, payload);
          break;
        }

        case "order_zone_mismatch": {
          applyOrderEvent(queryClient, type, payload);
          const mismatchId = asString(payload.order_id);
          toast.warning("Kuryer buyurtma zonasidan emas", {
            description: "Biriktirish bajarildi — zonani tekshiring",
            action: mismatchId
              ? {
                  label: "Ochish",
                  onClick: () => router.push(ROUTES.orderDetail(mismatchId)),
                }
              : undefined,
          });
          break;
        }

        // Kuryer joylashuvi (§7.2) — faqat kesh yamog'i, jurnalga tushmaydi.
        case "courier_location": {
          applyCourierLocationEvent(queryClient, payload);
          break;
        }

        // Kuryer profili (§8.2) — rasm almashdi: marker va kartalar joyida.
        case "courier_updated": {
          applyCourierUpdatedEvent(queryClient, payload);
          break;
        }

        case "zone_updated": {
          // Zona nomi yoki tumanlari o'zgardi — zonalar va kuryerlarning
          // zona ro'yxati qayta olinadi. Buyurtma kartalari o'z hodisasi
          // (`order_updated`) bilan keladi — butun doska qayta so'ralmaydi.
          void queryClient.invalidateQueries({ queryKey: ["zones"] });
          void queryClient.invalidateQueries({ queryKey: ["couriers"] });
          break;
        }

        case "order_comment_added": {
          // Izohlar alohida keshda — buyurtma kartasi o'zgarmaydi (§4.10).
          const orderId = asString(payload.order_id);
          if (orderId) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.orderComments(orderId),
            });
          }
          break;
        }

        // ── Xodimlar chati (`LOGIST_CHAT_FLUTTER.md` §4) ──────────────────

        // Jamoa chati (§1 HUDUD_4): server alohida nom bilan yuborsa ham — o'sha oqim.
        case "team_message":
        case "direct_message":
        case "staff_message": {
          const message = applyStaffMessage(queryClient, payload);
          if (!message) {
            void queryClient.invalidateQueries({ queryKey: ["staff-chat"] });
            break;
          }

          /*
           * Ogohlantirish — faqat begona xabar va faqat kanal ochiq
           * bo'lmaganda. Chat kun bo'yi ishlaydi: har xabarda jiringlatish
           * signalni ma'nosiz qiladi, ekranda ko'rinmayotgani yetarli sabab.
           */
          if (message.isMine || isViewingStaffChannel(message.channelId)) {
            break;
          }

          const channel = findStaffChannel(queryClient, message.channelId);
          const staffHref = `${ROUTES.staffChat}?channel=${message.channelId}`;
          // Buyurtma chati — mijoz ismi bilan (`order.client`, 2026-10-01 C §13.3).
          const client = channel?.order?.client ?? null;
          const title =
            channel?.peer?.fullName ||
            client?.fullName ||
            channel?.title ||
            tr("Xodimlar chati");
          const body = `${
            message.sender?.fullName ? `${message.sender.fullName}: ` : ""
          }${message.text || tr("Media xabar")}`;

          toast.info(<span data-no-translit>{title}</span>, {
            description: <span data-no-translit>{body}</span>,
            action: {
              label: "Ochish",
              onClick: () => router.push(staffHref),
            },
          });

          if (soundEnabled && !isQuietNow()) playChime();
          if (alertsEnabled) {
            showNotification({
              title,
              body,
              // Kanal bo'yicha guruhlanadi — ketma-ket xabarlar to'planmaydi.
              tag: `staff-${message.channelId}`,
              onClick: () => router.push(staffHref),
            });
          }
          break;
        }

        case "staff_message_updated": {
          applyStaffMessageUpdated(payload);
          break;
        }

        case "staff_message_deleted": {
          applyStaffMessageDeleted(payload);
          break;
        }

        case "courier_addresses_changed": {
          // Logist yakunlangan zakazda manzil sonini o'zgartirdi (§2.3b).
          void queryClient.invalidateQueries({ queryKey: ["statistics"] });
          break;
        }

        case "member_added":
        case "member_removed": {
          // Zakaz chati a'zoligi (2026-10-30 §3) — ochiq ro'yxat yangilansin.
          const channelId = asOptionalInt(payload.channel_id);
          if (channelId !== null) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.staffChatMembers(channelId) });
            void queryClient.invalidateQueries({ queryKey: ["staff-chat", "candidates", channelId] });
          }
          break;
        }

        case "staff_read": {
          // Kimdir o'qidi — o'z xabarlarimizdagi ✓✓ darhol yonadi.
          applyStaffRead(payload);
          break;
        }

        case "staff_channel_read": {
          // Jamoa/lichka: ✓✓ yoki (o'zimiz boshqa tabda o'qisak) hisob nolga.
          applyStaffChannelRead(queryClient, payload);
          break;
        }

        case "staff_typing": {
          applyStaffTyping(payload);
          break;
        }

        case "staff_badge": {
          // Ochiq bo'lmagan kanal — doskadagi va yon paneldagi raqam oshadi.
          applyStaffBadge(queryClient, payload);
          break;
        }

        case "staff_subscribe_denied": {
          /*
           * Huquq yo'q — kanal yopilishi kerak (§4). Yopish ekranning ishi
           * (manzil qatorini u boshqaradi): bu yerda faqat belgi qo'yiladi,
           * ro'yxat esa eskirgan hisoblanadi — kanal unga ham tushmaydi.
           */
          const denied = asOptionalInt(payload.channel_id);
          if (denied !== null) {
            useStaffLiveStore.getState().setDeniedChannel(denied);
          }
          void queryClient.invalidateQueries({ queryKey: ["staff-chat"] });
          break;
        }

        case "order_transfer_requested": {
          applyOrderEvent(queryClient, type, payload);
          void refreshTransfers(queryClient);
          void queryClient.invalidateQueries({
            queryKey: queryKeys.incomingOrderTransfers,
          });

          /*
           * Hodisa **ikkala** filialga boradi (§4.9). Yuboruvchi tomonda
           * signal chalinmaydi — u so'rovni o'zi qilgan; qabul qiluvchi
           * tomonda esa bu javob kutayotgan yangi ish.
           */
          if (!isOwnFilial(payload.from_filial_id)) {
            if (!isViewingPath(ROUTES.transfers)) incrementTransfers();
            notifyIncomingOrderTransfer();
          }
          break;
        }

        case "order_transfer_resolved": {
          applyOrderEvent(queryClient, type, payload);
          void refreshTransfers(queryClient);
          void queryClient.invalidateQueries({
            queryKey: queryKeys.incomingOrderTransfers,
          });
          break;
        }

        case "transfer_created": {
          void refreshTransfers(queryClient);
          if (asString(payload.direction_hint) === "incoming") {
            if (!isViewingPath(ROUTES.transfers)) incrementTransfers();
            toast.info("Yangi filiallararo zakaz tushdi");
            if (soundEnabled && !isQuietNow()) playChime();
            if (alertsEnabled) {
              showNotification({
                title: tr("Filiallararo zakaz"),
                body: tr("Yangi kiruvchi zakaz javob kutmoqda"),
                tag: "new-transfer",
                onClick: () => router.push(ROUTES.transfers),
              });
            }
          }
          break;
        }

        case "transfer_status_changed": {
          void refreshTransfers(queryClient);
          break;
        }

        // Sklad (`18_SKLAD…` §10): bitta hodisa — bo'lim keshini eskirgan
        // deb belgilaymiz; burst'da TanStack o'zi bitta qayta so'rovga
        // yig'adi (faol so'rovlar 30 s ichida bir marta yangilanadi).
        case "stock_changed":
        case "document_created":
        case "courier_stock_changed":
        case "grant_changed": {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sklad });
          break;
        }

        default: {
          // Notanish hodisa — xavfsiz zaxira: tegishli bo'lim eskirgan
          // deb belgilanadi (§6.4 fallback qoidasi).
          if (type.startsWith("order")) {
            applyOrderEvent(queryClient, type, payload);
          } else if (type.startsWith("staff_")) {
            void queryClient.invalidateQueries({ queryKey: ["staff-chat"] });
          }
          break;
        }
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Eslatmalar tekshiruvchisi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Har 20 soniyada vaqti kelgan eslatmalarni tekshiradi: toast + desktop
 * bildirishnoma + (sokin soatlardan tashqarida) qisqa signal. Yonib bo'lgan
 * eslatma `fired` bo'ladi — sahifa yangilansa ham qayta jiringlamaydi.
 */
function useReminderTicker() {
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      const { list, markFired } = useRemindersStore.getState();
      const now = new Date().toISOString();

      for (const reminder of list) {
        if (reminder.fired || reminder.at > now) continue;
        markFired(reminder.id);

        const body = reminder.note || tr("Eslatma vaqti keldi");
        const href = ROUTES.orderDetail(reminder.orderId);
        toast.info(<span data-no-translit>{`⏰ ${reminder.orderNumber}: ${body}`}</span>, {
          duration: 10_000,
          action: { label: "Ochish", onClick: () => router.push(href) },
        });

        const { soundEnabled, desktopAlertsEnabled } = useUiStore.getState();
        if (soundEnabled && !isQuietNow()) playChime();
        if (desktopAlertsEnabled) {
          showNotification({
            title: `${tr("Eslatma")} — ${reminder.orderNumber}`,
            body,
            tag: `reminder-${reminder.id}`,
            onClick: () => router.push(href),
          });
        }
      }
    };

    check();
    const timer = setInterval(check, 20_000);
    return () => clearInterval(timer);
  }, [router]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Harakatlar lentasiga yozish
// ─────────────────────────────────────────────────────────────────────────────

/** Lentaga tushadigan hodisalar — qolganlari (masalan lead_*) e'tiborsiz. */
const ACTIVITY_TYPES = new Set([
  "order_created",
  "order_confirmed",
  "order_payment_changed",
  "order_status_changed",
  "order_courier_assigned",
  "order_delivery_attempt",
  "order_tags_changed",
  "order_comment_added",
  "transfer_created",
  "transfer_status_changed",
  "order_transfer_requested",
  "order_transfer_resolved",
  "order_change_requested",
  "order_change_request_resolved",
]);

/**
 * WS hodisasini lenta yozuviga aylantiradi. Buyurtma raqami keshdan
 * qidiriladi (doska/detal) — lentada UUID emas, odam o'qiydigan raqam tursin.
 */
function recordActivity(
  queryClient: QueryClient,
  type: string,
  payload: SocketEvent,
) {
  if (!ACTIVITY_TYPES.has(type)) return;

  const orderId = asString(payload.order_id) || null;
  const courier = isRecord(payload.courier) ? payload.courier : null;

  let note: string | null = null;
  if (type === "order_courier_assigned" && courier) {
    note = asString(courier.full_name ?? courier.name) || null;
  } else if (type === "order_confirmed") {
    note =
      [
        confirmedByLabel(asString(payload.by)),
        paymentMethodLabel(asString(payload.payment_method)),
      ]
        .filter(Boolean)
        .join(" · ") || null;
  } else if (type === "order_payment_changed") {
    // `from_status`/`to_status` bu yerda TO'LOV holati (§5.7).
    const from = paymentStatusLabel(asString(payload.from_status));
    const to = paymentStatusLabel(asString(payload.to_status));
    note = from && to ? `${from} → ${to}` : to || null;
  } else if (type === "order_delivery_attempt") {
    const reason = asString(payload.reason);
    note = reason ? attemptReasonLabel(reason) : null;
  } else if (type === "transfer_created") {
    note =
      asString(payload.direction_hint) === "incoming"
        ? "Kiruvchi — javob kutmoqda"
        : null;
  } else if (type === "order_transfer_resolved") {
    note = asBool(payload.accepted)
      ? "Filial qabul qildi"
      : "Filial rad etdi";
  } else if (type === "order_change_requested") {
    const request = isRecord(payload.request) ? payload.request : null;
    note = request ? changeRequestKindLabel(asString(request.kind)) : null;
  } else if (type === "order_change_request_resolved") {
    const status = asString(payload.status ?? (isRecord(payload.request) ? payload.request.status : ""));
    note = status ? changeRequestStatusLabel(status) : null;
  } else if (type === "order_tags_changed") {
    const tags = Array.isArray(payload.tags)
      ? payload.tags.map((tag) => tagInfo(asString(tag)).label)
      : [];
    note = tags.length ? tags.join(", ") : "teglar tozalandi";
  }

  useActivityStore.getState().record({
    type,
    orderId,
    // 2026-10-01 dan hodisalarning o'zida `order_number` bor (§6); keshdan — zaxira.
    orderNumber:
      asString(payload.order_number) || (orderId ? findOrderNumber(queryClient, orderId) : null),
    transferId: asOptionalInt(payload.transfer_id),
    actor: eventActor(payload),
    // To'lov hodisasida `*_status` — to'lov holati, buyurtma statusi emas.
    fromStatus:
      type === "order_payment_changed"
        ? null
        : asString(payload.from_status) || null,
    toStatus:
      type === "order_payment_changed"
        ? null
        : asString(payload.to_status ?? payload.status) || null,
    note,
  });
}

/** Buyurtma raqamini doska/detal keshidan topadi; topilmasa `null`. */
function findOrderNumber(
  queryClient: QueryClient,
  orderId: string,
): string | null {
  const detail = queryClient.getQueryData<LogistOrderDetail>(
    queryKeys.orderDetail(orderId),
  );
  if (detail?.order.orderNumber) return detail.order.orderNumber;

  const boards = queryClient.getQueriesData<OrdersBoard<LogistOrder>>({
    queryKey: ["orders", "board"],
  });
  for (const [, board] of boards) {
    if (!isOrdersBoard(board)) continue;
    for (const column of board.columns) {
      const order = column.orders.find((item) => item.id === orderId);
      if (order?.orderNumber) return order.orderNumber;
    }
  }
  return null;
}

/**
 * Server jurnalini (§4.11) yangilaydi.
 *
 * `refetchType: "active"` — so'rov faqat lenta paneli ochiq turganda faol
 * bo'ladi, ya'ni yopiq panelda hech qanday tarmoq harakati bo'lmaydi.
 */
function refreshActivityJournal(queryClient: QueryClient) {
  const hidden = typeof document !== "undefined" && document.hidden;
  return queryClient.invalidateQueries({
    queryKey: queryKeys.activity,
    refetchType: hidden ? "none" : "active",
  });
}

/** Hodisadagi filial — bizniki (ya'ni biz yuboruvchimiz)mi. */
function isOwnFilial(value: unknown): boolean {
  const filialId = useAuthStore.getState().user?.filialId ?? null;
  const eventFilialId = asOptionalInt(value);
  return (
    filialId !== null && eventFilialId !== null && filialId === eventFilialId
  );
}

/** Transfer keshlarini yangilaydi — fon oynada so'rov yubormasdan. */
function refreshTransfers(queryClient: ReturnType<typeof useQueryClient>) {
  const hidden = typeof document !== "undefined" && document.hidden;
  return queryClient.invalidateQueries({
    queryKey: ["transfers"],
    refetchType: hidden ? "none" : "active",
  });
}

/** Logist ayni shu bo'limni ochiq ko'rib turibdimi. */
/**
 * Xodimlar chatining shu kanali ochiq ko'rinib turibdimi.
 *
 * Ochiq kanalni do'kon biladi (xona uni yozib qo'yadi), lekin sahifa fonda
 * qolgan bo'lishi ham mumkin — shunda ogohlantirish baribir kerak.
 */
function isViewingStaffChannel(channelId: number): boolean {
  if (typeof window === "undefined" || document.hidden) return false;
  return useStaffLiveStore.getState().openChannelId === channelId;
}

function isViewingPath(route: string): boolean {
  if (typeof window === "undefined" || document.hidden) return false;
  return isNavActive(window.location.pathname.replace(/\/$/, "") || "/", route);
}

// ─────────────────────────────────────────────────────────────────────────────

function OfflineBanner() {
  return (
    <div
      role="status"
      className="bg-warn-soft text-warn relative flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-dense font-medium"
    >
      <WifiOff className="size-4 shrink-0" />
      Internet aloqasi yo&apos;q — ma&apos;lumotlar yangilanmayapti
    </div>
  );
}

function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const openActivity = useActivityStore((state) => state.setOpen);
  const unseen = useUnseenActivityCount();

  return (
    <header className="bg-rail relative flex h-14 shrink-0 items-center gap-1 px-2 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Menyu"
          className="text-rail-ink hover:bg-rail-hover rounded-lg p-2 transition-colors"
        >
          <Menu className="size-5" />
        </SheetTrigger>

        <SheetContent
          side="left"
          showCloseButton={false}
          aria-describedby={undefined}
          className="bg-rail w-[264px] border-none p-0"
        >
          <SheetTitle className="sr-only">Asosiy menyu</SheetTitle>
          <AppSidebar forceExpanded onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href={ROUTES.home} className="flex min-w-0 items-center gap-2 px-1">
        <BrandLogo size={32} className="size-7 rounded-lg" />
        <span className="text-rail-ink truncate text-lg2 font-semibold">
          Mehrigiyo Bosh kuryer
        </span>
      </Link>

      <div className="flex-1" />

      <button
        type="button"
        aria-label="Harakatlar lentasi"
        onClick={() => openActivity(true)}
        className="text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink relative rounded-lg p-2 transition-colors"
      >
        <History className="size-5" />
        {unseen > 0 ? (
          <span className="bg-danger ring-rail absolute top-1 right-1 size-2.5 rounded-full ring-2" />
        ) : null}
      </button>

      <button
        type="button"
        aria-label="Qidirish"
        onClick={() =>
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true }),
          )
        }
        className="text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink rounded-lg p-2 transition-colors"
      >
        <Search className="size-5" />
      </button>

      <UserMenu variant="compact" />
    </header>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  // Pastki menyuga eng ko'p ishlatiladigan oltitasi sig'adi (statistika — railda).
  const items = NAV.slice(0, 6);

  return (
    <nav
      aria-label="Asosiy menyu"
      className="border-line glass-chrome fixed inset-x-0 bottom-0 z-30 flex h-16 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => (
        <BottomNavItem
          key={item.href}
          item={item}
          active={isNavActive(pathname, item.href)}
        />
      ))}
    </nav>
  );
}

function BottomNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const newOrders = useBadgeStore((state) => state.newOrders);
  const incomingTransfers = useBadgeStore((state) => state.incomingTransfers);
  const orderDiscussion = useOrderDiscussionUnread();
  const staffUnread = useQuery({
    queryKey: queryKeys.staffUnread,
    queryFn: ({ signal }) => fetchStaffUnread(signal),
    enabled: item.badge === "staff",
    refetchInterval: 60_000,
  });

  const count =
    item.badge === "orders"
      ? newOrders
      : item.badge === "transfers"
        ? incomingTransfers
        : item.badge === "staff"
          ? (staffUnread.data?.unread ?? 0)
          : 0;
  // Muhokamada javob kutilmoqda — raqam emas, xabar belgisi (§3).
  const discussion = item.badge === "orders" && orderDiscussion > 0;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="group relative flex flex-1 flex-col items-center justify-center gap-1"
    >
      <span
        aria-hidden
        className={cn(
          "bg-brand absolute top-0 h-0.5 w-10 rounded-b-full transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />

      <span className="relative">
        <item.Icon
          className={cn(
            "size-[22px] transition-colors",
            active ? "text-brand" : "text-ink-faint",
          )}
        />
        {count > 0 ? (
          <span className="bg-danger ring-surface tabular absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-fine font-bold text-white ring-2">
            {count > 9 ? "9+" : count}
          </span>
        ) : discussion ? (
          <MessagesSquare
            aria-label="Muhokamada yangi xabar"
            className="text-brand ring-surface bg-surface absolute -top-1.5 -right-2 size-3.5 rounded-full ring-2"
          />
        ) : null}
      </span>

      <span
        className={cn(
          "text-fine transition-colors",
          active ? "text-brand font-semibold" : "text-ink-faint",
        )}
      >
        {item.shortLabel}
      </span>
    </Link>
  );
}
