"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchStaffOrderChannel } from "@/features/staff-chat/api";
import { StaffChatRoom } from "@/features/staff-chat/components/staff-chat-room";
import { staffChatErrorMessage } from "@/features/staff-chat/error-hints";
import { useIsMobile } from "@/hooks/use-media-query";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { useUiStore } from "@/stores/ui-store";

/**
 * Panel qayerdan boshlanadi — yon panel yonidan.
 *
 * Karkas o'lchamlari (`PanelShell`, `AppSidebar`): yon panel suzuvchi
 * karta, chapdan 12px (`p-3 pr-0`) ichkarida, eni 68px (yig'ilgan) yoki
 * 264px; kontent ustuni esa undan keyin darhol boshlanadi. Shu sababli
 * chat yon panelning ustiga chiqmaydi — logist bo'limlarni ko'rib turadi
 * va muhokamadan chiqmasdan qayerdaligini biladi.
 */
const SHELL_PADDING = 12;
const SHELL_GAP = 0;
const SIDEBAR_WIDTH = { collapsed: 68, expanded: 264 };

/**
 * Buyurtma muhokamasi — **joyida** ochiladigan panel
 * (`STAFF_CHAT_FLUTTER.md` §1.1).
 *
 * Nega alohida bo'limga o'tkazilmaydi: muhokama ishning bir qismi, alohida
 * vazifa emas. Operator buyurtmani ko'rib turib savol yozadi va o'sha
 * zahoti ishiga qaytadi — bo'limga o'tish uni buyurtmalar ro'yxatidan
 * uzib qo'yardi va qaytish uchun qo'lda yo'l topish kerak bo'lardi.
 *
 * Panel **pastdan** chiqadi va ekranning deyarli hammasini egallaydi:
 * chat uzun lenta, unga bo'y kerak; o'ngdan chiqadigan tor panel esa
 * yozishmani ikki so'zli qatorlarga siqib qo'yardi.
 *
 * Kanal birinchi ochilganda yaratiladi — oldindan hech narsa qilinmaydi.
 */
export function OrderDiscussionSheet({
  orderId,
  client,
  onClose,
}: {
  /** `null` — panel yopiq. */
  orderId: string | null;
  /**
   * Buyurtma mijozi — sarlavhada asosiy o'rinni egallaydi.
   *
   * Kanal yuklamasida mijoz yo'q, shuning uchun uni buyurtmani ochgan
   * ekran beradi: u yerda buyurtma obyekti allaqachon qo'lda.
   */
  client?: { fullName: string; phone: string } | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  /*
   * O'lchamlar inline uslubda: `SheetContent` ning o'z joylashuv klasslari
   * (`inset-x-0`, `bottom-0`) variantlar ichida yozilgan va ularni Tailwind
   * klasslari bilan ustidan yozish kaskadga bog'liq bo'lib qolardi. Inline
   * uslub esa har doim ustun turadi.
   */
  const geometry: React.CSSProperties = isMobile
    ? { inset: 0, height: "auto" }
    : {
        top: 0,
        right: 0,
        bottom: 0,
        left:
          SHELL_PADDING +
          (collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded) +
          SHELL_GAP,
        height: "auto",
      };

  const channel = useQuery({
    queryKey: queryKeys.staffOrderChannel(orderId ?? ""),
    queryFn: ({ signal }) => fetchStaffOrderChannel(orderId as string, signal),
    enabled: orderId !== null,
    // Huquq yo'q bo'lsa qayta urinish behuda kutish.
    retry: false,
  });

  const title = client?.fullName
    ? `${client.fullName} — buyurtma muhokamasi`
    : "Buyurtma muhokamasi";

  return (
    <Sheet open={orderId !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        /*
          Yopish tugmasi xonaning o'z sarlavhasidagi tugmalar bilan
          urishardi (yangilash, "Buyurtma"), shuning uchun u o'chirilgan:
          yopish sarlavhaning chap chetidagi strelka bilan.
        */
        showCloseButton={false}
        style={geometry}
        className="flex flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none"
      >
        {/*
          Sarlavha ekranda emas: xonaning o'z sarlavhasi bor va u kanal
          nomini, buyurtma holatini va summasini ko'rsatadi. Bu esa
          skrinrider uchun.
        */}
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          Bu yozishma faqat xodimlar uchun — mijoz uni ko&apos;rmaydi.
        </SheetDescription>

        {/* Xona `h-full` bilan ishlaydi — unga aniq balandlik shu yerdan. */}
        <div className="min-h-0 flex-1">
          {orderId === null ? null : channel.isPending ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-10 w-3/5 rounded-2xl" />
              <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
              <Skeleton className="h-10 w-1/2 rounded-2xl" />
            </div>
          ) : channel.isError ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-danger max-w-sm text-center text-body">
                {staffChatErrorMessage(
                  channel.error,
                  "Muhokamani ochib bo'lmadi",
                )}
              </p>
            </div>
          ) : channel.data ? (
            <StaffChatRoom
              key={channel.data.id}
              channel={channel.data}
              client={client}
              onBack={onClose}
              backButton="always"
              focusMessageId={null}
            />
          ) : null}
        </div>

        {/*
          «Xodimlar chati» bo'limiga o'tish. U alohida katta bo'lim bo'lib
          qoladi: u yerda doimiy guruh va barcha buyurtma muhokamalari
          bitta ro'yxatda. Bu yerdan unga o'tish kamdan-kam kerak, shuning
          uchun havola pastda, kichik bo'lib turadi.
        */}
        {channel.data ? (
          <Link
            href={ROUTES.staffChat}
            className="border-line text-ink-faint hover:text-ink flex shrink-0 items-center justify-center gap-1.5 border-t py-2 text-fine transition-colors"
          >
            <ExternalLink className="size-3" />
            Xodimlar chati bo&apos;limi
          </Link>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
