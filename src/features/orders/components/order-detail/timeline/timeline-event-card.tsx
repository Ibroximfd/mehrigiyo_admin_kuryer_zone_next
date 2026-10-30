import {
  Bell,
  Check,
  CircleDot,
  CreditCard,
  MapPin,
  MessageSquare,
  Pencil,
  PhoneCall,
  Plus,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { LinkifiedText } from "@/components/kit/linkified-text";
import type { TimelineIcon, TimelineItem, TimelineTone } from "@/features/orders/timeline";
import { formatShortDateTime, formatSmartTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<TimelineIcon, LucideIcon> = {
  edit: Pencil,
  status: CircleDot,
  ok: Check,
  create: Plus,
  push: Bell,
  call: PhoneCall,
  note: MessageSquare,
  truck: Truck,
  attempt: TriangleAlert,
  payment: CreditCard,
  map: MapPin,
};

const TONES: Record<TimelineTone, string> = {
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  warn: "bg-amber-soft text-gold",
  danger: "bg-danger-soft text-danger",
  muted: "bg-surface-3 text-ink-muted",
};

function timeLabel(at: Date | null): string {
  if (!at) return "";
  const smart = formatSmartTime(at);
  // Bugungi — "bugun 08:40", kechagisi — "kecha 17:02", eskisi — sana.
  if (smart === formatTime(at)) return `bugun ${smart}`;
  if (smart === "Kecha") return `kecha ${formatTime(at)}`;
  return formatShortDateTime(at);
}

/**
 * Tarix yozuvi — dizayndagi `.ev`: rangli belgi doirasi, kartochka ichida
 * sarlavha · kim · vaqt, matn va diff bloki (eski qiymat chizilgan qizil,
 * yangisi yashil) + sabab.
 */
export function TimelineEventCard({ item }: { item: TimelineItem }) {
  const Icon = ICONS[item.icon];
  return (
    <li className="animate-in fade-in flex gap-3 duration-(--dur-standard)">
      <span
        aria-hidden
        className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-full", TONES[item.tone])}
      >
        <Icon className="size-3.5" strokeWidth={2.2} />
      </span>
      <div className="border-line bg-surface flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border px-3 py-2.5">
        <p className="text-ink-faint flex flex-wrap items-center gap-x-2 text-fine">
          <b className="text-ink text-meta font-semibold">{item.title}</b>
          {item.who ? (
            <>
              <span aria-hidden>·</span>
              <span>{item.who}</span>
            </>
          ) : null}
          {item.at ? (
            <time dateTime={item.at.toISOString()} className="tabular ml-auto">
              {timeLabel(item.at)}
            </time>
          ) : null}
        </p>
        {item.text ? (
          // Izoh — xodim yozgan matn, tarjima qilinmaydi; hodisa matni esa
          // (to'lov usuli, sabab yorlig'i) tarjima qilinadi.
          <p
            className="text-ink text-dense leading-snug whitespace-pre-wrap"
            data-no-translit={item.kind.startsWith("comment") ? "" : undefined}
          >
            {item.kind.startsWith("comment") ? <LinkifiedText text={item.text} /> : item.text}
          </p>
        ) : null}
        {item.diffs.length > 0 || item.reason ? (
          <dl className="bg-canvas grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 rounded-md px-2.5 py-2 text-meta">
            {item.diffs.map((diff) => (
              <DiffRow key={diff.key} label={diff.label} from={diff.from} to={diff.to} />
            ))}
            {item.reason ? (
              <>
                <dt className="text-ink-muted">Sabab</dt>
                <dd className="text-ink">{item.reason}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </div>
    </li>
  );
}

function DiffRow({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words">
        {from !== "—" ? <s className="text-danger mr-1.5">{from}</s> : null}
        <b className="text-ok font-semibold">{to}</b>
      </dd>
    </>
  );
}
