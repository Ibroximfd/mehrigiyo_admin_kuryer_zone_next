"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import {
  createGrants,
  disableTracking,
  enableTracking,
  fetchGrants,
  fetchLocations,
  fetchSkladFilials,
  revokeGrant,
  setMinQuantity,
} from "../api";
import { skladErrorMessage } from "../error-hints";
import { regionName } from "../regions";
import type { SkladItem } from "../types";
import { toPieces } from "../units";

/**
 * Mahsulot oynalari (dizayn 1a): «Nazoratni yoqish» (har ombor uchun
 * boshlang'ich son), «Nazoratni o'chirish» (tasdiq), «Dopusk berish»
 * (filial tanlash), «Minimal qoldiq».
 */

// ─────────────────────────────────────────────────────────────────────────────
// Nazoratni yoqish (§16)
// ─────────────────────────────────────────────────────────────────────────────

type Opening = { boxes: number; pieces: number };

export function TrackingOnDialog({
  item,
  open,
  onOpenChange,
}: {
  item: SkladItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState<Record<number, Opening>>({});
  const [minQuantity, setMinQuantity] = useState(100);
  const [note, setNote] = useState(`inventarizatsiya ${formatDate(new Date())}`);

  const locations = useQuery({
    queryKey: queryKeys.skladLocations,
    queryFn: ({ signal }) => fetchLocations(signal),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const rows = (locations.data ?? []).filter((location) => location.isActive);
  const qtyOf = (id: number) => {
    const entry = opening[id] ?? { boxes: 0, pieces: 0 };
    return toPieces(entry.boxes, entry.pieces, item.packageSize);
  };
  const total = rows.reduce((sum, location) => sum + qtyOf(location.id), 0);

  const submit = useMutation({
    mutationFn: () =>
      enableTracking(item.id, {
        opening: rows.map((location) => ({ locationId: location.id, quantity: qtyOf(location.id) })).filter((row) => row.quantity > 0),
        minQuantity,
        note: note.trim(),
      }),
    onSuccess: () => {
      toast.success(`${item.name}: nazorat yoqildi — ${total} dona`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sklad });
      onOpenChange(false);
    },
    onError: (error) => toast.error(skladErrorMessage(error, "Nazoratni yoqishda xatolik")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[36rem] max-w-[calc(100vw-2rem)] flex-col">
        <DialogTitle>
          Nazoratni yoqish — <span data-no-translit>{item.name}</span>
        </DialogTitle>
        <DialogDescription>
          {`Hozir har omborda nechta bor — shuni kiriting. Shu paytdan boshlab kirim-chiqim hisoblanadi, yetkazilgan buyurtmalar minus qilinadi. 1 karobka = ${item.packageSize} dona.`}
        </DialogDescription>

        <div className="scrollbar-thin mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {locations.isPending ? (
            <p className="text-ink-faint text-meta">Omborlar yuklanmoqda…</p>
          ) : (
            <table className="w-full text-dense">
              <thead className="text-ink-faint text-micro uppercase">
                <tr>
                  <th className="pb-1.5 text-left font-semibold">Ombor</th>
                  <th className="w-20 pb-1.5 text-right font-semibold">Karobka</th>
                  <th className="w-20 pb-1.5 text-right font-semibold">Dona</th>
                  <th className="w-16 pb-1.5 text-right font-semibold">Jami</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.map((location) => {
                  const entry = opening[location.id] ?? { boxes: 0, pieces: 0 };
                  const set = (patch: Partial<Opening>) =>
                    setOpening((current) => ({ ...current, [location.id]: { ...entry, ...patch } }));
                  return (
                    <tr key={location.id}>
                      <td className="py-1.5 pr-2">
                        <span className="text-ink block truncate font-medium" data-no-translit>
                          {location.name}
                        </span>
                        <span className="text-ink-faint text-fine">{regionName(location.region)}</span>
                      </td>
                      <td className="py-1.5 pl-2">
                        <NumberInput value={entry.boxes} onChange={(boxes) => set({ boxes })} label="Karobka" />
                      </td>
                      <td className="py-1.5 pl-2">
                        <NumberInput value={entry.pieces} onChange={(pieces) => set({ pieces })} label="Dona" />
                      </td>
                      <td className="text-ink tabular py-1.5 text-right font-semibold">{qtyOf(location.id)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-line border-t">
                  <td className="text-ink pt-2 font-semibold" colSpan={3}>
                    Jami
                  </td>
                  <td className="text-ink tabular pt-2 text-right font-semibold">{total}</td>
                </tr>
              </tfoot>
            </table>
          )}

          <div className="mt-4 grid grid-cols-[8rem_1fr] gap-3">
            <Field label="Minimal qoldiq" hint="dona · pastga tushsa sariq">
              <NumberInput value={minQuantity} onChange={setMinQuantity} label="Minimal qoldiq" tall />
            </Field>
            <Field label="Izoh">
              <input value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <p className="text-ink-faint mt-3 text-meta">
            Kuryerlarda bor bo&apos;lsa — nazoratdan keyin «Kuryerlar» bo&apos;limida tuzatish bilan kiritiladi. Jurnalga BOSH- hujjati yoziladi.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button type="button" size="lg" disabled={submit.isPending || locations.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Nazoratni yoqish — {total} dona
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NumberInput({ value, onChange, label, tall = false }: { value: number; onChange: (value: number) => void; label: string; tall?: boolean }) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
      onFocus={(event) => event.target.select()}
      className={cn(inputClass, "text-right tabular", tall ? "" : "h-8 px-2")}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nazoratni o'chirish (§16)
// ─────────────────────────────────────────────────────────────────────────────

export function TrackingOffDialog({
  item,
  open,
  onOpenChange,
}: {
  item: SkladItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: () => disableTracking(item.id, "manual"),
    onSuccess: () => {
      toast.success(`${item.name}: nazorat o'chirildi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sklad });
      onOpenChange(false);
    },
    onError: (error) => toast.error(skladErrorMessage(error, "Nazoratni o'chirishda xatolik")),
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Nazoratni o'chirish — ${item.name}`}
      description="Mahsulot yana «cheksiz» bo'ladi: qoldiq ko'rsatilmaydi, buyurtmalar minus qilinmaydi."
      consequence="Tarix saqlanadi, lekin bu mahsulotga berilgan hamma dopusk bekor bo'ladi."
      confirmLabel="O'chirish"
      isPending={submit.isPending}
      onConfirm={() => submit.mutate()}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dopusk (§15)
// ─────────────────────────────────────────────────────────────────────────────

export function GrantDialog({
  item,
  open,
  onOpenChange,
}: {
  item: SkladItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState("");

  const filials = useQuery({
    queryKey: queryKeys.skladFilials,
    queryFn: ({ signal }) => fetchSkladFilials(signal),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const grants = useQuery({
    queryKey: queryKeys.skladGrants(item.id),
    queryFn: ({ signal }) => fetchGrants(item.id, signal),
    enabled: open,
  });
  const grantedFilialIds = new Set((grants.data ?? []).map((grant) => grant.filial.id));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.skladGrants(item.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.skladGrants(null) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.skladMe });
  };

  const give = useMutation({
    mutationFn: () => createGrants({ itemIds: [item.id], filialId: selected[0]!, note: note.trim() }),
    onSuccess: () => {
      toast.success("Dopusk berildi");
      setSelected([]);
      setNote("");
      invalidate();
    },
    onError: (error) => toast.error(skladErrorMessage(error, "Dopusk berishda xatolik")),
  });

  const revoke = useMutation({
    mutationFn: (id: number) => revokeGrant(id),
    onSuccess: () => {
      toast.success("Dopusk bekor qilindi");
      invalidate();
    },
    onError: (error) => toast.error(skladErrorMessage(error, "Dopuskni bekor qilishda xatolik")),
  });

  /** Bitta so'rov — bitta filial (§15 `POST /grants/`); bir nechta kerak bo'lsa ketma-ket beriladi. */
  const toggle = (id: number) =>
    setSelected((current) => (current.includes(id) ? [] : [id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[32rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>
          Dopusk berish — <span data-no-translit>{item.name}</span>
        </DialogTitle>
        <DialogDescription>
          Tanlangan filial shu mahsulotning butun skladini yuritadi: hamma viloyat ombori, hamma kuryer. Nazoratni
          o&apos;chirish va dopusk berish sizda qoladi.
        </DialogDescription>

        {!item.stockTracking ? (
          <p className="bg-warn-soft text-warn mt-3 rounded-lg px-3 py-2.5 text-meta">
            Avval nazoratni yoqing — nazoratsiz mahsulotga dopusk berilmaydi.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {(filials.data ?? []).map((filial) => {
                const already = grantedFilialIds.has(filial.id);
                const on = selected.includes(filial.id);
                return (
                  <button
                    key={filial.id}
                    type="button"
                    disabled={already}
                    aria-pressed={on}
                    onClick={() => toggle(filial.id)}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg border px-3 text-dense font-medium transition-colors disabled:opacity-50",
                      on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink hover:border-line-strong",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-3.5 rounded border", on ? "border-brand bg-brand" : "border-line-strong")}
                    />
                    <span data-no-translit>{filial.name}</span>
                    {already ? <span className="text-ink-faint text-fine">bor</span> : null}
                  </button>
                );
              })}
            </div>

            <Field label="Izoh" className="mt-3">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="ixtiyoriy" className={inputClass} />
            </Field>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                Yopish
              </Button>
              <Button type="button" size="lg" disabled={selected.length === 0 || give.isPending} onClick={() => give.mutate()}>
                {give.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Dopusk berish
              </Button>
            </div>
          </>
        )}

        <div className="border-line mt-4 border-t pt-3">
          <p className="text-ink-faint text-micro uppercase">Hozirgi dopusklar</p>
          {grants.isPending ? (
            <p className="text-ink-faint mt-1.5 text-meta">Yuklanmoqda…</p>
          ) : (grants.data ?? []).length === 0 ? (
            <p className="text-ink-faint mt-1.5 text-meta">Hali hech kimga berilmagan.</p>
          ) : (
            <ul className="divide-line mt-1.5 divide-y">
              {(grants.data ?? []).map((grant) => (
                <li key={grant.id} className="flex items-center gap-3 py-2 text-dense">
                  <span className="text-ink min-w-0 flex-1 truncate font-medium" data-no-translit>
                    {grant.filial.name}
                  </span>
                  <span className="text-ink-faint text-fine">
                    {grant.grantedAt ? formatDate(grant.grantedAt) : ""}
                    {grant.grantedBy ? ` · ${grant.grantedBy}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(grant.id)}
                    className="text-danger hover:bg-danger-soft rounded px-2 py-0.5 text-meta font-medium transition-colors"
                  >
                    bekor
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal qoldiq (§3.4)
// ─────────────────────────────────────────────────────────────────────────────

export function MinQuantityDialog({
  item,
  locationId,
  current,
  open,
  onOpenChange,
}: {
  item: SkladItem | { id: number; name: string };
  /** Qaysi ombor uchun; `null` — mahsulotning umumiy chegarasi (mock: hammasiga). */
  locationId: number | null;
  current: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(current);
  const submit = useMutation({
    mutationFn: () => setMinQuantity(locationId ?? 0, item.id, value),
    onSuccess: () => {
      toast.success("Minimal qoldiq saqlandi");
      void queryClient.invalidateQueries({ queryKey: queryKeys.sklad });
      onOpenChange(false);
    },
    onError: (error) => toast.error(skladErrorMessage(error, "Minimal qoldiqni saqlashda xatolik")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[22rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>Minimal qoldiq</DialogTitle>
        <DialogDescription>
          <span data-no-translit>{item.name}</span>
          {" — pastga tushsa viloyat sariq/qizil bo'ladi."}
        </DialogDescription>
        <Field label="Dona" className="mt-3">
          <NumberInput value={value} onChange={setValue} label="Minimal qoldiq" tall />
        </Field>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button type="button" size="lg" disabled={submit.isPending} onClick={() => submit.mutate()}>
            Saqlash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
