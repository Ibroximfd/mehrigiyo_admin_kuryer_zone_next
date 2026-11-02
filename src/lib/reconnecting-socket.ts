/**
 * Uzilganda o'zi qayta ulanadigan WebSocket — `operator_ws_service.dart` va
 * `chat_ws_service.dart` ning ko'chirmasi.
 *
 * Qayta ulanish eksponensial kechikish bilan (2s, 4s, 8s… 60s gacha) va
 * tasodifiy qo'shimcha bilan ketadi: server qayta ishga tushganda barcha
 * klientlar bir vaqtda urilib qolmasligi uchun ("thundering herd").
 */

export type SocketEvent = Record<string, unknown>;

export type ReconnectingSocket = {
  close: () => void;
  send: (data: unknown) => void;
};

export function openReconnectingSocket({
  url,
  onEvent,
  onOpen,
  onStatus,
}: {
  /** Har ulanishda qaytadan hisoblanadi — token yangilangan bo'lishi mumkin. */
  url: () => string | null;
  onEvent: (event: SocketEvent) => void;
  /**
   * Har bir (qayta) ulanishda chaqiriladi. Uzilib turgan vaqtdagi hodisalar
   * backend tomonidan takrorlanmaydi, shuning uchun qayta ulanishda
   * (`reconnected: true`) holatni qaytadan yuklash kerak. Birinchi
   * ulanishda esa ma'lumot hozirgina yuklangan — qayta so'rash ortiqcha.
   */
  onOpen?: (info: { reconnected: boolean }) => void;
  /** Ulanish ko'rsatkichi uchun (tepa paneldagi nuqta). */
  onStatus?: (status: "open" | "reconnecting") => void;
}): ReconnectingSocket {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let closed = false;
  let everOpened = false;

  const connect = () => {
    if (closed) return;

    const target = url();
    if (!target) {
      // Token hali yo'q — biroz kutib qayta urinamiz.
      reconnectTimer = setTimeout(connect, 2000);
      return;
    }

    try {
      socket = new WebSocket(target);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      const reconnected = everOpened;
      everOpened = true;
      onStatus?.("open");
      onOpen?.({ reconnected });
    };

    socket.onmessage = (event) => {
      if (closed) return;
      try {
        const parsed = JSON.parse(String(event.data));
        if (parsed && typeof parsed === "object") onEvent(parsed as SocketEvent);
      } catch {
        // JSON bo'lmagan xabarlarni e'tiborsiz qoldiramiz.
      }
    };

    socket.onclose = () => {
      socket = null;
      if (!closed) onStatus?.("reconnecting");
      scheduleReconnect();
    };

    socket.onerror = () => {
      // `onerror` dan keyin brauzer doim `onclose` ni ham chaqiradi, shuning
      // uchun qayta ulanish faqat bitta joyda boshqariladi.
      socket?.close();
    };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);

    const backoffSeconds = Math.min(60, 2 << Math.min(attempt, 5));
    attempt += 1;
    reconnectTimer = setTimeout(
      connect,
      backoffSeconds * 1000 + Math.random() * 1000,
    );
  };

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
    },
    send(data) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(typeof data === "string" ? data : JSON.stringify(data));
      }
    },
  };
}
