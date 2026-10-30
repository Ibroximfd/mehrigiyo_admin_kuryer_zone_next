"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { Crown, LoaderCircle, LogOut, UserMinus, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addChatMember,
  fetchChatCandidates,
  fetchChatMembers,
  leaveChat,
  memberRoleLabel,
  removeChatMember,
  sortMembers,
} from "@/features/staff-chat/membership";
import type { ChatMember, StaffCandidate } from "@/features/staff-chat/membership";
import { staffChatErrorMessage } from "@/features/staff-chat/error-hints";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";

/**
 * «Ishtirokchilar (N)» — zakaz chati sarlavhasida (Bitrix'dagi «Участники»).
 * Ro'yxat, «Odam qo'shish» (ism bilan), boshqasini «Chiqarish» va o'zi
 * «Chiqish». Kim kimni qo'sha/chiqara olishini server aytadi — rad etsa
 * sababi toast bilan.
 */
export function ChatMembersButton({
  channelId,
  onLeft,
}: {
  channelId: number;
  /** O'zi chiqqanda — xona yopiladi. */
  onLeft?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const members = useQuery({
    queryKey: queryKeys.staffChatMembers(channelId),
    queryFn: ({ signal }) => fetchChatMembers(channelId, signal),
    retry: false,
  });
  const count = members.data?.length ?? null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} title="Chat ishtirokchilari">
        <Users className="size-3.5" />
        <span className="hidden sm:inline">Ishtirokchilar</span>
        {count !== null ? <span className="tabular text-ink-muted">{count}</span> : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[400px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0">
          <div className="border-line border-b px-5 py-4 pr-12">
            <SheetTitle className="text-ink text-base font-semibold">Ishtirokchilar</SheetTitle>
            <SheetDescription className="text-ink-muted mt-1 text-meta">
              Chatni faqat ishtirokchilar ko&apos;radi. Admin — zakaz operatori.
            </SheetDescription>
          </div>
          {open ? (
            <MembersBody
              channelId={channelId}
              members={members}
              onLeft={() => {
                setOpen(false);
                onLeft?.();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MembersBody({
  channelId,
  members,
  onLeft,
}: {
  channelId: number;
  members: UseQueryResult<ChatMember[]>;
  onLeft: () => void;
}) {
  const queryClient = useQueryClient();
  const myId = Number(useAuthStore((state) => state.user?.id ?? NaN));
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const list = useMemo(() => sortMembers(members.data ?? []), [members.data]);
  const memberIds = new Set(list.map((member) => member.seatId));

  const setMembers = (next: ChatMember[]) =>
    queryClient.setQueryData(queryKeys.staffChatMembers(channelId), next);

  const add = useMutation({
    mutationFn: (candidate: StaffCandidate) => addChatMember(channelId, candidate.seatId),
    onSuccess: (next, candidate) => {
      setMembers(next);
      void queryClient.invalidateQueries({ queryKey: ["staff-chat", "candidates", channelId] });
      toast.success(`${candidate.fullName} chatga qo'shildi`);
    },
    onError: (error) => toast.error(staffChatErrorMessage(error, "Ishtirokchi qo'shishda xatolik")),
  });
  const remove = useMutation({
    mutationFn: (seatId: number) => removeChatMember(channelId, seatId),
    onSuccess: (next) => setMembers(next),
    onError: (error) => toast.error(staffChatErrorMessage(error, "Ishtirokchini chiqarishda xatolik")),
  });
  const leave = useMutation({
    mutationFn: () => leaveChat(channelId),
    onSuccess: () => {
      toast.success("Chatdan chiqdingiz");
      void queryClient.invalidateQueries({ queryKey: ["staff-chat"] });
      onLeft();
    },
    onError: (error) => toast.error(staffChatErrorMessage(error, "Chatdan chiqishda xatolik")),
  });

  const query = useDebouncedValue(search.trim(), 300);
  const pool = useQuery({
    queryKey: queryKeys.staffChatCandidates(channelId, query),
    queryFn: ({ signal }) => fetchChatCandidates(channelId, query, signal),
    enabled: adding,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    retry: false,
  });
  // Server ishtirokchilarni chiqarib beradi; yangi qo'shilgan hali keshda bo'lishi mumkin.
  const options = (pool.data ?? []).filter((candidate) => !memberIds.has(candidate.seatId));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {members.isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : members.isError ? (
          <p className="text-danger p-5 text-center text-meta">
            {staffChatErrorMessage(members.error, "Ishtirokchilarni yuklab bo'lmadi")}
          </p>
        ) : (
          <ul className="divide-line divide-y">
            {list.map((member) => {
              const me = member.seatId === myId;
              return (
                <li key={member.seatId} className="flex items-center gap-2.5 px-5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="text-ink flex items-center gap-1.5 text-dense font-semibold">
                      <span className="truncate" data-no-translit>{member.fullName}</span>
                      {member.roleInChat === "admin" ? <Crown className="text-gold size-3.5 shrink-0" aria-label="Chat admini" /> : null}
                      {me ? <span className="text-ink-faint text-fine font-normal">(siz)</span> : null}
                    </span>
                    <span className="text-ink-faint text-fine">{memberRoleLabel(member)}</span>
                  </span>
                  {me ? (
                    member.roleInChat === "admin" ? null : (
                      <Button size="sm" variant="ghost" disabled={leave.isPending} onClick={() => leave.mutate()}>
                        {leave.isPending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
                        Chiqish
                      </Button>
                    )
                  ) : member.roleInChat === "admin" ? null : (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${member.fullName}: chatdan chiqarish`}
                      title="Chatdan chiqarish"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(member.seatId)}
                    >
                      <UserMinus />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-line border-t p-3">
        {adding ? (
          <div className="flex flex-col gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Ism bo'yicha qidirish..." autoFocusShortcut={false} />
            <div className="scrollbar-thin max-h-56 overflow-y-auto">
              {pool.isPending ? (
                <Skeleton className="h-20 rounded-lg" />
              ) : pool.isError ? (
                <p className="text-ink-faint px-1 py-2 text-meta">
                  {staffChatErrorMessage(pool.error, "Xodimlar ro'yxatini olib bo'lmadi")}
                </p>
              ) : options.length === 0 ? (
                <p className="text-ink-faint px-1 py-2 text-meta">Qo&apos;shiladigan xodim topilmadi</p>
              ) : (
                <ul>
                  {options.map((candidate) => (
                    <li key={candidate.seatId}>
                      <button
                        type="button"
                        disabled={add.isPending}
                        onClick={() => add.mutate(candidate)}
                        className="hover:bg-subtle flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-dense"
                      >
                        <span className="text-ink min-w-0 flex-1 truncate" data-no-translit>{candidate.fullName}</span>
                        <span className="text-ink-faint text-fine">{candidate.roleLabel}</span>
                        {add.isPending && add.variables?.seatId === candidate.seatId ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="text-brand size-3.5" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <Button className="w-full" variant="outline" onClick={() => setAdding(true)}>
            <UserPlus />
            Odam qo&apos;shish
          </Button>
        )}
      </div>
    </div>
  );
}
