"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Info, LoaderCircle, MapPin, Navigation, Star, UsersRound } from "lucide-react";

import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCourierCandidates } from "@/features/couriers/api";
import {
  candidateReasonText,
  formatDistance,
  groupCandidates,
  tierLabel,
} from "@/features/couriers/candidates";
import type { CourierCandidate, CourierCandidates } from "@/features/couriers/candidates";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Buyurtma uchun nomzod kuryerlar — guruhlangan, server tartibida:
 * "Zona kuryerlari" (asosiy + ikkinchi), "Qo'shni zona", "Viloyat".
 * Smenadan tashqaridagilar xira, server taklifi yulduzcha bilan.
 *
 * Tanlash natijasini chaqiruvchi hal qiladi: detal oynasi darhol biriktiradi,
 * avto-taqsimlash rejasi esa faqat qatorni almashtiradi.
 */
export function CourierCandidatesList({
  orderId,
  currentCourierId,
  pendingCourierId,
  onPick,
  disabled = false,
  source,
}: {
  orderId: string;
  /**
   * Nomzodlar manbai. Sukut — logist (`orders/{id}/courier-candidates/`);
   * bosh kuryer o'z jamoasidan oladi (`chief/orders/{id}/candidates/`).
   */
  source?: {
    queryKey: readonly unknown[];
    fetch: (orderId: string, signal?: AbortSignal) => Promise<CourierCandidates>;
  };
  /** Hozir biriktirilgan (yoki rejadagi) kuryer — belgilanadi. */
  currentCourierId: number | null;
  /** Saqlanayotgan tanlov — aylanuvchi belgi. */
  pendingCourierId?: number | null;
  onPick: (candidate: CourierCandidate) => void;
  disabled?: boolean;
}) {
  const candidates = useQuery({
    queryKey: source?.queryKey ?? queryKeys.courierCandidates(orderId),
    queryFn: ({ signal }) => (source?.fetch ?? fetchCourierCandidates)(orderId, signal),
    staleTime: 15_000,
    retry: 1,
  });

  if (candidates.isPending) {
    return (
      <div className="space-y-1.5" aria-busy>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (candidates.isError) {
    return (
      <ErrorView
        message={errorMessage(candidates.error, "Nomzod kuryerlarni yuklashda xatolik")}
        onRetry={() => void candidates.refetch()}
      />
    );
  }

  const data = candidates.data;
  const groups = groupCandidates(data.candidates);
  const reason = candidateReasonText(data.reason);

  return (
    <div className="space-y-3">
      {data.zone ? (
        <p className="text-ink-muted flex items-center gap-1.5 text-meta">
          <MapPin className="text-brand size-3.5 shrink-0" aria-hidden />
          Buyurtma zonasi:
          <span className="text-ink font-semibold" data-no-translit>
            {data.zone.name}
          </span>
        </p>
      ) : null}

      {reason ? (
        <p role="status" className="bg-warn-soft text-warn flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-meta font-medium">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          {reason}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <EmptyView
          Icon={UsersRound}
          title="Nomzod kuryer yo'q"
          description="Bu hududda faol kuryer topilmadi — zonalarni admin panelda tekshiring."
        />
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-label={group.title}>
            <h3 className="text-ink-faint text-micro mb-1 px-1 font-bold tracking-widest uppercase">
              {`${group.title} · ${group.items.length}`}
            </h3>
            <ul className="space-y-1">
              {group.items.map((candidate) => (
                <CandidateRow
                  key={candidate.courier.id}
                  candidate={candidate}
                  current={candidate.courier.id === currentCourierId}
                  pending={candidate.courier.id === pendingCourierId}
                  disabled={disabled}
                  onPick={() => onPick(candidate)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  current,
  pending,
  disabled,
  onPick,
}: {
  candidate: CourierCandidate;
  current: boolean;
  pending: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const { courier } = candidate;
  const distance = formatDistance(candidate.distanceM);
  const offShift = !courier.onShift;

  return (
    <li>
      <button
        type="button"
        disabled={disabled || current}
        onClick={onPick}
        className={cn(
          "border-line flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left",
          "transition-colors duration-(--dur-micro)",
          "hover:border-brand hover:bg-brand-soft disabled:cursor-default",
          current && "border-brand bg-brand-soft",
          offShift && !current && "opacity-55",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            offShift ? "bg-line-strong" : courier.online ? "bg-ok" : "bg-warn",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="text-ink flex items-center gap-1 text-dense font-semibold">
            {candidate.suggested ? (
              <Star className="text-gold fill-current size-3.5 shrink-0" aria-label="Taklif" />
            ) : null}
            <span className="truncate" data-no-translit>
              {courier.fullName || `#${courier.id}`}
            </span>
          </span>
          <span className="text-ink-faint flex flex-wrap items-center gap-x-1.5 text-fine">
            <span>{tierLabel(candidate.tier)}</span>
            <span>· {`${candidate.load} ta ochiq`}</span>
            {distance ? (
              <span className="inline-flex items-center gap-0.5">
                · <Navigation className="size-2.5" aria-hidden />
                {distance}
              </span>
            ) : null}
            {candidate.familiar ? <span className="text-ok">· tanish manzil</span> : null}
            {offShift ? <span>· smenada emas</span> : null}
          </span>
        </span>
        {pending ? (
          <LoaderCircle className="text-brand size-4 shrink-0 animate-spin" aria-hidden />
        ) : current ? (
          <Check className="text-brand size-4 shrink-0" aria-label="Tanlangan" />
        ) : null}
      </button>
    </li>
  );
}
