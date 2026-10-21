"use client";

import { create } from "zustand";

import { setSessionHandlers } from "@/shared/lib/api-client";
import { sessionStorage, type SessionUser } from "@/shared/lib/session-storage";

import type { LoginResult } from "../model/auth";

/**
 * Sessiya holati — yagona global klient holati (server ma'lumoti emas).
 *
 *   unknown          → hali `localStorage` o'qilmagan (splash)
 *   authenticated    → panel ochiq
 *   unauthenticated  → `/login`
 *   forbidden        → token bor, lekin admin emas (`403`) — alohida ekran
 */
export type AuthStatus = "unknown" | "authenticated" | "unauthenticated" | "forbidden";

type AuthState = {
  status: AuthStatus;
  user: SessionUser | null;
  /** Sessiya muddati tugab chiqarilganmi — login sahifasida izoh uchun. */
  expired: boolean;
  restore: () => void;
  signIn: (result: LoginResult) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  user: null,
  expired: false,

  restore: () => {
    setSessionHandlers({
      onExpired: () => set({ status: "unauthenticated", user: null, expired: true }),
      onForbidden: () => set({ status: "forbidden" }),
    });
    const session = sessionStorage.read();
    set(
      session
        ? { status: "authenticated", user: session.user }
        : { status: "unauthenticated", user: null },
    );
  },

  signIn: (result) => {
    sessionStorage.save({ access: result.access, refresh: result.refresh, user: result.user });
    set({ status: "authenticated", user: result.user, expired: false });
  },

  signOut: () => {
    sessionStorage.clear();
    set({ status: "unauthenticated", user: null, expired: false });
  },
}));
