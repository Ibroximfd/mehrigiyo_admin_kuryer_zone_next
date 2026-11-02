"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Lock, SearchX, Star, UserRoundCog } from "lucide-react";
import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { DateRangeField } from "@/components/kit/date-range";
import { KeyFigures, Section } from "@/components/kit/key-figures";
import { SelectField } from "@/components/kit/select-field";
import { EmptyView, ErrorView, TableSkeleton } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefCouriers } from "@/features/chief/api";
import type { ChiefMe } from "@/features/chief/types";
import { regionLabel } from "@/features/orders/regions";
import { errorMessage } from "@/lib/api-client";
import { isAccessDenied, isEndpointMissing } from "@/lib/api-availability";
import { formatDateTime, groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { formatRating, hasActiveRatingFilters, STARS } from "../types";
import type { ChiefRatings, CourierRating, RatingFilters, RatingFormula, RatingRow, StarDistribution } from "../types";
import { useChiefRatings } from "../use-ratings";

const COMMENT_STATES = ["yes", "no"] as const;

/** Filtrlar URLda — havola ulashilsa ayni ko'rinish ochiladi. */
function useRatingFilters() {
  const [state, setState] = useQueryStates({
    from: parseAsString,
    to: parseAsString,
    stars: parseAsArrayOf(parseAsInteger),
    courier: parseAsInteger,
    region: parseAsString,
    comment: parseAsStringLiteral(COMMENT_STATES),
    page: parseAsInteger,
  });
  const filters: RatingFilters = {
    dateFrom: state.from || null,
    dateTo: state.to || null,
    stars: (state.stars ?? []).filter((value) => value >= 1 && value <= 5),
    courierId: state.courier,
    region: state.region || null,
    hasComment: state.comment === null ? null : state.comment === "yes",
    page: Math.max(1, state.page ?? 1),
  };
  // Har filtr o'zgarishi 1-sahifaga qaytaradi.
  const patch = (next: Partial<typeof state>) => void setState({ ...next, page: null });
  return {
    filters,
    patch,
    setPage: (page: number) => void setState({ page: page > 1 ? page : null }),
    clear: () => void setState({ from: null, to: null, stars: null, courier: null, region: null, comment: null, page: null }),
  };
}

/**
 * Reytinglar (`ILOVA_HOLAT…` §7.1): o'z kuryerlaringiz baholari — jamlanma, kuryerlar
 * bo'yicha va qatorlar. Hamma son serverdan (formula ham), `null` → «—».
 */
export function RatingsView({ me }: { me: ChiefMe }) {
  const { filters, patch, setPage, clear } = useRatingFilters();
  const ratings = useChiefRatings(filters);
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const filtered = hasActiveRatingFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <DateRangeField
          from={filters.dateFrom ?? ""}
          to={filters.dateTo ?? ""}
          onChange={(from, to) => patch({ from: from || null, to: to || null })}
          onClear={() => patch({ from: null, to: null })}
          className="self-start"
        />
        <StarToggles
          value={filters.stars}
          onChange={(stars) => patch({ stars: stars.length ? stars : null })}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-1">
          <SelectField
            label="Kuryer"
            allLabel="Hamma kuryer"
            value={filters.courierId === null ? null : String(filters.courierId)}
            options={(couriers.data ?? []).map((courier) => ({ value: String(courier.id), label: courier.fullName, translate: false }))}
            onChange={(value) => patch({ courier: value === null ? null : Number(value) })}
            className="lg:w-48"
          />
          {me.regions.length > 1 ? (
            <SelectField
              label="Viloyat"
              allLabel="Hamma viloyat"
              value={filters.region}
              options={me.regions.map((code) => ({ value: code, label: regionLabel(code) }))}
              onChange={(value) => patch({ region: value })}
              className="lg:w-44"
            />
          ) : null}
          <SelectField
            label="Izoh"
            allLabel="Izohli va izohsiz"
            value={filters.hasComment === null ? null : filters.hasComment ? "yes" : "no"}
            options={[
              { value: "yes", label: "Izohi bor" },
              { value: "no", label: "Izohsiz" },
            ]}
            onChange={(value) => patch({ comment: value === "yes" || value === "no" ? value : null })}
            className="lg:w-44"
          />
        </div>
        {filtered ? (
          <Button variant="ghost" onClick={clear} className="self-start">
            Filtrni tozalash
          </Button>
        ) : null}
      </div>

      {ratings.isPending ? (
        <RatingsSkeleton />
      ) : ratings.isError && isAccessDenied(ratings.error) ? (
        <EmptyView
          Icon={Lock}
          title="Reytinglar sizga ochilmagan"
          description="Dopuskni asosiy filialning bosh logisti beradi."
          className="border-line bg-surface rounded-2xl border"
        />
      ) : ratings.isError && isEndpointMissing(ratings.error) ? (
        <EmptyView
          Icon={UserRoundCog}
          title="Reytinglar backend'ni kutmoqda"
          description="Server bu bo'limni chiqarishi bilan baholar shu yerda ko'rinadi."
          className="border-line bg-surface rounded-2xl border"
        />
      ) : ratings.isError ? (
        <ErrorView
          message={errorMessage(ratings.error, "Reytinglarni yuklashda xatolik")}
          onRetry={() => void ratings.refetch()}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : ratings.data.summary.count === 0 && ratings.data.rows.length === 0 ? (
        filtered ? (
          <EmptyView
            Icon={SearchX}
            title="Bu filtr bo'yicha baho yo'q"
            description="Sana, yulduz yoki kuryer filtrini o'zgartiring."
            action={
              <Button variant="outline" onClick={clear}>
                Filtrni tozalash
              </Button>
            }
            className="border-line bg-surface rounded-2xl border"
          />
        ) : (
          <EmptyView
            Icon={Star}
            title="Hali baho yo'q"
            description="Mijoz yetkazilgan zakazdan keyin kuryerni ilovada baholaydi — baholar shu yerda chiqadi."
            className="border-line bg-surface rounded-2xl border"
          />
        )
      ) : (
        <RatingsBody
          data={ratings.data}
          page={filters.page}
          isFetching={ratings.isFetching}
          onPage={setPage}
        />
      )}
    </div>
  );
}

/** Yulduz filtri — bir nechtasini tanlash mumkin (`stars=1,2`). */
function StarToggles({ value, onChange }: { value: number[]; onChange: (stars: number[]) => void }) {
  return (
    <div role="group" aria-label="Yulduz" className="flex flex-wrap gap-1.5">
      {STARS.map((star) => {
        const active = value.includes(star);
        return (
          <button
            key={star}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((item) => item !== star) : [...value, star])}
            className={cn(
              "flex h-(--control-h) items-center gap-1 rounded-full border px-3 text-dense font-medium transition-colors duration-(--dur-micro)",
              active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            <span className="tabular">{star}</span>
            <Star aria-hidden className={cn("size-3.5", active ? "fill-current" : "")} />
          </button>
        );
      })}
    </div>
  );
}

function RatingsBody({
  data,
  page,
  isFetching,
  onPage,
}: {
  data: ChiefRatings;
  page: number;
  isFetching: boolean;
  onPage: (page: number) => void;
}) {
  const { summary } = data;
  return (
    <>
      <KeyFigures
        items={[
          { label: "O'rtacha baho", value: formatRating(summary.avg), hint: summary.avg === null ? "baho yo'q" : "1–5 yulduz" },
          { label: "Baholar soni", value: groupThousands(summary.count) },
          { label: "Izohli", value: groupThousands(summary.withComment) },
          { label: "Past baholar", value: groupThousands(summary.lowCount), tone: summary.lowCount > 0 ? "warn" : "default" },
        ]}
      />
      <Section title="Yulduz taqsimoti">
        <Distribution distribution={summary.distribution} total={summary.count} />
      </Section>
      <CourierRatings rows={data.byCourier} formula={data.formula} />
      <Section
        title="Baholar"
        description="Mijoz ismi ko'rsatilmaydi — nizo bo'lsa zakaz raqami orqali topiladi."
        action={<Pager page={page} hasMore={data.hasMore} total={data.total} busy={isFetching} onPage={onPage} />}
      >
        {data.rows.length === 0 ? (
          <EmptyView Icon={SearchX} title="Bu sahifada baho yo'q" className="border-line bg-surface rounded-2xl border" />
        ) : (
          <RatingRows rows={data.rows} />
        )}
      </Section>
    </>
  );
}

function Distribution({ distribution, total, compact = false }: { distribution: StarDistribution; total: number; compact?: boolean }) {
  return (
    <ul className={cn("flex flex-col", compact ? "gap-0.5" : "border-line bg-surface gap-2 rounded-2xl border p-4")}>
      {STARS.map((star) => {
        const count = distribution[star];
        const share = total > 0 ? (count / total) * 100 : 0;
        return (
          <li key={star} className="flex items-center gap-2">
            <span className={cn("text-ink-muted tabular inline-flex items-center gap-0.5", compact ? "text-fine" : "text-meta")}>
              {star}
              <Star aria-hidden className="size-3" />
            </span>
            {/* Ulush chizig'i — eni hisoblangan qiymat, token emas. */}
            <span aria-hidden className={cn("bg-subtle flex-1 overflow-hidden rounded-full", compact ? "h-1" : "h-2")}>
              <span className={cn("block h-full rounded-full", star <= 2 ? "bg-warn" : "bg-brand")} style={{ width: `${share}%` }} />
            </span>
            <span className={cn("text-ink tabular min-w-6 text-right", compact ? "text-fine" : "text-meta")}>{groupThousands(count)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Kuryerlar bo'yicha — server formulasi (`formula.score`) ustun nomi va izohi bilan. */
function CourierRatings({ rows, formula }: { rows: CourierRating[]; formula: RatingFormula | null }) {
  if (rows.length === 0) return null;
  const scoreLabel = formula?.name ?? "Reyting";
  return (
    <Section title="Kuryerlar bo'yicha" description={formula?.how ?? undefined}>
      {formula?.nullWhen ? (
        <p className="text-ink-faint -mt-2 text-meta">
          «—» — <span>{formula.nullWhen}</span>
        </p>
      ) : null}
      <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
        {rows.map((row) => (
          <li key={row.courier.id} className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-4">
            <span className="col-span-2 min-w-0 sm:col-span-1">
              <span className="text-ink block truncate text-dense font-semibold" data-no-translit>{row.courier.name}</span>
              {row.courier.region ? <span className="text-ink-faint text-meta">{regionLabel(row.courier.region)}</span> : null}
            </span>
            <span>
              <span className="text-ink-faint block text-meta">{scoreLabel}</span>
              <span className="text-ink tabular text-lg2 font-semibold">{formatRating(row.score)}</span>
            </span>
            <span>
              <span className="text-ink-faint block text-meta">O&apos;rtacha</span>
              <span className="text-ink tabular text-dense">{formatRating(row.avg)}</span>
              <span aria-hidden className="text-ink-faint text-meta">{" · "}</span>
              <span className="text-ink-faint tabular text-meta">{`${groupThousands(row.count)} ta baho`}</span>
            </span>
            <span className="col-span-2 sm:col-span-1">
              <Distribution distribution={row.distribution} total={row.count} compact />
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function StarsValue({ stars }: { stars: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars} yulduz`}>
      {STARS.slice()
        .reverse()
        .map((star) => (
          <Star key={star} aria-hidden className={cn("size-3.5", star <= stars ? (stars <= 2 ? "text-warn fill-current" : "text-brand fill-current") : "text-line-strong")} />
        ))}
    </span>
  );
}

/** Qatorlar: kengda jadval, torda karta (gorizontal scroll yo'q). */
function RatingRows({ rows }: { rows: RatingRow[] }) {
  return (
    <>
      <div className="border-line bg-surface hidden overflow-hidden rounded-2xl border md:block">
        <table className="w-full text-dense">
          <thead>
            <tr className="text-ink-faint border-line border-b text-meta">
              <th className="px-4 py-2.5 text-left font-medium">Zakaz</th>
              <th className="px-3 py-2.5 text-left font-medium">Kuryer</th>
              <th className="px-3 py-2.5 text-left font-medium">Yulduz</th>
              <th className="px-3 py-2.5 text-left font-medium">Izoh</th>
              <th className="px-4 py-2.5 text-right font-medium">Sana</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-line border-b align-top last:border-0">
                <td className="text-ink tabular px-4 py-2.5 font-medium" data-no-translit>{row.orderNumber || "—"}</td>
                <td className="text-ink px-3 py-2.5" data-no-translit>{row.courier?.name ?? "—"}</td>
                <td className="px-3 py-2.5"><StarsValue stars={row.stars} /></td>
                <td className="text-ink-muted max-w-md px-3 py-2.5" data-no-translit>{row.comment ?? "—"}</td>
                <td className="text-ink-muted tabular px-4 py-2.5 text-right whitespace-nowrap">{row.createdAt ? formatDateTime(row.createdAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1.5 px-4 py-3">
            <span className="flex items-center justify-between gap-2">
              <span className="text-ink tabular text-dense font-semibold" data-no-translit>{row.orderNumber || "—"}</span>
              <StarsValue stars={row.stars} />
            </span>
            <span className="text-ink-muted text-meta">
              <span data-no-translit>{row.courier?.name ?? "—"}</span>
              {row.createdAt ? <span className="tabular">{` · ${formatDateTime(row.createdAt)}`}</span> : null}
            </span>
            {row.comment ? <p className="text-ink text-dense" data-no-translit>{row.comment}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function Pager({
  page,
  hasMore,
  total,
  busy,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  total: number | null;
  busy: boolean;
  onPage: (page: number) => void;
}) {
  if (page === 1 && !hasMore) return total !== null ? <span className="text-ink-faint tabular text-meta">{`${groupThousands(total)} ta`}</span> : null;
  return (
    <span className="flex items-center gap-1">
      {total !== null ? <span className="text-ink-faint tabular mr-1 text-meta">{`${groupThousands(total)} ta`}</span> : null}
      <Button size="icon-sm" variant="outline" aria-label="Oldingi sahifa" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
        <ChevronLeft />
      </Button>
      <span className="text-ink tabular min-w-8 text-center text-meta">{page}</span>
      <Button size="icon-sm" variant="outline" aria-label="Keyingi sahifa" disabled={!hasMore || busy} onClick={() => onPage(page + 1)}>
        <ChevronRight />
      </Button>
    </span>
  );
}

function RatingsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Yuklanmoqda">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <TableSkeleton rows={6} className="border-line overflow-hidden rounded-2xl border" />
    </div>
  );
}
