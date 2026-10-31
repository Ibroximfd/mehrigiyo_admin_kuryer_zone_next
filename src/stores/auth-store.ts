import { create } from "zustand";

import * as authApi from "@/features/auth/api";
import type { CurrentUser } from "@/features/auth/types";
import { asRole } from "@/features/auth/types";
import { ApiError, errorMessage, setOnSessionExpired } from "@/lib/api-client";
import { sessionStorage } from "@/lib/session-storage";

/**
 * Sessiya holati — bosh kuryer sayti.
 *
 * Kim kiradi — server hal qiladi: login `site: "chief"` bilan ketadi va
 * akkaunt bosh kuryer bo'lmasa token berilmaydi (`403 wrong_site`).
 * Login javobida `role: "chief_courier"` va `account_kind: "chief"` keladi (V2);
 * rol bu yerda qayta tekshirilmaydi — qolgan to'siq `ChiefSiteGate` (`chief/me`).
 */
export type AuthStatus =
  "unknown" | "checking" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  isSubmitting: boolean;
  error: string | null;
  /** `429 too_many_attempts` — shu vaqtgacha (ms) kirish tugmasi o'chiq. */
  retryUntil: number | null;

  restoreSession: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  sessionExpired: () => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "unknown",
  user: null,
  isSubmitting: false,
  error: null,
  retryUntil: null,

  restoreSession() {
    if (get().status !== "unknown") return;
    set({ status: "checking" });

    const stored = sessionStorage.read();
    if (!stored) {
      set({ status: "unauthenticated", user: null });
      return;
    }

    const role = asRole(stored.role);
    const user: CurrentUser = {
      id: stored.id,
      name: stored.name,
      username: stored.username,
      isAdmin: stored.isAdmin,
      isStaff: stored.isStaff,
      role: role ?? (stored.isAdmin ? "admin" : "logist"),
      roleFromServer: role !== null,
      filialId: stored.filialId,
      filialName: stored.filialName,
      filialRegion: stored.filialRegion,
      filialRegionCode: stored.filialRegionCode,
      filialLocation: stored.filialLocation,
    };

    set({ status: "authenticated", user });
  },

  async login(username, password) {
    set({ isSubmitting: true, error: null });

    try {
      const result = await authApi.login(username, password);

      sessionStorage.save({
        token: result.access,
        refreshToken: result.refresh,
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
        isAdmin: result.user.isAdmin,
        isStaff: result.user.isStaff,
        role: result.user.roleFromServer ? result.user.role : null,
        filialId: result.user.filialId,
        filialName: result.user.filialName,
        filialRegion: result.user.filialRegion,
        filialRegionCode: result.user.filialRegionCode,
        filialLocation: result.user.filialLocation,
      });

      set({
        status: "authenticated",
        user: result.user,
        isSubmitting: false,
        error: null,
      });
      return true;
    } catch (error) {
      const failure = loginFailure(error);
      set({
        status: "unauthenticated",
        user: null,
        isSubmitting: false,
        error: failure.message,
        retryUntil:
          failure.retryAfter === null
            ? null
            : Date.now() + failure.retryAfter * 1000,
      });
      return false;
    }
  },

  logout() {
    // Operator API'da logout endpointi yo'q — token mahalliy tozalanadi.
    sessionStorage.clear();
    set({
      status: "unauthenticated",
      user: null,
      isSubmitting: false,
      error: null,
    });
  },

  sessionExpired() {
    if (get().status === "unauthenticated") return;
    sessionStorage.clear();
    set({ status: "unauthenticated", user: null });
  },

  clearError() {
    set({ error: null, retryUntil: null });
  },
}));

const SITE_NAMES: Record<string, string> = {
  logist: "logist saytidan",
  crm: "CRM saytidan",
};

/**
 * Kirish xatosi (`TUZILMA_V2` §7): `wrong_site` — akkaunt boshqa saytniki,
 * `too_many_attempts` — `retry_after` soniya kutish (hisoblagich login sahifasida).
 */
function loginFailure(error: unknown): {
  message: string;
  retryAfter: number | null;
} {
  if (error instanceof ApiError) {
    const data =
      error.data && typeof error.data === "object"
        ? (error.data as Record<string, unknown>)
        : {};
    if (error.status === 429) {
      const seconds = Number(data.retry_after);
      return {
        message:
          "Urinishlar ko'payib ketdi. Birozdan keyin qayta urinib ko'ring.",
        retryAfter: Number.isFinite(seconds) && seconds > 0 ? seconds : 60,
      };
    }
    if (error.code === "wrong_site") {
      const site = SITE_NAMES[String(data.account_kind)] ?? "o'z saytidan";
      return {
        message: `Bu akkaunt bosh kuryer sayti uchun emas — ${site} kiring`,
        retryAfter: null,
      };
    }
  }
  return {
    message: errorMessage(error, "Login yoki parol xato"),
    retryAfter: null,
  };
}

// Tarmoq qatlami refresh rad etilganda shu callback'ni chaqiradi.
setOnSessionExpired(() => useAuthStore.getState().sessionExpired());
