"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { formatDeliveryAddress } from "@/features/orders/address";
import { playUrgentAlarm, requestNotificationPermission, setTitleAlert, showNotification, unlockAudio } from "@/lib/alerts";
import { translateText } from "@/lib/i18n/translate";
import { ROUTES } from "@/lib/routes";
import { useLocaleStore } from "@/stores/locale-store";

import { shortOrderNumber } from "./order-view";
import { alarmDue, awaitsAck, freshUnacked } from "./urgent";
import type { UrgentBoard, UrgentOrder } from "./urgent";

/** Signal vaqti shu oraliqda tekshiriladi — fon tabda brauzer taymerni sekinlatsa ham kechikmaydi. */
const ALARM_TICK_MS = 5_000;

const NO_ORDERS: UrgentOrder[] = [];

/** Zakaz detali `?order=` bilan «Zakazlar» sahifasida ochiladi. */
export function urgentOrderHref(orderId: string): string {
  return `${ROUTES.orders}?order=${encodeURIComponent(orderId)}`;
}

/**
 * Tasdiqlanmagan shoshilinch zakaz signallari (hujjat 123 §4): yangi kelganda
 * darhol, keyin «Qabul qildim» bosilguncha takror; tab sarlavhasida belgi; tab
 * ko'rinmayotgan bo'lsa brauzer bildirishnomasi (har zakazga bir marta).
 * Butun saytda bir marta ulanadi (`UrgentBanner`). `board: null` — server
 * funksiyani bilmaydi: hech narsa qilinmaydi, ruxsat ham so'ralmaydi.
 */
export function useUrgentAlarm(board: UrgentBoard | null) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const supported = board !== null;
  const orders = board?.orders ?? NO_ORDERS;
  const unacked = useMemo(() => orders.filter(awaitsAck), [orders]);
  const known = useRef<ReadonlySet<string>>(new Set());
  const lastRangAt = useRef<number | null>(null);

  // Brauzer ovozni va ruxsat so'rovini faqat foydalanuvchi bosganidan keyin ochadi.
  useEffect(() => {
    if (!supported) return;
    const unlock = () => {
      unlockAudio();
      requestNotificationPermission();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [supported]);

  // Yangi tasdiqlanmagan zakaz — darhol signal; tab ko'rinmasa bildirishnoma.
  useEffect(() => {
    const fresh = freshUnacked(known.current, unacked);
    known.current = new Set(unacked.map((order) => order.id));
    if (fresh.length === 0) return;
    playUrgentAlarm();
    lastRangAt.current = Date.now();
    if (!document.hidden) return;
    for (const order of fresh) {
      showNotification({
        title: translateText("Shoshilinch zakaz", locale),
        body: [`#${shortOrderNumber(order.orderNumber)}`, formatDeliveryAddress(order), order.urgent.reason]
          .filter(Boolean)
          .join(" · "),
        tag: `urgent-${order.id}`,
        onClick: () => router.push(urgentOrderHref(order.id)),
      });
    }
  }, [unacked, locale, router]);

  // «Qabul qildim» bosilguncha signal takrorlanadi va sarlavha belgisi turadi.
  const pending = unacked.length;
  useEffect(() => {
    if (pending === 0) return;
    const title = translateText(`Shoshilinch: ${pending}`, locale);
    setTitleAlert(title);
    const timer = setInterval(() => {
      // Sahifa almashganda Next sarlavhani qayta yozishi mumkin — belgi qaytariladi.
      setTitleAlert(title);
      const now = Date.now();
      if (!alarmDue(pending, lastRangAt.current, now)) return;
      playUrgentAlarm();
      lastRangAt.current = now;
    }, ALARM_TICK_MS);
    return () => {
      clearInterval(timer);
      setTitleAlert(null);
    };
  }, [pending, locale, pathname]);
}
