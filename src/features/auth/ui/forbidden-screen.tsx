"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { useAuthStore } from "../hooks/auth-store";

/** `403 forbidden` — token bor, lekin `is_staff` emas (logist/operator). */
export function ForbiddenScreen() {
  const t = useT();
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-warn-soft text-warn">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{t.auth.forbiddenTitle}</h1>
        <p className="text-sm text-ink-muted">{t.auth.forbiddenText}</p>
        <Button
          className="mt-2 w-full"
          onClick={() => {
            queryClient.clear();
            signOut();
          }}
        >
          {t.auth.forbiddenAction}
        </Button>
      </Card>
    </main>
  );
}
