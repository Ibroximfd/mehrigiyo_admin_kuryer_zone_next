"use client";

import { KeyRound, MoreVertical, Pencil, Power, PowerOff, Smartphone } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import type { Courier } from "../model/courier";

export type CourierAction = "edit" | "set-password" | "logout-device" | "deactivate" | "activate";

export function CourierActions({ courier, onAction }: { courier: Courier; onAction: (action: CourierAction) => void }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.couriers.actionsLabel(courier.fullName)}>
          <MoreVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => onAction("edit")}>
          <Pencil aria-hidden />
          {t.common.edit}
        </DropdownMenuItem>
        {courier.isActive ? (
          <>
            <DropdownMenuItem onSelect={() => onAction("set-password")}>
              <KeyRound aria-hidden />
              {t.couriers.setPassword}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!courier.hasAccount || !courier.device} onSelect={() => onAction("logout-device")}>
              <Smartphone aria-hidden />
              {t.couriers.logoutDevice}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => onAction("deactivate")}>
              <PowerOff aria-hidden />
              {t.couriers.deactivate}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => onAction("activate")}>
            <Power aria-hidden />
            {t.couriers.activate}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
