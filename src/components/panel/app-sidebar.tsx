"use client";

import {
  History,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { isNavActive, type NavItem } from "@/components/panel/nav";
import { useVisibleNav } from "@/components/panel/use-visible-nav";
import { RailShift } from "@/components/panel/rail-shift";
import { useNavSignals } from "@/components/panel/use-nav-signals";
import { UserMenu } from "@/components/panel/user-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SERVER_NAME } from "@/lib/api-constants";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  useActivityStore,
  useUnseenActivityCount,
} from "@/stores/activity-store";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * Yon panel — desktopda ham, mobil surilma menyuda ham. Ikonka + nom;
 * ⌘B yoki tugma bilan ikonkagacha yig'iladi, holat brauzerda saqlanadi.
 */
export function AppSidebar({
  onNavigate,
  forceExpanded = false,
}: {
  onNavigate?: () => void;
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const nav = useVisibleNav();
  const isAdmin = useAuthStore((state) => state.user?.isAdmin ?? false);
  const storedCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const collapsed = forceExpanded ? false : storedCollapsed;

  return (
    <div
      data-collapsed={collapsed}
      className={cn(
        "bg-rail rail-grad flex h-full flex-col transition-[width] duration-(--dur-standard) ease-out",
        collapsed ? "w-[68px]" : "w-[264px]",
      )}
    >
      {/* ── Logotip ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2.5",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <BrandLogo
          size={40}
          priority
          className="size-9 shrink-0 rounded-[10px] ring-1 ring-white/10"
        />

        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-rail-ink text-body truncate font-semibold">
              Mehrigiyo Bosh kuryer
            </p>
            <p className="text-rail-ink-muted text-micro flex items-center gap-1 truncate tracking-normal">
              {isAdmin ? (
                <>
                  <ShieldCheck className="size-3" />
                  Admin · Bosh kuryer paneli
                </>
              ) : (
                "Bosh kuryer paneli"
              )}

              {/* Test serverida ishlayotganini adashtirmaslik uchun belgi. */}
              {SERVER_NAME !== "prod" ? (
                <span className="bg-warn-soft text-warn ml-0.5 shrink-0 rounded px-1.5 py-px text-fine font-bold tracking-wide uppercase">
                  {SERVER_NAME}
                </span>
              ) : null}
            </p>
          </div>
        ) : null}

        {!forceExpanded && !collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Panelni yig'ish"
                className="text-rail-ink-muted hover:text-rail-ink hover:bg-rail-hover rounded-md p-1.5 transition-colors"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Panelni yig&apos;ish · ⌘B
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* ── Buyruqlar paneli tugmasi ────────────────────────────────────── */}
      <div className={cn("shrink-0", collapsed ? "px-2" : "px-3")}>
        <CommandTrigger collapsed={collapsed} />
      </div>

      {/* ── Harakatlar lentasi — kim nima qilgani ───────────────────────── */}
      <div className={cn("mt-1.5 shrink-0", collapsed ? "px-2" : "px-3")}>
        <ActivityTrigger collapsed={collapsed} />
      </div>

      {/* ── Bo'limlar va smena kesimi ───────────────────────────────────
          Ikkalasi bitta skroll maydonida: ilgari `nav` `flex-1` bo'lib butun
          bo'sh joyni egallardi va yon panelning pastki yarmi quruq qolardi. */}
      <div className="scrollbar-none mt-4 min-h-0 flex-1 overflow-y-auto">
        <nav
          aria-label="Asosiy menyu"
          className={cn(
            "flex flex-col gap-0.5",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {!collapsed ? (
            <p className="text-rail-ink-muted text-micro px-2 pb-2 tracking-widest uppercase">
              Bo&apos;limlar
            </p>
          ) : null}

          {nav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        <RailShift collapsed={collapsed} />
      </div>

      {/* ── Yig'ilgan holatda ochish tugmasi ────────────────────────────── */}
      {collapsed && !forceExpanded ? (
        <div className="px-2 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Panelni ochish"
                className="text-rail-ink-muted hover:text-rail-ink hover:bg-rail-hover flex w-full justify-center rounded-lg p-2.5 transition-colors"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Panelni ochish · ⌘B</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      {/* ── Logist ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "border-rail-line shrink-0 border-t",
          collapsed ? "flex justify-center px-2 py-2" : "px-2 py-2",
        )}
      >
        <UserMenu variant={collapsed ? "compact" : "full"} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { count, discussion, chats } = useNavSignals(item.badge);

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group text-dense relative flex items-center rounded-lg font-medium",
        "transition-[background-color,color] duration-(--dur-micro) ease-out",
        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-rail-elevated text-rail-accent rail-active-glow"
          : "text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "bg-rail-accent absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full",
          "transition-opacity duration-(--dur-micro)",
          active ? "opacity-100" : "opacity-0",
        )}
      />

      <span className="relative shrink-0">
        <item.Icon className="size-[18px]" />
        {collapsed && (count > 0 || discussion) ? (
          <span
            className={cn(
              "ring-rail absolute -top-1 -right-1 size-2.5 rounded-full ring-2",
              count > 0 ? "bg-danger" : "bg-rail-accent",
            )}
          />
        ) : null}
      </span>

      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {/*
            Ikki xil signal — ikki xil shakl: xabar ikonkasi = muhokamada
            javob kutilmoqda, qizil raqam = yangi yozuv tushdi. Logist ularni
            bir qarashda ajratishi kerak.
          */}
          {chats > 0 ? (
            <span
              title={`Chatda yangi xabari bor buyurtmalar: ${chats}`}
              className="bg-rail-accent/15 text-rail-accent tabular inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-fine font-bold"
            >
              <MessagesSquare className="size-3" aria-hidden />
              {chats > 99 ? "99+" : chats}
            </span>
          ) : discussion ? (
            <MessagesSquare
              aria-label="Muhokamada yangi xabar"
              className="text-rail-accent size-3.5 shrink-0"
            />
          ) : null}
          {count > 0 ? (
            <span className="bg-danger tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-fine font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {count > 0 ? ` · ${count}` : ""}
        {discussion ? " · muhokamada xabar" : ""}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Harakatlar lentasini ochadigan tugma — ko'rilmagan hodisalar soni bilan.
 * Bir necha logist parallel ishlaganda "kim nima qildi" shu yerdan ochiladi.
 */
function ActivityTrigger({ collapsed }: { collapsed: boolean }) {
  const openFeed = useActivityStore((state) => state.setOpen);
  const unseen = useUnseenActivityCount();

  const badge =
    unseen > 0 ? (
      <span className="bg-danger tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-fine font-bold text-white">
        {unseen > 99 ? "99+" : unseen}
      </span>
    ) : null;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => openFeed(true)}
            aria-label="Harakatlar lentasi"
            className="text-rail-ink-muted hover:text-rail-ink hover:bg-rail-hover relative flex w-full justify-center rounded-lg p-2.5 transition-colors"
          >
            <History className="size-[18px]" />
            {unseen > 0 ? (
              <span className="bg-danger ring-rail absolute top-1.5 right-4 size-2.5 rounded-full ring-2" />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Harakatlar lentasi{unseen > 0 ? ` · ${unseen}` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openFeed(true)}
      className="border-rail-line text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink hover:border-rail-ink-muted/40 text-dense flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors duration-(--dur-micro)"
    >
      <History className="size-4 shrink-0" />
      <span className="flex-1 text-left">Harakatlar</span>
      {badge}
    </button>
  );
}

/**
 * Buyruqlar panelini ochadigan tugma. ⌘K hodisasini yuboradi — mantiq
 * bitta joyda (`CommandPalette`) qoladi.
 */
function CommandTrigger({ collapsed }: { collapsed: boolean }) {
  const open = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={open}
            aria-label="Qidirish"
            className="text-rail-ink-muted hover:text-rail-ink hover:bg-rail-hover flex w-full justify-center rounded-lg p-2.5 transition-colors"
          >
            <Search className="size-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Qidirish · ⌘K</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="border-rail-line text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink hover:border-rail-ink-muted/40 text-dense flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors duration-(--dur-micro)"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Qidirish...</span>
      <kbd className="border-rail-line text-micro rounded border px-1.5 py-0.5 tracking-normal">
        ⌘K
      </kbd>
    </button>
  );
}

/** Mobil top-bar logotipi shu manzilga olib boradi. */
export const HOME_ROUTE = ROUTES.home;
