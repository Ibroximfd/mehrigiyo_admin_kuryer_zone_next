"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Pencil, Plus, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  attachChiefCourier,
  createChiefCourier,
  detachChiefCourier,
  fetchChiefCouriers,
  fetchChiefZones,
  updateChiefCourier,
} from "@/features/chief/api";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { fetchCouriers } from "@/features/couriers/api";
import { PasswordRevealDialog } from "@/features/couriers/components/courier-account";
import { courierPresence } from "@/features/couriers/types";
import type { Courier } from "@/features/couriers/types";
import type { Zone } from "@/features/zones/types";
import { errorMessage } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const PRESENCE: Record<ReturnType<typeof courierPresence>, { label: string; color: string }> = {
  online: { label: "faol", color: "var(--ok)" },
  no_connection: { label: "aloqa yo'q", color: "var(--warn)" },
  off_shift: { label: "nofaol", color: "var(--ink-faint)" },
  no_account: { label: "akkaunt yo'q", color: "var(--ink-faint)" },
};

/**
 * Bosh kuryer jamoasi (§C 2.3): o'z kuryerlari — qo'shish (filialida,
 * viloyatida), mavjud boshliqsiz kuryerni olish, tahrir, chiqarish.
 */
export function ChiefCouriers({ me }: { me: ChiefMe }) {
  const queryClient = useQueryClient();
  const canManage = chiefCan(me, "couriers.manage");
  const [creating, setCreating] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [editing, setEditing] = useState<Courier | null>(null);
  const [revealed, setRevealed] = useState<{ courier: Courier; password: string } | null>(null);

  const couriers = useQuery({
    queryKey: queryKeys.chiefCouriers,
    queryFn: ({ signal }) => fetchChiefCouriers(signal),
  });
  const zones = useQuery({
    queryKey: queryKeys.chiefZones,
    queryFn: ({ signal }) => fetchChiefZones(signal),
  });
  const zoneList = zones.data?.zones ?? [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    void queryClient.invalidateQueries({ queryKey: queryKeys.couriers });
  };

  const detach = useMutation({
    mutationFn: (courier: Courier) => detachChiefCourier(courier.id),
    onSuccess: (_, courier) => {
      toast.success(`${courier.fullName} jamoadan chiqarildi`);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerni jamoadan chiqarishda xatolik")),
  });

  const list = couriers.data ?? [];

  return (
    <div className="flex flex-col gap-3.5">
      {canManage ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setAttaching(true)}>
            <UserPlus />
            Mavjud kuryerni olish
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Kuryer qo&apos;shish
          </Button>
        </div>
      ) : null}

      {couriers.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : couriers.isError ? (
        <ErrorView
          message={errorMessage(couriers.error, "Kuryerlarni yuklashda xatolik")}
          onRetry={() => void couriers.refetch()}
          className="border-line bg-surface rounded-xl border"
        />
      ) : list.length === 0 ? (
        <EmptyView
          Icon={UsersRound}
          title="Jamoangizda kuryer yo'q"
          description="Yangi kuryer qo'shing yoki viloyatingizdagi mavjud kuryerni jamoaga oling."
          className="border-line bg-surface rounded-xl border"
        />
      ) : (
        <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-xl text-dense">
            <thead>
              <tr className="text-ink-faint border-line border-b text-meta">
                <th className="px-4 py-2.5 text-left font-medium">Kuryer</th>
                <th className="px-3 py-2.5 text-left font-medium">Zonalar</th>
                <th className="px-3 py-2.5 text-right font-medium">Bugun</th>
                <th className="px-3 py-2.5 text-left font-medium">Holat</th>
                {canManage ? <th className="w-24 px-3 py-2.5" aria-label="Amallar" /> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((courier) => {
                const presence = PRESENCE[courierPresence(courier)];
                return (
                  <tr key={courier.id} className="border-line hover:bg-subtle/60 border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="text-ink block font-semibold" data-no-translit>{courier.fullName}</span>
                      <span className="text-ink-faint tabular text-meta">{courier.phone ? formatPhone(courier.phone) : "—"}</span>
                    </td>
                    <td className="text-ink-muted px-3 py-2.5" data-no-translit>
                      {courier.zones.map((zone) => zone.name).join(", ") || "—"}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">
                      {`${courier.today.delivered} / ${courier.today.assigned}`}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill label={courier.isActive ? presence.label : "o'chirilgan"} color={courier.isActive ? presence.color : "var(--ink-faint)"} size="sm" />
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2.5">
                        <span className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label={`${courier.fullName}: tahrirlash`} onClick={() => setEditing(courier)}>
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`${courier.fullName}: jamoadan chiqarish`}
                            disabled={detach.isPending}
                            onClick={() => detach.mutate(courier)}
                          >
                            <UserMinus />
                          </Button>
                        </span>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CourierFormDialog
        open={creating || editing !== null}
        courier={editing}
        zones={zoneList}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(courier, password) => {
          refresh();
          if (password) setRevealed({ courier, password });
        }}
        region={me.regions.length === 1 ? (me.regions[0] ?? null) : null}
      />
      <AttachDialog open={attaching} me={me} team={list} onClose={() => setAttaching(false)} onAttached={refresh} />
      <PasswordRevealDialog courier={revealed?.courier ?? null} password={revealed?.password ?? null} onClose={() => setRevealed(null)} />
    </div>
  );
}

function CourierFormDialog({
  open,
  courier,
  zones,
  region,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** `null` — yangi kuryer. */
  courier: Courier | null;
  zones: Zone[];
  region: string | null;
  onClose: () => void;
  onSaved: (courier: Courier, password: string | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[28rem] max-w-[calc(100vw-2rem)]">
        {open ? (
          <CourierForm key={courier?.id ?? "new"} courier={courier} zones={zones} region={region} onClose={onClose} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CourierForm({
  courier,
  zones,
  region,
  onClose,
  onSaved,
}: {
  courier: Courier | null;
  zones: Zone[];
  region: string | null;
  onClose: () => void;
  onSaved: (courier: Courier, password: string | null) => void;
}) {
  const [fullName, setFullName] = useState(courier?.fullName ?? "");
  const [phone, setPhone] = useState(courier?.phone ?? "");
  const [zoneIds, setZoneIds] = useState<number[]>(courier?.zoneIds ?? []);
  const [isActive, setIsActive] = useState(courier?.isActive ?? true);
  const [withAccount, setWithAccount] = useState(true);

  const save = useMutation({
    mutationFn: async () => {
      if (courier) {
        const updated = await updateChiefCourier(courier.id, { fullName: fullName.trim(), phone: phone.trim(), isActive, zoneIds });
        return { courier: updated, password: null };
      }
      return createChiefCourier({ fullName: fullName.trim(), phone: phone.trim(), region, zoneIds, withAccount });
    },
    onSuccess: ({ courier: saved, password }) => {
      toast.success(courier ? "Kuryer saqlandi" : `${saved.fullName} jamoaga qo'shildi`);
      onSaved(saved, password);
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerni saqlashda xatolik")),
  });

  const toggleZone = (id: number) =>
    setZoneIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (fullName.trim()) save.mutate();
      }}
    >
      <DialogTitle>{courier ? "Kuryerni tahrirlash" : "Kuryer qo'shish"}</DialogTitle>
      <DialogDescription>{courier ? "Ism, telefon, zonalar va faollik" : "Kuryer sizning jamoangizga qo'shiladi"}</DialogDescription>
      <div className="mt-3 space-y-3">
        <Field label="Ism">
          <input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} maxLength={120} />
        </Field>
        <Field label="Telefon">
          <input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="998901234567" className={cn(inputClass, "tabular")} />
        </Field>
        {zones.length > 0 ? (
          <fieldset>
            <legend className="text-ink-muted mb-1.5 text-meta font-medium">Zonalar</legend>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((zone) => {
                const on = zoneIds.includes(zone.id);
                return (
                  <button
                    key={zone.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleZone(zone.id)}
                    className={
                      on
                        ? "border-brand bg-brand-soft text-ink rounded-md border px-2 py-1 text-meta font-medium"
                        : "border-line text-ink-muted hover:border-line-strong rounded-md border px-2 py-1 text-meta"
                    }
                  >
                    <span data-no-translit>{zone.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        {courier ? (
          <div className="flex items-center gap-2.5">
            <Checkbox id="chief-courier-active" checked={isActive} onCheckedChange={(value) => setIsActive(value === true)} />
            <Label htmlFor="chief-courier-active" className="text-ink text-dense">Faol (zakaz oladi)</Label>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Checkbox id="chief-courier-account" checked={withAccount} onCheckedChange={(value) => setWithAccount(value === true)} />
            <Label htmlFor="chief-courier-account" className="text-ink text-dense">Ilova akkauntini ochish (parol bir marta ko&apos;rsatiladi)</Label>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor
        </Button>
        <Button type="submit" disabled={!fullName.trim() || save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}

/** Viloyatdagi boshliqsiz kuryerni jamoaga olish (`attach/`). */
function AttachDialog({
  open,
  me,
  team,
  onClose,
  onAttached,
}: {
  open: boolean;
  me: ChiefMe;
  team: Courier[];
  onClose: () => void;
  onAttached: () => void;
}) {
  const region = me.regions.join(",") || null;
  const pool = useQuery({
    queryKey: queryKeys.couriersList({ region, scope: "chief-attach" }),
    queryFn: ({ signal }) => fetchCouriers(signal, { region }),
    enabled: open,
  });
  const attach = useMutation({
    mutationFn: (courier: Courier) => attachChiefCourier(courier.id),
    onSuccess: (_, courier) => {
      toast.success(`${courier.fullName} jamoaga olindi`);
      onAttached();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerni jamoaga qo'shishda xatolik")),
  });
  const teamIds = new Set(team.map((courier) => courier.id));
  const candidates = (pool.data ?? []).filter((courier) => courier.isActive && !teamIds.has(courier.id));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[80vh] w-[28rem] max-w-[calc(100vw-2rem)] flex-col">
        <DialogTitle>Mavjud kuryerni olish</DialogTitle>
        <DialogDescription>Viloyatingizdagi kuryerlar. Boshqa bosh kuryerning kuryeri olinmaydi.</DialogDescription>
        <div className="scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto">
          {pool.isPending ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : candidates.length === 0 ? (
            <p className="text-ink-faint py-6 text-center text-meta">Olinadigan kuryer yo&apos;q</p>
          ) : (
            <ul className="divide-line divide-y">
              {candidates.map((courier) => (
                <li key={courier.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-dense font-semibold" data-no-translit>{courier.fullName}</span>
                    <span className="text-ink-faint text-meta" data-no-translit>{courier.filialName ?? ""}</span>
                  </span>
                  <Button size="sm" variant="outline" disabled={attach.isPending} onClick={() => attach.mutate(courier)}>
                    {attach.isPending && attach.variables?.id === courier.id ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                    Olish
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
