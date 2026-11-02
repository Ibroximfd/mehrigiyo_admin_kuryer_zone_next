import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openReconnectingSocket } from "./reconnecting-socket";

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  send() {}
}

describe("openReconnectingSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("birinchi ulanish `reconnected: false`, keyingisi `true`", () => {
    const onOpen = vi.fn();
    const socket = openReconnectingSocket({ url: () => "ws://x", onEvent: () => {}, onOpen });

    FakeSocket.instances[0].open();
    expect(onOpen).toHaveBeenLastCalledWith({ reconnected: false });

    FakeSocket.instances[0].close();
    vi.advanceTimersByTime(4000);
    FakeSocket.instances[1].open();
    expect(onOpen).toHaveBeenLastCalledWith({ reconnected: true });
    socket.close();
  });

  it("uzilishlar ketma-ket bo'lsa kechikish o'sadi (backoff)", () => {
    const socket = openReconnectingSocket({ url: () => "ws://x", onEvent: () => {} });
    FakeSocket.instances[0].close();
    // Birinchi qayta urinish ~2–3 s dan keyin.
    vi.advanceTimersByTime(1900);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1200);
    expect(FakeSocket.instances).toHaveLength(2);

    FakeSocket.instances[1].close();
    // Ikkinchisi ~4–5 s — 3 s da hali yo'q.
    vi.advanceTimersByTime(3000);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(2100);
    expect(FakeSocket.instances).toHaveLength(3);
    socket.close();
  });
});
