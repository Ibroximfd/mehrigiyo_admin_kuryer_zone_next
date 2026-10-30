"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Monitor,
  Moon,
  Receipt,
  RefreshCw,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useVisibleNav } from "@/components/panel/use-visible-nav";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { fetchOrders } from "@/features/orders/api";
import { orderStatusInfo } from "@/features/orders/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { credentials } from "@/lib/credentials";
import { formatPhone } from "@/lib/format";
import { searchableText } from "@/lib/i18n/translate";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Buyruqlar paneli (⌘K / Ctrl+K) — bo'limlarga tez o'tish, amallar va
 * **buyurtma qidiruvi**: raqam/telefon/ism yozilsa buyurtmaning o'zi
 * topilib ochiladi (LOGIST-PLAN §14).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nav = useVisibleNav();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const logout = useAuthStore((state) => state.logout);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  // Kamida 3 belgi — server qidiruvi (raqam, telefon, manzil, ism).
  const orders = useQuery({
    queryKey: ["orders", "palette", debouncedQuery],
    queryFn: ({ signal }) =>
      fetchOrders(
        { search: debouncedQuery, period: "all", pageSize: 6 },
        signal,
      ),
    enabled: open && debouncedQuery.length >= 3,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = useCallback((action: () => void) => {
    setOpen(false);
    requestAnimationFrame(action);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Yopilganda qidiruv tozalanadi — keyingi ochilish toza boshlanadi.
        if (!next) setQuery("");
      }}
      title="Buyruqlar paneli"
      description="Bo'limga o'tish yoki amal bajarish"
    >
      <CommandInput
        placeholder="Bo'lim, amal yoki buyurtma (raqam/telefon)..."
        value={query}
        onValueChange={setQuery}
      />

      <CommandList>
        <CommandEmpty>
          {orders.isFetching ? "Qidirilmoqda..." : "Hech narsa topilmadi."}
        </CommandEmpty>

        {/* ── Buyurtma qidiruvi natijalari ─────────────────────────────── */}
        {(orders.data?.orders.length ?? 0) > 0 ? (
          <CommandGroup heading="Buyurtmalar">
            {orders.data?.orders.map((order) => {
              const info = orderStatusInfo(order.status);
              return (
                <CommandItem
                  key={order.id}
                  // cmdk matn bo'yicha filtrlaydi — qiymatga qidiriladigan
                  // hamma maydon kiritiladi (raqam, telefon, ism).
                  value={`${order.orderNumber} ${order.client.phone} ${order.client.fullName} ${debouncedQuery}`}
                  onSelect={() =>
                    run(() => router.push(ROUTES.orderDetail(order.id)))
                  }
                >
                  <Receipt />
                  <span className="min-w-0 flex-1 truncate">
                    <b className="tabular" data-no-translit>
                      {order.orderNumber}
                    </b>
                    {" · "}
                    <span data-no-translit>
                      {order.client.fullName || formatPhone(order.client.phone)}
                    </span>
                  </span>
                  <span
                    className="text-micro shrink-0"
                    style={{ color: info.color }}
                  >
                    {info.label}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Bo'limlar">
          {nav.map((item) => (
            <CommandItem
              key={item.href}
              value={searchableText(item.label)}
              onSelect={() => run(() => router.push(item.href))}
              keywords={[item.shortLabel.toLowerCase()]}
            >
              <item.Icon />
              {item.label}
              {item.goKey ? (
                <CommandShortcut>G · {item.goKey.toUpperCase()}</CommandShortcut>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Amallar">
          <CommandItem
            value={searchableText("Barcha ma'lumotni yangilash")}
            onSelect={() => run(() => void queryClient.invalidateQueries())}
            keywords={["yangilash", "refresh"]}
          >
            <RefreshCw />
            Barcha ma&apos;lumotni yangilash
            <CommandShortcut>R</CommandShortcut>
          </CommandItem>

          <CommandItem
            value={searchableText("Yorug' mavzu")}
            onSelect={() => run(() => setTheme("light"))}
          >
            <Sun />
            Yorug&apos; mavzu
          </CommandItem>
          <CommandItem
            value={searchableText("Qorong'i mavzu")}
            onSelect={() => run(() => setTheme("dark"))}
          >
            <Moon />
            Qorong&apos;i mavzu
          </CommandItem>
          <CommandItem
            value={searchableText("Tizim mavzusi")}
            onSelect={() => run(() => setTheme("system"))}
          >
            <Monitor />
            Tizim mavzusi
          </CommandItem>

          <CommandItem
            value={searchableText("Tizimdan chiqish")}
            onSelect={() =>
              run(() => {
                logout();
                void credentials.preventSilentSignIn();
                router.replace(ROUTES.login);
              })
            }
            keywords={["chiqish", "logout"]}
          >
            <LogOut />
            Tizimdan chiqish
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
