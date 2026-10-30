import { create } from "zustand";

import * as authApi from "@/features/auth/api";
import type { CurrentUser } from "@/features/auth/types";
import { asRole } from "@/features/auth/types";
import { errorMessage, setOnSessionExpired } from "@/lib/api-client";
import { sessionStorage } from "@/lib/session-storage";

/**
 * Sessiya holati — CRM `auth-store` ning logist varianti.
 *
 * Rol tekshiruvi (`BACKEND-LOGIST.md` §4.1):
 *
 *   • Backend `role` yuborgan bo'lsa unga **ishonamiz**: `seller` logist
 *     paneliga kiritilmaydi. Ilgari bu tekshiruv faqat qat'iy rejimda
 *     ishlardi va sotuvchi akkaunt ichkariga kirib, har bir so'rovdan
 *     `role_forbidden` olardi — ya'ni sayt "buzilgan" ko'rinardi.
 *
 *   • `role` bo'lmagan sessiya (eski support login — §"zaxira kirish")
 *     yumshoq rejimda o'tadi: unda rol tushunchasi umuman yo'q.
 *
 *   • Qat'iy rejim (`NEXT_PUBLIC_ROLE_STRICT=1`) rolsiz sessiyani ham
 *     to'sadi — faqat serverdan `logist`/`admin` deb tasdiqlangan akkaunt.
 */
export type AuthStatus =
  | "unknown"
  | "checking"
  | "authenticated"
  | "unauthenticated";

const ROLE_STRICT = process.env.NEXT_PUBLIC_ROLE_STRICT === "1";

/** Logist saytiga kimlar kira oladi. */
function isAllowed(user: CurrentUser): boolean {
  // Server rolni aytgan bo'lsa — qaror shundan, rejimga bog'liq emas.
  if (user.roleFromServer) {
    return user.role === "logist" || user.role === "admin";
  }
  return !ROLE_STRICT;
}

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  isSubmitting: boolean;
  error: string | null;

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

    if (!isAllowed(user)) {
      sessionStorage.clear();
      set({ status: "unauthenticated", user: null });
      return;
    }

    set({ status: "authenticated", user });
  },

  async login(username, password) {
    set({ isSubmitting: true, error: null });

    try {
      const result = await authApi.login(username, password);

      if (!isAllowed(result.user)) {
        set({
          status: "unauthenticated",
          user: null,
          isSubmitting: false,
          error:
            result.user.role === "seller"
              ? "Bu akkaunt sotuvchi roli bilan ishlaydi — logist paneliga CRM orqali kiring"
              : "Bu akkaunt logist paneliga kira olmaydi",
        });
        return false;
      }

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
      set({
        status: "unauthenticated",
        user: null,
        isSubmitting: false,
        error: errorMessage(error, "Login yoki parol xato"),
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
    set({ error: null });
  },
}));

// Tarmoq qatlami refresh rad etilganda shu callback'ni chaqiradi.
setOnSessionExpired(() => useAuthStore.getState().sessionExpired());
