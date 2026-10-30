"use client";

import { LoaderCircle, MessageCircle, SearchX, Users, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

import { SearchInput } from "@/components/kit/search-input";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PeerAvatar } from "@/features/staff-chat/components/peer-avatar";
import { memberKey, memberStatusText, searchTeamMembers } from "@/features/staff-chat/team";
import type { TeamMember } from "@/features/staff-chat/team";
import { useTeamMembers } from "@/features/staff-chat/use-team-chat";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Jamoa guruhi a'zolari (Telegram'dagidek): ism yoki telefon bo'yicha
 * qidiruv, odamni bosish → "Xabar yozish" → shaxsiy chat ochiladi (yoki
 * mavjudi). Ro'yxat varaq ochilganda yuklanadi.
 */
export function TeamMembersSheet({
  open,
  onOpenChange,
  onMessage,
  pendingKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessage: (member: TeamMember) => void;
  /** Ochilayotgan chat (`memberKey`) — tugmada indikator. */
  pendingKey: string | null;
}) {
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { members, state, refetch, isFetching } = useTeamMembers(open);
  const online = useOnlineStatus();
  const visible = useMemo(() => searchTeamMembers(members, search), [members, search]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSearch("");
          setSelectedKey(null);
        }
      }}
    >
      <SheetContent side="right" className="flex w-[420px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0">
        <div className="border-line border-b px-5 py-4 pr-12">
          <SheetTitle className="text-ink text-base font-semibold">Guruh a&apos;zolari</SheetTitle>
          <SheetDescription className="text-ink-muted mt-1 text-meta">
            {state === "ready" ? `${members.length} kishi · logistlar va kuryerlar` : "Logistlar va kuryerlar"}
          </SheetDescription>
        </div>

        {state === "ready" && members.length > 0 ? (
          <div className="border-line border-b p-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Ism yoki telefon..."
              autoFocusShortcut={false}
            />
          </div>
        ) : null}

        {!online && state === "ready" ? (
          <p
            role="status"
            className="border-line bg-subtle text-ink-muted flex items-center gap-2 border-b px-4 py-2 text-meta"
          >
            <WifiOff className="size-3.5" aria-hidden />
            Internet yo&apos;q — ro&apos;yxat oxirgi yuklangan holatda.
          </p>
        ) : null}

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {state === "loading" ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : null}

          {state === "soon" ? (
            <EmptyView
              Icon={Users}
              title="Tez orada"
              description="Jamoa chati serverda hali yoqilmagan. Tayyor bo'lgach a'zolar shu yerda ko'rinadi."
              className="border-none bg-transparent"
            />
          ) : null}

          {state === "error" ? (
            <ErrorView
              message="A'zolarni yuklashda xatolik"
              onRetry={() => void refetch()}
              className="m-3"
            />
          ) : null}

          {state === "ready" && members.length === 0 ? (
            <EmptyView
              Icon={Users}
              title="A'zolar yo'q"
              description="Guruhda hali hech kim yo'q."
              className="border-none bg-transparent"
            />
          ) : null}

          {state === "ready" && members.length > 0 && visible.length === 0 ? (
            <EmptyView
              Icon={SearchX}
              title="Hech kim topilmadi"
              description="Ism yoki telefon raqamini boshqacha yozib ko'ring."
              action={
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Qidiruvni tozalash
                </Button>
              }
              className="border-none bg-transparent"
            />
          ) : null}

          {state === "ready" && visible.length > 0 ? (
            <ul aria-label="Guruh a'zolari" className="space-y-0.5 p-2" aria-busy={isFetching}>
              {visible.map((member) => {
                const key = memberKey(member);
                return (
                  <MemberRow
                    key={key}
                    member={member}
                    selected={selectedKey === key}
                    pending={pendingKey === key}
                    onToggle={() => setSelectedKey((current) => (current === key ? null : key))}
                    onMessage={() => onMessage(member)}
                  />
                );
              })}
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MemberRow({
  member,
  selected,
  pending,
  onToggle,
  onMessage,
}: {
  member: TeamMember;
  selected: boolean;
  pending: boolean;
  onToggle: () => void;
  onMessage: () => void;
}) {
  const status = memberStatusText(member);

  return (
    <li className={cn("rounded-xl", selected && "bg-subtle")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-(--dur-micro)",
          "focus-visible:ring-brand/30 focus-visible:ring-[3px] focus-visible:outline-none",
          !selected && "hover:bg-subtle",
        )}
      >
        <PeerAvatar
          id={member.id}
          fullName={member.fullName}
          avatarUrl={member.avatarUrl}
          online={member.online}
          onShift={member.onShift}
        />
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-dense font-medium" data-no-translit>
            {member.fullName || formatPhone(member.phone)}
          </span>
          <span className="text-ink-muted flex items-center gap-1.5 text-meta">
            <span>{member.roleLabel}</span>
            {status ? (
              <>
                <span aria-hidden>·</span>
                <span className={cn(member.online && "text-ok")}>{status}</span>
              </>
            ) : null}
          </span>
        </span>
      </button>

      {selected ? (
        <div className="flex items-center gap-2 px-2.5 pb-2.5 pl-15">
          {member.phone ? (
            <span className="text-ink-muted tabular min-w-0 flex-1 truncate text-meta" data-no-translit>
              {formatPhone(member.phone)}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          <Button size="sm" onClick={onMessage} disabled={pending}>
            {pending ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="size-3.5" aria-hidden />
            )}
            Xabar yozish
          </Button>
        </div>
      ) : null}
    </li>
  );
}
