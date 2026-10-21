"use client";

import { Check, UserRound } from "lucide-react";
import { useState } from "react";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useT } from "@/shared/i18n/locale";
import { formatPhone } from "@/shared/lib/phone";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SearchInput } from "@/shared/ui/search-input";
import { Skeleton } from "@/shared/ui/skeleton";
import { InlineError } from "@/shared/ui/states";

import { useCashUsers } from "../hooks/use-zones";
import { CASH_USERS_LIMIT, toCashPersonValue, type CashPersonValue, type CashUser } from "../model/cash-user";

type CashUserPickerProps = {
  value: CashPersonValue | null;
  onChange: (value: CashPersonValue) => void;
  invalid?: boolean;
  describedBy?: string;
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Kassa-shaxs tanlovi: server qidiruvi (`/api/admin/cash-users/?search=`).
 * Tanlangan xodim tepada turadi; tahrirda nomi zonaning `cash_point.name`
 * dan keladi — qidiruv ochilmaguncha so'rov yuborilmaydi.
 */
export function CashUserPicker({ value, onChange, invalid, describedBy }: CashUserPickerProps) {
  const t = useT();
  const [searching, setSearching] = useState(value === null);
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const users = useCashUsers(search, searching);

  const pick = (user: CashUser) => {
    onChange(toCashPersonValue(user));
    setSearching(false);
    setQuery("");
  };

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border border-line p-2", invalid && "border-danger")} aria-describedby={describedBy}>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <UserRound className="size-4 shrink-0 text-ink-faint" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{value.name}</span>
            <span className="block text-xs text-ink-faint tabular">ID {value.userId}</span>
          </span>
          {searching ? null : (
            <Button variant="outline" size="sm" onClick={() => setSearching(true)}>
              {t.zones.personChange}
            </Button>
          )}
        </div>
      ) : null}

      {searching ? (
        <>
          <SearchInput value={query} onValueChange={setQuery} placeholder={t.zones.personSearch} />
          <CashUserResults
            query={search}
            users={users.data}
            isPending={users.isPending}
            isFetching={users.isFetching}
            error={users.isError ? users.error : null}
            onRetry={() => void users.refetch()}
            selectedId={value?.userId ?? null}
            onPick={pick}
          />
        </>
      ) : null}
    </div>
  );
}

type CashUserResultsProps = {
  query: string;
  users: readonly CashUser[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  selectedId: number | null;
  onPick: (user: CashUser) => void;
};

function CashUserResults({ query, users, isPending, isFetching, error, onRetry, selectedId, onPick }: CashUserResultsProps) {
  const t = useT();
  if (error) return <InlineError error={error} onRetry={onRetry} className="px-2 py-3" />;
  if (isPending || !users) {
    return (
      <div className="flex flex-col gap-1 px-2 py-1" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <p role="status" className="px-2 py-6 text-center text-sm text-ink-faint">
        {query.trim() ? t.zones.personNoResults(query.trim()) : t.zones.personEmpty}
      </p>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1 transition-opacity", isFetching && "opacity-60")} aria-busy={isFetching}>
      <ul className="max-h-(--list-max-h) overflow-y-auto overscroll-contain">
        {users.map((user) => (
          <li key={user.userId}>
            <CashUserRow user={user} selected={user.userId === selectedId} onPick={() => onPick(user)} />
          </li>
        ))}
      </ul>
      {users.length >= CASH_USERS_LIMIT ? (
        <p className="px-2 pb-1 text-xs text-ink-faint">{t.zones.personLimit(CASH_USERS_LIMIT)}</p>
      ) : null}
    </div>
  );
}

function CashUserRow({ user, selected, onPick }: { user: CashUser; selected: boolean; onPick: () => void }) {
  const t = useT();
  const details = [user.phone ? formatPhone(user.phone) : null, user.filial ? t.zones.personFilial(user.filial.name) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/40",
        selected && "bg-brand-soft",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{user.name}</span>
        {details ? <span className="block truncate text-xs text-ink-faint tabular">{details}</span> : null}
      </span>
      {user.isAdmin ? <Badge tone="info">{t.zones.roleAdmin}</Badge> : null}
      {user.isLogist ? <Badge tone="brand">{t.zones.roleLogist}</Badge> : null}
      {selected ? <Check className="size-4 shrink-0 text-brand" aria-hidden /> : null}
    </button>
  );
}
