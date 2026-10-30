"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";

import { motion, useIndicatorTransition } from "@/components/kit/motion";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { TopBarSearch } from "@/components/panel/top-bar-search";
import { NAV, isNavActive, type NavItem } from "@/components/panel/nav";
import { useNavSignals } from "@/components/panel/use-nav-signals";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Tepa panel (desktop) — dizayndagi oq chiziq: bo'limlar gorizontal
 * (faol bo'lim ostida amber chiziq), qidiruv va "kim · rol · ko'rinish
 * doirasi". Logist faqat **o'z filiali** ichida ishlaydi — backend hammasini
 * sessiyadagi filial bo'yicha cheklaydi, shu yerda o'sha filial nomi
 * ko'rinadi.
 */
export function TopBar() {
  const pathname = usePathname();
  const onOrders = isNavActive(pathname, ROUTES.orders);
  // Chat sahifasining o'z qidiruvi bor — ikkita qidiruv chalkashtiradi.
  // Bosh kuryer saytida umumiy zakaz qidiruvi yo'q — har sahifaning o'z filtri bor.
  const ownSearch = true;

  return (
    <header className="border-line glass-chrome relative z-10 hidden h-14 shrink-0 items-center gap-5 border-b px-5 md:flex">
      {/*
        Bo'limlar chap menyuda ham bor — bu qator faqat keng ekranda va o'z
        joyidan oshmaydi (suriladi): qidiruv va foydalanuvchi doim ko'rinadi,
        sayt ekranning yarmida ochilganda ham.
      */}
      <nav
        aria-label="Bo'limlar"
        data-wheel-x
        className="scrollbar-none fade-edges hidden h-full min-w-0 flex-1 items-center gap-5 overflow-x-auto xl:flex"
      >
        {NAV.filter((item) => item.inTopBar).map((item) => (
          <TopLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="flex-1 xl:hidden" />

      {ownSearch ? null : onOrders ? <OrdersSearch /> : <GlobalSearch />}
      <LocaleSwitcher variant="menu" />
      <UserLabel />
    </header>
  );
}

function TopLink({ item, active }: { item: NavItem; active: boolean }) {
  const { count } = useNavSignals(item.badge);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full items-center gap-1.5 pt-0.5 text-body font-semibold whitespace-nowrap",
        "transition-colors duration-(--dur-micro)",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {active ? <TopActiveLine /> : null}
      {/* Tor desktopda uzun nomlar sig'maydi — qisqasi. */}
      <span className="hidden lg:inline">{item.label}</span>
      <span className="lg:hidden">{item.shortLabel}</span>
      {item.isNew ? (
        <span className="bg-amber-soft text-gold rounded-full px-1.5 text-micro font-bold">
          yangi
        </span>
      ) : null}
      {item.badge === "orders" && count > 0 ? (
        <span className="bg-amber text-amber-ink tabular rounded-full px-1.5 text-fine font-bold">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/** Faol bo'lim ostidagi amber chiziq — bo'limlar orasida sirpanib o'tadi. */
function TopActiveLine() {
  const transition = useIndicatorTransition();
  return (
    <motion.span
      aria-hidden
      layoutId="topbar-active"
      transition={transition}
      className="bg-amber amber-glow absolute inset-x-0 bottom-0 h-0.5 rounded-t-full"
    />
  );
}

/** Buyurtmalar sahifasida qidiruv manzil qatoridagi `?q=` ga bog'langan. */
function OrdersSearch() {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ throttleMs: 400, clearOnDefault: true }),
  );

  return <TopBarSearch value={query} onChange={(next) => void setQuery(next || null)} />;
}

/** Boshqa sahifalarda Enter — buyurtmalarga shu qidiruv bilan o'tadi. */
function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <TopBarSearch
      value={value}
      onChange={setValue}
      onSubmit={(text) => {
        if (!text) return;
        router.push(`${ROUTES.orders}?q=${encodeURIComponent(text)}`);
      }}
    />
  );
}

/** "Sardor Toshmatov" → "Sardor T." */
function shortName(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  if (!first) return "Logist";
  return second ? `${first} ${second.charAt(0)}.` : first;
}

function UserLabel() {
  const user = useAuthStore((state) => state.user);
  const role = user?.isAdmin ? "admin" : "logist";

  return (
    <span className="text-ink-muted hidden shrink-0 text-meta font-medium xl:inline">
      <span className="text-ink" data-no-translit>
        {shortName(user?.name ?? "")}
      </span>
      <span className="text-ink-faint">{` · ${role}`}</span>
      {user?.filialName ? (
        <span className="text-ink-faint" data-no-translit>
          {` · ${user.filialName}`}
        </span>
      ) : null}
    </span>
  );
}
