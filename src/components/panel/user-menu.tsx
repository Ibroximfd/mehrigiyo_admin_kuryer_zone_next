"use client";

import {
  Bell,
  BellOff,
  ChevronsUpDown,
  LogOut,
  MoonStar,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field, inputClass } from "@/components/kit/field";
import { ThemeToggle } from "@/components/kit/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { requestNotificationPermission } from "@/lib/alerts";
import { credentials } from "@/lib/credentials";
import { initials } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * Logist menyusi: profil, filial, mavzu, signal sozlamalari va chiqish.
 *
 * Har logist o'z profili bilan kiradi — izoh va amallar avtomatik shu
 * profil nomidan yoziladi, qo'shimcha imzo mexanizmi kerak emas.
 */
export function UserMenu({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const soundEnabled = useUiStore((state) => state.soundEnabled);
  const setSoundEnabled = useUiStore((state) => state.setSoundEnabled);
  const alertsEnabled = useUiStore((state) => state.desktopAlertsEnabled);
  const setAlertsEnabled = useUiStore((state) => state.setDesktopAlertsEnabled);
  const quietEnabled = useUiStore((state) => state.quietEnabled);
  const quietFrom = useUiStore((state) => state.quietFrom);
  const quietTo = useUiStore((state) => state.quietTo);
  const [quietOpen, setQuietOpen] = useState(false);

  const name = user?.name || "Logist";
  const role = user?.isAdmin ? "Administrator" : "Logist";

  const handleLogout = () => {
    logout();
    // "Chiqish" bosilgan zahoti avto-kirish qaytadan kiritib yubormasin.
    void credentials.preventSilentSignIn();
    router.replace(ROUTES.login);
  };

  const toggleAlerts = async () => {
    if (!alertsEnabled) {
      const granted = await requestNotificationPermission();
      setAlertsEnabled(granted);
      return;
    }
    setAlertsEnabled(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Logist menyusi"
        className={cn(
          "hover:bg-rail-hover flex items-center gap-2.5 rounded-lg transition-colors",
          "focus-visible:ring-accent/50 focus-visible:ring-2 focus-visible:outline-none",
          variant === "full" ? "w-full p-2" : "p-1.5",
        )}
      >
        <Avatar name={name} />

        {variant === "full" ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="text-rail-ink block truncate text-dense font-medium">
                {name}
              </span>
              <span className="text-rail-ink-muted block truncate text-fine">
                {user?.filialName ? `${role} · ${user.filialName}` : role}
              </span>
            </span>
            <ChevronsUpDown className="text-rail-ink-muted size-3.5 shrink-0" />
          </>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="w-72">
        <div className="flex items-center gap-3 p-2">
          <Avatar name={name} tone="light" />
          <div className="min-w-0">
            <p className="text-ink truncate text-body font-semibold">{name}</p>
            <p className="text-ink-muted truncate text-meta">
              {user?.username ?? role}
            </p>
          </div>
        </div>

        {user?.filialName ? (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-ink-muted text-dense">Filial</span>
              <span className="text-ink text-dense font-semibold">
                {user.filialName}
              </span>
            </div>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-ink-muted text-dense">Mavzu</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-ink-muted text-dense">Til</span>
          <LocaleSwitcher />
        </div>

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setSoundEnabled(!soundEnabled);
          }}
        >
          {soundEnabled ? <Volume2 /> : <VolumeX />}
          {soundEnabled ? "Ovoz yoqilgan" : "Ovoz o'chirilgan"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void toggleAlerts();
          }}
        >
          {alertsEnabled ? <Bell /> : <BellOff />}
          {alertsEnabled
            ? "Bildirishnoma yoqilgan"
            : "Bildirishnoma o'chirilgan"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setQuietOpen(true);
          }}
        >
          <MoonStar />
          {quietEnabled
            ? `Sokin soatlar: ${quietFrom}–${quietTo}`
            : "Sokin soatlar o'chiq"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOut />
          Tizimdan chiqish
        </DropdownMenuItem>
      </DropdownMenuContent>

      <QuietHoursDialog open={quietOpen} onOpenChange={setQuietOpen} />
    </DropdownMenu>
  );
}

/**
 * Sokin soatlar (LOGIST-PLAN §14): tanlangan oraliqda ovozli signal
 * chalinmaydi — bildirishnoma va badge ishlayveradi.
 */
function QuietHoursDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const quietEnabled = useUiStore((state) => state.quietEnabled);
  const quietFrom = useUiStore((state) => state.quietFrom);
  const quietTo = useUiStore((state) => state.quietTo);
  const setQuietHours = useUiStore((state) => state.setQuietHours);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[22rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle className="flex items-center gap-2">
          <MoonStar className="text-brand size-4.5" />
          Sokin soatlar
        </DialogTitle>
        <DialogDescription>
          Bu oraliqda ovozli signal chalinmaydi; bildirishnoma va hisoblagichlar
          ishlayveradi.
        </DialogDescription>

        <div className="mt-3 space-y-3.5">
          <div className="flex items-center justify-between">
            <Label className="text-ink text-dense">Yoqish</Label>
            <Switch
              checked={quietEnabled}
              onCheckedChange={(checked) =>
                setQuietHours({ enabled: checked === true })
              }
              aria-label="Sokin soatlarni yoqish"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Boshlanishi">
              <input
                type="time"
                value={quietFrom}
                onChange={(event) =>
                  setQuietHours({ enabled: quietEnabled, from: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Tugashi">
              <input
                type="time"
                value={quietTo}
                onChange={(event) =>
                  setQuietHours({ enabled: quietEnabled, to: event.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Tayyor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Avatar({
  name,
  tone = "dark",
}: {
  name: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-fine font-bold",
        tone === "dark"
          ? "bg-accent/20 text-accent ring-accent/30 ring-1"
          : "bg-brand-soft text-brand",
      )}
    >
      {initials(name) || "LG"}
    </span>
  );
}
