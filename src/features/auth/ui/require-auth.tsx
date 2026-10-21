"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ROUTES } from "@/shared/config/routes";
import { Splash } from "@/shared/ui/splash";

import { useAuthStore } from "../hooks/auth-store";
import { ForbiddenScreen } from "./forbidden-screen";

/**
 * Panel qo'riqchisi (statik eksport — middleware yo'q, tekshiruv brauzerda):
 *   unknown → splash · unauthenticated → /login?from= · forbidden → ekran.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const restore = useAuthStore((state) => state.restore);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unknown") restore();
  }, [status, restore]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const from = `${pathname}${window.location.search}`;
    router.replace(`${ROUTES.login}?from=${encodeURIComponent(from)}`);
  }, [status, pathname, router]);

  if (status === "forbidden") return <ForbiddenScreen />;
  if (status !== "authenticated") return <Splash />;
  return <>{children}</>;
}
