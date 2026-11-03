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
 * `sklad_changed` (`SKLAD_S_BLOK` §11) — sklad sahifasi ochiq turganda tinglanadi.
 * Hodisa umumiy `sklad` guruhiga ketadi, shuning uchun `chief_id` o'z o'rnimiz bilan
 * solishtiriladi. O'zimizniki bo'lsa sklad keshi `reset` qilinadi: eski sklad darhol
 * yopiladi (skelet), keyin `sklad/me` qaytadan so'raladi — `sklad_id: null` bo'lsa
 * «biriktirilmagan» holatiga o'tadi. Uzilishdan keyin ham qayta so'raladi (hodisa
 * yo'qolgan bo'lishi mumkin). Demo rejimda soket yo'q.
 */
export function useSkladChanged(seatId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (DEMO_MODE) return;
    const socket = openReconnectingSocket({
      url: () => {
        const token = sessionStorage.accessToken;
        return token ? `${wsUrl(ENDPOINTS.skladSocket)}?token=${encodeURIComponent(token)}` : null;
      },
      onEvent: (raw) => {
        // Kuryer kirim so'rovi va qaror (2026-11-03 §4.5) — navbat va qoldiq yangilanadi.
        const type = (raw as { type?: unknown } | null)?.type;
        if (type === "courier_load_request" || type === "courier_load_request_decided") {
          void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSklad });
          return;
        }
        const event = parseSkladChanged(raw);
        if (event?.chiefId === seatId) void queryClient.resetQueries({ queryKey: queryKeys.chiefSklad });
      },
      onOpen: ({ reconnected }) => {
        if (reconnected) void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSklad });
      },
    });
    return () => socket.close();
  }, [queryClient, seatId]);
}
