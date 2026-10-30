"use client";

import {
  Banknote,
  BatteryMedium,
  Clock3,
  Footprints,
  Gauge,
  MessageSquare,
  Package,
  PackageCheck,
  Phone,
  Receipt,
  X,
} from "lucide-react";
import Link from "next/link";

import { CallButton } from "@/components/kit/call-button";
import { Button } from "@/components/ui/button";
import { CourierAvatar } from "@/features/couriers/components/courier-avatar";
import {
  alertLabel,
  alertTone,
  formatAgo,
  formatBattery,
  formatSpeed,
  freshness,
  markerTone,
} from "@/features/couriers/live-tracking";
import type { LiveCourier } from "@/features/couriers/live-tracking";
import { formatDistance, formatPhone, formatSom } from "@/lib/format";
import { distanceMeters } from "@/lib/maps";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const FRESHNESS_TONE = {
  fresh: "text-ok",
  aging: "text-warn",
  lost: "text-ink-muted",
} as const;

/**
 * Marker bosilganda ochiladigan yon karta (§7.3): ism, telefon, oxirgi
 * vaqt, tezlik, batareya, bugungi yetkazish va naqd (`today.cod_total`),
 * ogohlantirishlar, joriy buyurtma va unga masofa,
 * "Buyurtmalari" · "Chat" · "Kun izi".
 */
export function CourierMapCard({
  courier,
  now,
  onClose,
  onTrack,
  className,
}: {
  courier: LiveCourier;
  now: Date;
  onClose: () => void;
  onTrack: () => void;
  className?: string;
}) {
  const point = courier.lastLocation;
  const fresh = freshness(point?.at ?? null, now);
  const order = courier.currentOrder;
  const distance =
    point && order?.point ? distanceMeters(point, order.point) : null;

  return (
    <aside
      aria-label={`${courier.fullName} — jonli holat`}
      className={cn(
        "border-line bg-surface elev-2 flex w-full flex-col gap-3 rounded-xl border p-3.5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CourierAvatar courier={courier} tone={markerTone(courier, now)} />
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate text-body font-semibold" data-no-translit>
            {courier.fullName}
          </p>
          <p className="text-ink-muted tabular flex items-center gap-1 text-meta">
            <Phone className="size-3" aria-hidden />
            <a href={`tel:+${courier.phone.replace(/\D/g, "")}`} className="hover:underline">
              {formatPhone(courier.phone)}
            </a>
            <CallButton phone={courier.phone} />
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Kartani yopish"
          className="-mt-1 -mr-1 size-8"
        >
          <X className="size-4" />
        </Button>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Metric
          Icon={Clock3}
          label="Oxirgi nuqta"
          value={point?.at ? formatAgo(point.at, now) : "aloqa yo'q"}
          tone={FRESHNESS_TONE[fresh]}
        />
        <Metric
          Icon={Gauge}
          label="Tezlik"
          value={point?.speed !== null && point?.speed !== undefined ? formatSpeed(point.speed) : "—"}
        />
        <Metric
          Icon={BatteryMedium}
          label="Batareya"
          value={courier.battery !== null ? formatBattery(courier.battery) : "—"}
          tone={courier.battery !== null && courier.battery <= 15 ? "text-danger" : undefined}
        />
      </dl>

      <dl className="-mt-1 grid grid-cols-2 gap-2">
        <Metric
          Icon={PackageCheck}
          label="Bugun yetkazilgan"
          value={`${courier.today.delivered}/${courier.today.assigned}`}
        />
        <Metric
          Icon={Banknote}
          label="Yig'ilgan naqd"
          value={courier.today.codTotal !== null ? formatSom(courier.today.codTotal) : "—"}
        />
      </dl>

      {courier.alerts.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Ogohlantirishlar">
          {courier.alerts.map((alert) => (
            <li
              key={alert}
              className={cn(
                "rounded-full border px-2 py-0.5 text-fine font-medium",
                alertTone(alert) === "danger"
                  ? "border-danger/30 bg-danger-soft text-danger"
                  : "border-warn/30 bg-warn-soft text-warn",
              )}
            >
              {alertLabel(alert)}
            </li>
          ))}
        </ul>
      ) : null}

      {order ? (
        <Link
          href={ROUTES.orderDetail(order.id)}
          className="bg-subtle hover:bg-line/60 flex items-start gap-2 rounded-lg p-2.5 transition-colors"
        >
          <Package className="text-brand mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="text-ink block text-dense font-semibold">
              {order.orderNumber ? `#${order.orderNumber}` : "Joriy buyurtma"}
            </span>
            {order.addressText ? (
              <span className="text-ink-muted block truncate text-meta" data-no-translit>
                {order.addressText}
              </span>
            ) : null}
          </span>
          {distance !== null ? (
            <span className="text-ink-muted tabular shrink-0 text-meta" title="To'g'ri chiziq bo'yicha masofa">
              {formatDistance(distance)}
            </span>
          ) : null}
        </Link>
      ) : (
        <p className="text-ink-faint text-meta">Hozir yo&apos;lda buyurtmasi yo&apos;q</p>
      )}

      <div className="flex gap-1.5">
        <ActionLink href={`${ROUTES.orders}?courier=${courier.id}&view=list&period=all`} Icon={Receipt}>
          Buyurtmalari
        </ActionLink>
        {order ? (
          <ActionLink href={ROUTES.orderDetail(order.id)} Icon={MessageSquare}>
            Chat
          </ActionLink>
        ) : (
          <span
            className="border-line text-ink-faint flex flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-full border px-2 py-2 text-fine font-medium"
            title="Chat buyurtma bo'yicha ochiladi — hozir yo'lda buyurtma yo'q"
          >
            <MessageSquare className="size-3.5" aria-hidden />
            Chat
          </span>
        )}
        <button
          type="button"
          onClick={onTrack}
          className="border-line text-ink hover:bg-subtle flex flex-1 items-center justify-center gap-1 rounded-full border px-2 py-2 text-fine font-medium transition-colors"
        >
          <Footprints className="size-3.5" aria-hidden />
          Kun izi
        </button>
      </div>
    </aside>
  );
}

function Metric({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-subtle min-w-0 rounded-lg p-2">
      <dt className="text-ink-faint flex items-center gap-1 text-fine font-medium">
        <Icon className="size-3" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn("tabular mt-0.5 truncate text-dense font-semibold", tone ?? "text-ink")}>
        {value}
      </dd>
    </div>
  );
}

function ActionLink({
  href,
  Icon,
  children,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border-line text-ink hover:bg-subtle flex flex-1 items-center justify-center gap-1 rounded-full border px-2 py-2 text-fine font-medium transition-colors"
    >
      <Icon className="size-3.5" />
      {children}
    </Link>
  );
}
