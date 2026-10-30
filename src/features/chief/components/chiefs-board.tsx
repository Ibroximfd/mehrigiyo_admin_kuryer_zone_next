"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Crown, LoaderCircle, MapPin, Plus, ShieldX, UserRoundCog, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, useConfirm } from "@/components/kit/confirm-dialog";
import { Field, inputClass } from "@/components/kit/field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefOptions } from "@/features/chief/api";
import type { ChiefOption } from "@/features/chief/types";
import { fetchLogistTree, grantRole, logistsErrorMessage, revokeRole } from "@/features/logists/api";
import { useMyPermissions } from "@/features/logists/hooks";
import { activeRoles, can } from "@/features/logists/types";
import type { LogistSeat } from "@/features/logists/types";
import { REGIONS, regionLabel } from "@/features/orders/regions";
import { isEndpointMissing } from "@/lib/api-availability";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Kuryerlar sahifasi (2026-10-30, egasi qarori): logist kuryer bilan emas,
 * **viloyat bosh kuryeri** bilan ishlaydi. Har viloyat — bitta kartochka:
 * bosh kuryer(lar)i, jamoasi soni, zakazlari; bosh kuryeri yo'q viloyat
 * ajralib turadi. Bosh kuryer = o'rin + `chief_courier` roli (qamrov
 * `region`, B2 §6) — tayinlash va olib qo'yish `logist.grant` dopuski bilan.
 */
export function ChiefsBoard() {
  const permissions = useMyPermissions();
  const canGrant = can(permissions.data, "logist.grant");
  const [assignRegion, setAssignRegion] = useState<string | null>(null);
  const chiefs = useQuery({
    queryKey: queryKeys.chiefOptions(null),
    queryFn: ({ signal }) => fetchChiefOptions(null, signal),
    retry: (count, error) => !isEndpointMissing(error) && count < 2,
  });

  const byRegion = useMemo(() => {
    const map = new Map<string, ChiefOption[]>();
    for (const chief of chiefs.data ?? []) {
      for (const region of chief.regions ?? ["*"]) map.set(region, [...(map.get(region) ?? []), chief]);
    }
    return map;
  }, [chiefs.data]);
  const everywhere = byRegion.get("*") ?? [];
  const covered = REGIONS.filter((region) => byRegion.has(region.value)).length;

  if (chiefs.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }
  if (chiefs.isError) {
    return isEndpointMissing(chiefs.error) ? (
      <EmptyView
        Icon={UserRoundCog}
        title="Bosh kuryerlar backend'ni kutmoqda"
        description="Bosh kuryer bo'limi serverda yoqilgach shu yerda viloyatlar bo'yicha ko'rinadi."
        className="border-line bg-surface rounded-xl border"
      />
    ) : (
      <ErrorView
        message={errorMessage(chiefs.error, "Bosh kuryerlarni yuklashda xatolik")}
        onRetry={() => void chiefs.refetch()}
        className="border-line bg-surface rounded-xl border"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-line bg-surface flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3">
        <p className="text-ink text-dense">
          <span className="tabular text-title font-bold">{(chiefs.data ?? []).length}</span>{" "}
          <span className="text-ink-muted">bosh kuryer</span>
        </p>
        <p className="text-ink text-dense">
          <span className="tabular text-title font-bold">{`${covered} / ${REGIONS.length}`}</span>{" "}
          <span className="text-ink-muted">viloyat qamrangan</span>
        </p>
        <p className="text-ink-faint min-w-0 flex-1 text-meta">
          Logist zakazni viloyat bosh kuryeriga beradi, kuryerni bosh kuryer o&apos;zi tanlaydi.
        </p>
      </div>

      {everywhere.length > 0 ? (
        <RegionCard title="Hamma viloyatlar" region={null} chiefs={everywhere} canGrant={canGrant} onAssign={setAssignRegion} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REGIONS.map((region) => (
          <RegionCard
            key={region.value}
            title={region.label}
            region={region.value}
            chiefs={byRegion.get(region.value) ?? []}
            canGrant={canGrant}
            onAssign={setAssignRegion}
          />
        ))}
      </div>

      {assignRegion ? <AssignChiefDialog region={assignRegion} onClose={() => setAssignRegion(null)} /> : null}
    </div>
  );
}

function RegionCard({
  title,
  region,
  chiefs,
  canGrant,
  onAssign,
}: {
  title: string;
  region: string | null;
  chiefs: ChiefOption[];
  canGrant: boolean;
  onAssign: (region: string) => void;
}) {
  const empty = chiefs.length === 0;
  return (
    <section
      className={cn(
        "bg-surface flex flex-col gap-2.5 rounded-xl border p-3.5",
        empty ? "border-warn/40 border-dashed" : "border-line",
      )}
    >
      <header className="flex items-center gap-2">
        <MapPin className={cn("size-4 shrink-0", empty ? "text-warn" : "text-brand")} aria-hidden />
        <h3 className="text-ink min-w-0 flex-1 truncate text-dense font-semibold">{title}</h3>
        {canGrant && region ? (
          <Button size="sm" variant={empty ? "default" : "ghost"} onClick={() => onAssign(region)}>
            <Plus />
            {empty ? "Tayinlash" : "Yana"}
          </Button>
        ) : null}
      </header>
      {empty ? (
        <p className="text-warn text-meta">Bosh kuryer yo&apos;q — bu viloyat zakazlarini berib bo&apos;lmaydi.</p>
      ) : (
        <ul className="divide-line divide-y">
          {chiefs.map((chief) => (
            <ChiefRow key={chief.id} chief={chief} region={region} canGrant={canGrant} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ChiefRow({ chief, region, canGrant }: { chief: ChiefOption; region: string | null; canGrant: boolean }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm<true>();
  // Rolni yopish uchun rol qatori kerak — tuzilma daraxtidan (bosh kuryer — o'rin).
  const tree = useQuery({
    queryKey: queryKeys.logistStructure,
    queryFn: ({ signal }) => fetchLogistTree(signal),
    enabled: canGrant,
    staleTime: 60_000,
    retry: false,
  });
  const seat = tree.data?.filials.flatMap((filial) => filial.logists).find((item) => item.id === chief.id);
  const role = seat
    ? activeRoles(seat.roles).find(
        (item) => item.role === "chief_courier" && (region === null ? item.scopeKind === "all" : item.scopeId === region),
      )
    : undefined;
  const revoke = useMutation({
    mutationFn: () => revokeRole(role!.id),
    onSuccess: () => {
      toast.success(`${chief.fullName} bosh kuryerlikdan olindi`);
      void queryClient.invalidateQueries({ queryKey: ["chiefs"] });
      void queryClient.invalidateQueries({ queryKey: ["structure"] });
    },
    onError: (error) => toast.error(logistsErrorMessage(error, "Rolni yopishda xatolik")),
  });

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="bg-brand-soft text-brand flex size-8 shrink-0 items-center justify-center rounded-full">
        <UserRoundCog className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink flex items-center gap-1 truncate text-dense font-semibold">
          <span className="truncate" data-no-translit>{chief.fullName}</span>
          {chief.isDefault ? <Crown className="text-gold size-3.5 shrink-0" aria-label="Viloyat sukuti" /> : null}
        </span>
        <span className="text-ink-faint flex flex-wrap gap-x-2 text-fine">
          <span className="inline-flex items-center gap-0.5">
            <UsersRound className="size-3" aria-hidden />
            {`${chief.couriers} kuryer`}
          </span>
          {chief.filial ? <span data-no-translit>{chief.filial.name}</span> : null}
          {chief.regions && chief.regions.length > 1 ? <span>{`${chief.regions.length} viloyat`}</span> : null}
        </span>
      </span>
      <Button asChild size="icon-sm" variant="ghost" aria-label="Zakazlari" title="Zakazlari">
        <Link href={`${ROUTES.orders}?chief=${chief.id}`}>
          <ClipboardList />
        </Link>
      </Button>
      {canGrant && role ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Bosh kuryerlikdan olish"
          title="Bosh kuryerlikdan olish"
          disabled={revoke.isPending}
          onClick={() => confirm.ask(true)}
        >
          {revoke.isPending ? <LoaderCircle className="animate-spin" /> : <ShieldX />}
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(next) => !next && confirm.close()}
        title={`${chief.fullName} bosh kuryerlikdan olinsinmi?`}
        description={`${region ? regionLabel(region) : "Hamma viloyatlar"} zakazlari unga berilmaydi. Akkaunt va tarix saqlanadi.`}
        confirmLabel="Olib tashlash"
        isPending={revoke.isPending}
        onConfirm={() => {
          confirm.close();
          revoke.mutate();
        }}
      />
    </li>
  );
}

/**
 * Bosh kuryer tayinlash: logist saytidagi mavjud akkaunt (o'rin) tanlanadi,
 * unga shu viloyatga `chief_courier` roli beriladi. Yangi akkaunt —
 * «Logistlar» bo'limida ochiladi.
 */
function AssignChiefDialog({ region, onClose }: { region: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [seatId, setSeatId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const tree = useQuery({
    queryKey: queryKeys.logistStructure,
    queryFn: ({ signal }) => fetchLogistTree(signal),
    staleTime: 60_000,
    retry: false,
  });
  const seats: Array<LogistSeat & { filialName: string }> = (tree.data?.filials ?? []).flatMap((filial) =>
    filial.logists.filter((seat) => seat.isActive).map((seat) => ({ ...seat, filialName: filial.name })),
  );
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? seats.filter((seat) => seat.fullName.toLowerCase().includes(needle) || seat.username.toLowerCase().includes(needle))
    : seats;

  const grant = useMutation({
    mutationFn: () => grantRole({ seatId: seatId!, role: "chief_courier", scopeKind: "region", scopeId: region, permissions: [] }),
    onSuccess: () => {
      toast.success(`${regionLabel(region)} — bosh kuryer tayinlandi`);
      void queryClient.invalidateQueries({ queryKey: ["chiefs"] });
      void queryClient.invalidateQueries({ queryKey: ["structure"] });
      onClose();
    },
    onError: (error) => toast.error(logistsErrorMessage(error, "Bosh kuryer tayinlashda xatolik")),
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85dvh] w-[30rem] max-w-[calc(100vw-1.5rem)] flex-col">
        <DialogTitle>{`${regionLabel(region)} — bosh kuryer`}</DialogTitle>
        <DialogDescription className="text-ink-muted text-dense">
          Akkauntni tanlang — u logist saytida «Bosh kuryer» bo&apos;limini ko&apos;radi va o&apos;z kuryerlariga taqsimlaydi.
        </DialogDescription>
        <Field label="Qidirish" className="mt-3">
          <input
            autoFocus
            aria-label="Akkaunt qidirish"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ism yoki login"
            className={inputClass}
          />
        </Field>
        <div className="border-line scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border">
          {tree.isPending ? (
            <div className="space-y-1.5 p-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-10 rounded-md" />
              ))}
            </div>
          ) : tree.isError ? (
            <p role="alert" className="text-danger p-3 text-meta">
              {logistsErrorMessage(tree.error, "Akkauntlarni yuklab bo'lmadi")}
            </p>
          ) : visible.length === 0 ? (
            <p className="text-ink-faint p-3 text-meta">
              {needle ? "Topilmadi" : "Akkaunt yo'q — avval «Logistlar» bo'limida akkaunt oching."}
            </p>
          ) : (
            <ul className="divide-line divide-y">
              {visible.map((seat) => (
                <li key={seat.id}>
                  <button
                    type="button"
                    aria-pressed={seatId === seat.id}
                    onClick={() => setSeatId(seat.id)}
                    className={cn(
                      "hover:bg-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-dense",
                      seatId === seat.id && "bg-brand-soft",
                    )}
                  >
                    <span className="text-ink min-w-0 flex-1 truncate font-medium" data-no-translit>
                      {seat.fullName || seat.username}
                    </span>
                    <span className="text-ink-faint truncate font-mono text-fine" data-no-translit>
                      {seat.username}
                    </span>
                    <span className="text-ink-faint truncate text-fine" data-no-translit>
                      {seat.filialName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link href={ROUTES.logists} className="text-link hover:text-brand text-meta font-medium">
            Yangi akkaunt — «Logistlar»
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button disabled={seatId === null || grant.isPending} onClick={() => grant.mutate()}>
              {grant.isPending ? <LoaderCircle className="animate-spin" /> : null}
              Tayinlash
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
