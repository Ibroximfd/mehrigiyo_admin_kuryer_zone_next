"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { wsUrl } from "@/lib/api-constants";
import { openReconnectingSocket } from "@/lib/reconnecting-socket";
import type { SocketEvent } from "@/lib/reconnecting-socket";
import { sessionStorage } from "@/lib/session-storage";

/**
 * Operator soketi — filial guruhiga broadcast qilinadigan real vaqt kanali.
 *
 * Logistga tegishli hodisalar (`BACKEND-LOGIST.md` §9):
 *   `order_created`             — yangi buyurtma tushdi (ilova ham)
 *   `order_status_changed`      — buyurtma boshqa ustunga ko'chdi
 *   `order_courier_assigned`    — kuryer biriktirildi
 *   `order_delivery_attempt`    — "yetkazib bo'lmadi" urinishi
 *   `transfer_created`          — filiallararo zakaz tushdi
 *   `transfer_status_changed`   — zakaz holati o'zgardi
 *   `order_transfer_requested`  — mijoz buyurtmasi filialga taklif qilindi
 *   `order_transfer_resolved`   — taklif qabul/rad etildi
 *
 * Xodimlar chati (`LOGIST_CHAT_FLUTTER.md` §4) — alohida ulanish OCHILMAYDI,
 * chat hodisalari ham shu soketdan tushadi:
 *   `staff_message` · `staff_message_updated` · `staff_message_deleted`
 *   `staff_typing` · `staff_badge` · `staff_subscribe_denied`
 *
 * Buyurtma hodisalari **har qanday manbadan** keladi (CRM, admin paneli,
 * to'lov webhooki), shuning uchun doskani tirik ushlab turishning yagona
 * ishonchli signali shu.
 */
/**
 * Ochiq soketga buyruq yuborish uchun havola.
 *
 * Soket panel karkasida bitta nusxada yashaydi, buyruqlar esa chuqurdagi
 * komponentlardan yuboriladi (kanal ochilganda `subscribe`, yozayotganda
 * `typing`). React konteksti bu yerda ortiqcha bo'lardi: yuborish —
 * ko'rinishga ta'sir qilmaydigan bir tomonlama harakat.
 */
let sender: ((data: unknown) => void) | null = null;

/**
 * Soket hozir ochiqmi — zaxira so'rovlar (xodimlar chati) shundan qaror
 * qiladi: ochiq bo'lsa hodisalar yetarli, uzilgan bo'lsa so'rov bilan
 * yangilanadi.
 */
let online = false;
const onlineListeners = new Set<() => void>();

function setSocketOnline(next: boolean): void {
  if (online === next) return;
  online = next;
  onlineListeners.forEach((listener) => listener());
}

function subscribeSocketOnline(listener: () => void): () => void {
  onlineListeners.add(listener);
  return () => onlineListeners.delete(listener);
}

/** Operator soketi ochiqmi (SSR da — `false`). */
export function useOperatorSocketOnline(): boolean {
  return useSyncExternalStore(
    subscribeSocketOnline,
    () => online,
    () => false,
  );
}

/** Soket buyrug'ini yuboradi. Ulanish yo'q bo'lsa jimgina tashlanadi. */
export function sendOperatorCommand(data: unknown): void {
  sender?.(data);
}

export function useOperatorSocket({
  enabled,
  onEvent,
  onReconnect,
}: {
  enabled: boolean;
  onEvent: (type: string, payload: SocketEvent) => void;
  /** Uzilishdan keyin qayta ulanganda holatni sinxronlash uchun. */
  onReconnect?: () => void;
}) {
  // Callback'larni ref'da saqlaymiz — o'zgarishi ulanishni uzmasin.
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
    onReconnectRef.current = onReconnect;
  }, [onEvent, onReconnect]);

  useEffect(() => {
    if (!enabled) return;

    const socket = openReconnectingSocket({
      url: () => {
        const token = sessionStorage.accessToken;
        return token ? wsUrl(`/ws/operator/?token=${token}`) : null;
      },
      onOpen: () => onReconnectRef.current?.(),
      onStatusChange: setSocketOnline,
      // Server kodi izohi (§5.6): har 30 s ping, 2 ta javobsizdan keyin uzilgan.
      heartbeat: {
        intervalMs: 30_000,
        maxMissed: 2,
        ping: { action: "ping" },
        isPong: (event) => event.type === "pong",
      },
      onEvent: (event) => {
        const type = typeof event.type === "string" ? event.type : "";
        if (type) onEventRef.current(type, event);
      },
    });

    // Chuqurdagi komponentlar shu havola orqali buyruq yuboradi.
    sender = socket.send;

    return () => {
      sender = null;
      setSocketOnline(false);
      socket.close();
    };
  }, [enabled]);
}
