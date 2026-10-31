"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, LoaderCircle, Pencil, Plus, SearchX, ShieldCheck, UsersRound } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Field, inputClass } from "@/components/kit/field";
import { FilterChips } from "@/components/kit/filter-chips";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyView, ErrorView, TableSkeleton } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createChiefCourier, fetchChiefCouriers, fetchChiefZones, updateChiefCourier } from "@/features/chief/api";
import type { ChiefCourierPatch } from "@/features/chief/api";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { PasswordRevealDialog } from "@/features/couriers/components/courier-account";
import type { Courier } from "@/features/couriers/types";
import type { Zone } from "@/features/zones/types";
import { errorMessage } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

const STATUSES = ["all", "active", "unzoned", "blocked"] as const;
type CourierStatus = (typeof STATUSES)[number];

/** `Select` bo'sh qiymatni qabul qilmaydi — «zonasiz» uchun belgi. */
const NO_ZONE = "none";

function statusOf(courier: Courier): Exclude<CourierStatus, "all"> {
  if (!courier.isActive) return "blocked";
  return courier.zoneIds.length === 0 ? "unzoned" : "active";
}

/**
 * Kuryerlar (§4.5, §5b): bosh kuryer o'z kuryerini yaratadi, bitta zonaga
 * biriktiradi, boshqa zonaga o'tkazadi yoki bloklaydi. Bloklangan kuryer
 * hech qaysi zonaga qaramaydi va zakaz olmaydi.
 */
export function ChiefCouriers({ me }: { me: ChiefMe }) {
  const queryClient = useQueryClient();
  const canManage = chiefCan(me, "couriers.manage");
  const [filter, setFilter] = useQueryStates({
    q: parseAsString,
    status: parseAsStringLiteral(STATUSES),
  });
  const status = filter.status ?? "all";
  const query = filter.q ?? "";
  const [editing, setEditing] = useState<Courier | "new" | null>(null);
  const [blocking, setBlocking] = useState<Courier | null>(null);
  const [revealed, setRevealed] = useState<{ courier: Courier; password: string } | null>(null);

  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const zoneList = (zones.data?.zones ?? []).filter((zone) => zone.isActive);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.chief });

  const update = useMutation({
    mutationFn: (input: { courier: Courier; patch: ChiefCourierPatch; done: string }) =>
      updateChiefCourier(input.courier.id, input.patch),
    onSuccess: (_, input) => {
      toast.success(input.done);
      setBlocking(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerni saqlashda xatolik")),
  });

  const moveTo = (courier: Courier, zoneId: string) => {
    const zone = zoneList.find((item) => String(item.id) === zoneId) ?? null;
    update.mutate({
      courier,
      patch: { zoneIds: zone ? [zone.id] : [] },
      done: zone ? `${courier.fullName} → ${zone.name}` : `${courier.fullName} zonadan olindi`,
    });
  };

  const list = couriers.data ?? [];
  const counts = { all: list.length, active: 0, unzoned: 0, blocked: 0 };
  for (const courier of list) counts[statusOf(courier)] += 1;
  const visible = list.filter(
    (courier) =>
      (status === "all" || statusOf(courier) === status) && matchesSearch(courier.fullName, query, courier.phone),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips<CourierStatus>
          label="Holat"
          options={[
            { value: "all", label: "Hammasi", count: counts.all },
            { value: "active", label: "Ishlayapti", count: counts.active },
            { value: "unzoned", label: "Zonasiz", count: counts.unzoned, color: "var(--warn)" },
            { value: "blocked", label: "Bloklangan", count: counts.blocked, color: "var(--danger)" },
          ]}
          value={status}
          onChange={(next) => void setFilter({ status: next === "all" ? null : next })}
        />
        <SearchInput
          value={query}
          onChange={(next) => void setFilter({ q: next || null })}
          placeholder="Ism yoki telefon"
          className="w-full sm:ml-auto sm:w-64"
        />
        {canManage ? (
          <Button onClick={() => setEditing("new")} className="w-full sm:w-auto">
            <Plus />
            Kuryer qo&apos;shish
          </Button>
        ) : null}
      </div>

      {couriers.isPending ? (
        <TableSkeleton rows={5} className="border-line overflow-hidden rounded-2xl border" />
      ) : couriers.isError ? (
        <ErrorView
          message={errorMessage(couriers.error, "Kuryerlarni yuklashda xatolik")}
          onRetry={() => void couriers.refetch()}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : list.length === 0 ? (
        <EmptyView
          Icon={UsersRound}
          title="Jamoangizda kuryer yo'q"
          description="Birinchi kuryerni qo'shing va uni zonaga biriktiring — zakazlar unga zona bo'yicha tushadi."
          action={
            canManage ? (
              <Button onClick={() => setEditing("new")}>
                <Plus />
                Kuryer qo&apos;shish
              </Button>
            ) : undefined
          }
          className="border-line bg-surface rounded-2xl border"
        />
      ) : visible.length === 0 ? (
        <EmptyView
          Icon={SearchX}
          title="Hech kim topilmadi"
          description="Qidiruv yoki holat filtrini o'zgartiring."
          action={
            <Button variant="outline" onClick={() => void setFilter({ q: null, status: null })}>
              Filtrni tozalash
            </Button>
          }
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
          {visible.map((courier) => (
            <CourierRow
              key={courier.id}
              courier={courier}
              zones={zoneList}
              canManage={canManage}
              busy={update.isPending && update.variables?.courier.id === courier.id}
              onMove={(zoneId) => moveTo(courier, zoneId)}
              onEdit={() => setEditing(courier)}
              onBlock={() => setBlocking(courier)}
              onUnblock={() =>
                update.mutate({ courier, patch: { isActive: true }, done: `${courier.fullName} blokdan chiqarildi` })
              }
            />
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing !== null ? (
            <CourierForm
              key={editing === "new" ? "new" : editing.id}
              courier={editing === "new" ? null : editing}
              zones={zoneList}
              region={me.regions.length === 1 ? (me.regions[0] ?? null) : null}
              onClose={() => setEditing(null)}
              onSaved={(courier, password) => {
                refresh();
                if (password) setRevealed({ courier, password });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={blocking !== null}
        onOpenChange={(next) => !next && setBlocking(null)}
        title={blocking ? `${blocking.fullName} bloklansinmi?` : ""}
        description="Kuryer zonadan olinadi va yangi zakaz olmaydi."
        consequence="Keyin blokdan chiqarib, yana zonaga biriktirish mumkin."
        confirmLabel="Bloklash"
        isPending={update.isPending}
        onConfirm={() => {
          if (blocking)
            update.mutate({
              courier: blocking,
              patch: { isActive: false, zoneIds: [] },
              done: `${blocking.fullName} bloklandi`,
            });
        }}
      />
      <PasswordRevealDialog courier={revealed?.courier ?? null} password={revealed?.password ?? null} onClose={() => setRevealed(null)} />
    </div>
  );
}

function CourierRow({
  courier,
  zones,
  canManage,
  busy,
  onMove,
  onEdit,
  onBlock,
  onUnblock,
}: {
  courier: Courier;
  zones: Zone[];
  canManage: boolean;
  busy: boolean;
  onMove: (zoneId: string) => void;
  onEdit: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const state = statusOf(courier);
  const zoneId = courier.zoneIds[0];
  const zoneName = courier.zones[0]?.name ?? null;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span className="min-w-0 flex-1 basis-48">
        <span className="flex items-center gap-2">
          <span className="text-ink truncate text-dense font-semibold" data-no-translit>{courier.fullName}</span>
          {state === "blocked" ? <StatusPill label="bloklangan" color="var(--danger)" size="sm" /> : null}
          {state === "unzoned" ? <StatusPill label="zonasiz" color="var(--warn)" size="sm" /> : null}
        </span>
        <span className="text-ink-faint tabular text-meta">
          {courier.phone ? formatPhone(courier.phone) : "telefon yo'q"}
          {courier.isActive ? ` · bugun ${courier.today.delivered}/${courier.today.assigned}` : ""}
        </span>
      </span>

      {courier.isActive && canManage ? (
        <Select value={zoneId !== undefined ? String(zoneId) : NO_ZONE} onValueChange={onMove} disabled={busy}>
          <SelectTrigger aria-label={`${courier.fullName}: zona`} className="w-full sm:w-52">
            <SelectValue placeholder="Zona tanlang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ZONE}>Zonasiz</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={String(zone.id)}>
                <span data-no-translit>{zone.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-ink-muted text-dense sm:w-52" data-no-translit>
          {zoneName ?? "—"}
        </span>
      )}

      {canManage ? (
        <span className="flex shrink-0 items-center gap-1">
          {busy ? <LoaderCircle className="text-ink-faint size-4 animate-spin" aria-label="Saqlanmoqda" /> : null}
          <Button size="icon-sm" variant="ghost" aria-label={`${courier.fullName}: tahrirlash`} onClick={onEdit}>
            <Pencil />
          </Button>
          {courier.isActive ? (
            <Button size="sm" variant="ghost" onClick={onBlock} disabled={busy}>
              <Ban />
              Bloklash
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onUnblock} disabled={busy}>
              <ShieldCheck />
              Blokdan chiqarish
            </Button>
          )}
        </span>
      ) : null}
    </li>
  );
}

function CourierForm({
  courier,
  zones,
  region,
  onClose,
  onSaved,
}: {
  /** `null` — yangi kuryer. */
  courier: Courier | null;
  zones: Zone[];
  region: string | null;
  onClose: () => void;
  onSaved: (courier: Courier, password: string | null) => void;
}) {
  const [fullName, setFullName] = useState(courier?.fullName ?? "");
  const [phone, setPhone] = useState(courier?.phone ?? "");
  const [zoneId, setZoneId] = useState(courier?.zoneIds[0] !== undefined ? String(courier.zoneIds[0]) : NO_ZONE);
  const [withAccount, setWithAccount] = useState(true);
  const [touched, setTouched] = useState(false);
  const phoneDigits = phone.replace(/\D/g, "");
  const errors = {
    fullName: fullName.trim().length >= 2 ? null : "Ism kamida 2 harf bo'lsin",
    phone: phoneDigits === "" || phoneDigits.length === 9 || phoneDigits.length === 12 ? null : "Telefon 9 yoki 12 raqam bo'lsin",
  };
  const valid = !errors.fullName && !errors.phone;
  const zoneIds = zoneId === NO_ZONE ? [] : [Number(zoneId)];

  const save = useMutation({
    mutationFn: async () => {
      if (courier) {
        // Bloklangan kuryerga zona berilmaydi — u hech qaysi zonaga qaramaydi.
        const patch: ChiefCourierPatch = courier.isActive
          ? { fullName: fullName.trim(), phone: phone.trim(), zoneIds }
          : { fullName: fullName.trim(), phone: phone.trim() };
        return { courier: await updateChiefCourier(courier.id, patch), password: null };
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

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (valid && !save.isPending) save.mutate();
      }}
    >
      <DialogTitle>{courier ? "Kuryerni tahrirlash" : "Yangi kuryer"}</DialogTitle>
      <DialogDescription>
        {courier ? "Ism, telefon va zona" : "Kuryer jamoangizga qo'shiladi va tanlangan zonadan zakaz oladi"}
      </DialogDescription>
      <div className="mt-4 space-y-3.5">
        <Field label="Ism familiya" htmlFor="courier-name" error={touched ? (errors.fullName ?? undefined) : undefined}>
          <input
            id="courier-name"
            autoFocus
            required
            aria-invalid={touched && Boolean(errors.fullName)}
            value={fullName}
            maxLength={120}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Telefon" htmlFor="courier-phone" error={touched ? (errors.phone ?? undefined) : undefined}>
          <input
            id="courier-phone"
            inputMode="tel"
            aria-invalid={touched && Boolean(errors.phone)}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="998901234567"
            className={cn(inputClass, "tabular")}
          />
        </Field>
        {!courier || courier.isActive ? (
          <Field label="Zona" htmlFor="courier-zone" hint={zones.length === 0 ? "Avval «Zonalar» bo'limida zona yarating." : undefined}>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger id="courier-zone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ZONE}>Hozircha zonasiz</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={String(zone.id)}>
                    <span data-no-translit>{zone.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {courier ? null : (
          <div className="flex items-center gap-2.5">
            <Checkbox id="chief-courier-account" checked={withAccount} onCheckedChange={(value) => setWithAccount(value === true)} />
            <Label htmlFor="chief-courier-account" className="text-ink text-dense">
              Kuryer ilovasiga kirish uchun parol yaratish
            </Label>
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={save.isPending || (touched && !valid)}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}
