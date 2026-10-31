"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/kit/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChiefMe } from "@/features/chief/use-chief-me";
import { regionLabel } from "@/features/orders/regions";
import { credentials } from "@/lib/credentials";
import { initials } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/** Bosh kuryer menyusi: kim, qaysi viloyatlar, mavzu, til va chiqish. */
export function UserMenu({ variant = "full" }: { variant?: "full" | "compact" }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { me } = useChiefMe();
  const router = useRouter();

  const name = me?.seat.fullName || user?.name || "Bosh kuryer";
  const regions = me?.regions.map(regionLabel).join(", ") ?? "";

  const handleLogout = () => {
    logout();
    // «Chiqish» bosilgan zahoti avto-kirish qaytadan kiritib yubormasin.
    void credentials.preventSilentSignIn();
    router.replace(ROUTES.login);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Profil menyusi"
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
              <span className="text-rail-ink block truncate text-dense font-medium" data-no-translit>{name}</span>
              <span className="text-rail-ink-muted block truncate text-fine">Bosh kuryer</span>
            </span>
            <ChevronsUpDown className="text-rail-ink-muted size-3.5 shrink-0" />
          </>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side={variant === "full" ? "top" : "bottom"} className="w-72">
        <div className="flex items-center gap-3 p-2">
          <Avatar name={name} light />
          <div className="min-w-0">
            <p className="text-ink truncate text-body font-semibold" data-no-translit>{name}</p>
            <p className="text-ink-muted truncate text-meta">{regions || "Bosh kuryer"}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-ink-muted text-dense">Mavzu</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-ink-muted text-dense">Til</span>
          <LocaleSwitcher />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOut />
          Tizimdan chiqish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ name, light = false }: { name: string; light?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-fine font-bold",
        light ? "bg-brand-soft text-brand" : "bg-accent/20 text-accent ring-accent/30 ring-1",
      )}
    >
      {initials(name) || "BK"}
    </span>
  );
}
