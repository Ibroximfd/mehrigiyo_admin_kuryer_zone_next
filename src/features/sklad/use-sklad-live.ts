"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ENDPOINTS, wsUrl } from "@/lib/api-constants";
import { DEMO_MODE } from "@/lib/demo/mode";
import { queryKeys } from "@/lib/query-keys";
import { openReconnectingSocket } from "@/lib/reconnecting-socket";
import { sessionStorage } from "@/lib/session-storage";

import { parseSkladChanged } from "./types";

/**
 * Sklad yoki sotuvni o'zgartiradigan hodisalar (`/ws/sklad/`, 18 §10; 101 §2):
 * hujjat, kuryer qoldig'i, kuryer «yetkazdim» bosgani, logist tasdig'i,
 * kirim so'rovi. Hammasida sklad va sotuv jadvali qayta so'raladi.
 */
const LIVE_EVENTS = new Set([
  "stock_changed",
  "courier_stock_changed",
  "document_created",
  "sales_sheet_changed",
  "courier_load_request",
  "courier_load_request_decided",
]);

/** Bir hujjat o'nlab `stock_changed` beradi — oxirgisidan keyin bitta qayta so'rov. */
const BURST_MS = 800;

/**
 * Bosh kuryerning sklad soketi — Sklad va Sotuv jadvali ochiq turganda tinglanadi
 * (egasi, 2026-11-20: bog'langan joylar real vaqtda bir xil bo'lsin).
 *   • `sklad_changed` (§11) — o'z o'rnimiz boshqa skladga o'tsa sklad keshi
 *     `reset`: eski sklad darhol yopiladi, `sklad/me` qayta so'raladi;
 *   • qoldiq va sotuv hodisalari — sklad va sotuv jadvali qayta so'raladi;
 *   • uzilishdan keyin ham qayta so'raladi (hodisa yo'qolgan bo'lishi mumkin).
 * Server hodisa bermasa ham bugungi jadvallar oraliqda o'zi yangilanadi
 * (`lib/live-refetch`). Demo rejimda soket yo'q.
 */
export function useSkladLive(seatId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (DEMO_MODE) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSklad });
        void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSalesSheets });
      }, BURST_MS);
    };
    const socket = openReconnectingSocket({
      url: () => {
        const token = sessionStorage.accessToken;
        return token ? `${wsUrl(ENDPOINTS.skladSocket)}?token=${encodeURIComponent(token)}` : null;
      },
      onEvent: (raw) => {
        const type = (raw as { type?: unknown } | null)?.type;
        if (typeof type === "string" && LIVE_EVENTS.has(type)) {
          refresh();
          return;
        }
        const event = parseSkladChanged(raw);
        if (event?.chiefId === seatId) void queryClient.resetQueries({ queryKey: queryKeys.chiefSklad });
      },
      onOpen: ({ reconnected }) => {
        if (reconnected) refresh();
      },
    });
    return () => {
      if (timer) clearTimeout(timer);
      socket.close();
    };
  }, [queryClient, seatId]);
}
