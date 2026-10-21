"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useAuthStore } from "@/features/auth/hooks/auth-store";
import { LoginForm } from "@/features/auth/ui/login-form";
import { isTestServer } from "@/shared/config/env";
import { ROUTES } from "@/shared/config/routes";
import { useT } from "@/shared/i18n/locale";
import { Badge } from "@/shared/ui/badge";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Card } from "@/shared/ui/card";
import { Splash } from "@/shared/ui/splash";

/** Faqat ilova ichidagi nisbiy manzilga qaytaramiz (ochiq redirect bo'lmasin). */
function safeTarget(from: string | null): string {
  return from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith(ROUTES.login) ? from : ROUTES.home;
}

function LoginScreen() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((state) => state.status);
  const restore = useAuthStore((state) => state.restore);
  const target = safeTarget(searchParams.get("from"));

  useEffect(() => {
    if (status === "unknown") restore();
    if (status === "authenticated") router.replace(target);
  }, [status, restore, router, target]);

  if (status === "unknown" || status === "authenticated") return <Splash />;

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark className="size-12" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t.auth.title}</h1>
            <p className="text-sm text-ink-muted">{t.auth.subtitle}</p>
          </div>
          {isTestServer ? <Badge tone="warn">{t.shell.testServer}</Badge> : null}
        </div>
        <Card className="p-5 sm:p-6">
          <LoginForm onSuccess={() => router.replace(target)} />
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Splash />}>
      <LoginScreen />
    </Suspense>
  );
}
