"use client";

import { Suspense, type ReactNode } from "react";

import { RequireAuth } from "@/features/auth/ui/require-auth";

import { PanelShell } from "./_shell/panel-shell";
import PanelLoading from "./loading";

/** Panel sahifalari: auth qo'riqchisi + karkas. `nuqs` uchun Suspense shart. */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <PanelShell>
        <Suspense fallback={<PanelLoading />}>{children}</Suspense>
      </PanelShell>
    </RequireAuth>
  );
}
