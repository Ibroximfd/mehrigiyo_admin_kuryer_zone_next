/**
 * Uzilganda o'zi qayta ulanadigan WebSocket — `operator_ws_service.dart` va
 * `chat_ws_service.dart` ning ko'chirmasi.
 *
 * Qayta ulanish eksponensial kechikish bilan (2s, 4s, 8s… 60s gacha) va
 * tasodifiy qo'shimcha bilan ketadi: server qayta ishga tushganda barcha
 * klientlar bir vaqtda urilib qolmasligi uchun ("thundering herd").
 */

export type SocketEvent = Record<string, unknown>;

/**
 * Jonlilik tekshiruvi. Yarim ochiq ulanish (noutbuk uxlab qolgan, NAT
 * ulanishni tashlab yuborgan) brauzerda `onclose` bermaydi — soket "ochiq"
 * ko'rinib, hech qanday hodisa kelmaydi va doska jimgina o'ladi. Server
 * `{action:"ping"}` ga `{type:"pong"}` qaytaradi (`/ws/operator/`, §5.6):
 * `maxMissed` ta ketma-ket javobsiz pingdan keyin ulanish tashlanib, qayta
 * ulanadi. Har qanday kiruvchi xabar jonlilik belgisi hisoblanadi.
 */
export type SocketHeartbeat = {
  intervalMs: number;
  maxMissed: number;
  ping: unknown;
  /** Javob xabari — u `onEvent` ga uzatilmaydi. */
  isPong: (event: SocketEvent) => boolean;
};

export type ReconnectingSocket = {
  close: () => void;
  send: (data: unknown) => void;
};

export function openReconnectingSocket({
  url,
  onEvent,
  onOpen,
  onStatusChange,
  heartbeat,
}: {
  /** Har ulanishda qaytadan hisoblanadi — token yangilangan bo'lishi mumkin. */
  url: () => string | null;
  onEvent: (event: SocketEvent) => void;
  /**
   * Har bir (qayta) ulanishda chaqiriladi. Uzilib turgan vaqtdagi hodisalar
   * backend tomonidan takrorlanmaydi, shuning uchun bu yerda holatni qaytadan
   * yuklash kerak.
   */
  onOpen?: () => void;
  /**
   * Ulanish holati o'zgarganda (`true` — ochildi, `false` — uzildi).
   * Soketsiz rejimdagi zaxira so'rovlar shundan qaror qiladi.
   */
  onStatusChange?: (online: boolean) => void;
  heartbeat?: SocketHeartbeat;
}): ReconnectingSocket {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let missed = 0;
  let attempt = 0;
  let closed = false;

  const stopHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    missed = 0;
  };

  /** Javob bermayotgan ulanishni tashlaydi — `onclose` ni kutmasdan. */
  const dropSocket = () => {
    const dead = socket;
    socket = null;
    stopHeartbeat();
    onStatusChange?.(false);
    if (dead) {
      dead.onopen = null;
      dead.onmessage = null;
      dead.onclose = null;
      dead.onerror = null;
      try {
        dead.close();
      } catch {
        // Allaqachon yopilgan — ahamiyatsiz.
      }
    }
    scheduleReconnect();
  };

  const startHeartbeat = (current: WebSocket) => {
    if (!heartbeat) return;
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (socket !== current) return;
      if (missed >= heartbeat.maxMissed) {
        dropSocket();
        return;
      }
      missed += 1;
      if (current.readyState === WebSocket.OPEN) {
        current.send(JSON.stringify(heartbeat.ping));
      }
    }, heartbeat.intervalMs);
  };

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

    const current = socket;

    socket.onopen = () => {
      attempt = 0;
      startHeartbeat(current);
      onStatusChange?.(true);
      onOpen?.();
    };

    socket.onmessage = (event) => {
      if (closed) return;
      missed = 0;
      try {
        const parsed = JSON.parse(String(event.data));
        if (!parsed || typeof parsed !== "object") return;
        if (heartbeat?.isPong(parsed as SocketEvent)) return;
        onEvent(parsed as SocketEvent);
      } catch {
        // JSON bo'lmagan xabarlarni e'tiborsiz qoldiramiz.
      }
    };

    socket.onclose = () => {
      if (socket !== current) return;
      socket = null;
      stopHeartbeat();
      onStatusChange?.(false);
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
      stopHeartbeat();
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
