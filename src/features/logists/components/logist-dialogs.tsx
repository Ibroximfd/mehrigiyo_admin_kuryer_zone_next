"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LoaderCircle, WandSparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/kit/copy-button";
import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { createLogist, grantRole, logistsErrorMessage, replaceRolePermissions } from "../api";
import { useMyPermissions } from "../hooks";
import { REGIONS, regionLabel } from "@/features/orders/regions";
import { can } from "../types";
import { isRoleDefault, roleLabel } from "../types";
import type { LogistFilial, LogistSeat, StaffRole } from "../types";
import { LogistPermissionPicker } from "./logist-permission-picker";

const PASSWORD_MIN = 6;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Tasodifiy parol — ko'z bilan o'qiladigan belgilar (l/1/0/o yo'q). */
function randomPassword(length = 10): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join("");
}

/**
 * Yangi akkaunt (bosh logist, `logist.create`): filial, kirish, rol va
 * qo'shimcha dopusklar. «Viloyat bosh kuryeri» tanlansa akkaunt ochilgach
 * unga shu viloyatga `chief_courier` roli darhol beriladi (`logist.grant`).
 */
export function CreateLogistDialog({
  filials,
  defaultFilialId,
  onClose,
}: {
  filials: readonly LogistFilial[];
  defaultFilialId: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ username: string; password: string; note: string | null } | null>(null);
  const permissions = useMyPermissions();
  const canGrant = can(permissions.data, "logist.grant");
  const [kind, setKind] = useState<"logist" | "chief">("logist");
  const [region, setRegion] = useState<string>(REGIONS[0]!.value);
  const [filialId, setFilialId] = useState<number | null>(defaultFilialId ?? filials[0]?.id ?? null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const passwordError = password.length > 0 && password.length < PASSWORD_MIN;
  const ready = filialId !== null && fullName.trim() && username.trim() && password.length >= PASSWORD_MIN;

  const save = useMutation({
    mutationFn: async () => {
      const credentials = await createLogist({
        filialId: filialId!,
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        permissions: extras.filter((key) => !isRoleDefault("logist", key)),
      });
      if (kind !== "chief") return { ...credentials, note: null };
      // Akkaunt ochildi — rol xatosi uni bekor qilmaydi, faqat aytiladi.
      try {
        if (credentials.seatId === null) throw new Error();
        await grantRole({ seatId: credentials.seatId, role: "chief_courier", scopeKind: "region", scopeId: region, permissions: [] });
        return { ...credentials, note: `${regionLabel(region)} — bosh kuryer` };
      } catch {
        return { ...credentials, note: "Bosh kuryer roli berilmadi — «Kuryerlar → Bosh kuryerlar» dan qayta tayinlang" };
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["structure"] });
      void queryClient.invalidateQueries({ queryKey: ["chiefs"] });
      toast.success(kind === "chief" ? "Bosh kuryer akkaunti ochildi" : "Logist ochildi");
      setCreated(result);
    },
    onError: (error) => toast.error(logistsErrorMessage(error, "Logist ochishda xatolik")),
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[34rem] max-w-[calc(100vw-1.5rem)] flex-col">
        {created ? (
          <>
            <div className="flex items-center gap-2.5">
              <CircleCheck className="text-ok size-6 shrink-0" aria-hidden />
              <DialogTitle>Logist tayyor</DialogTitle>
            </div>
            <DialogDescription className="text-ink-muted text-dense">
              Login va parolni logistga bering — parol boshqa ko&apos;rsatilmaydi.
            </DialogDescription>
            {created.note ? <p className="text-ink-muted mt-2 text-meta">{created.note}</p> : null}
            <dl className="border-line bg-subtle mt-3 space-y-2 rounded-xl border px-3.5 py-3 text-dense">
              {[
                ["Login", created.username],
                ["Parol", created.password],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-2">
                  <dt className="text-ink-muted w-14">{label}</dt>
                  <dd className="text-ink min-w-0 flex-1 truncate font-mono" data-no-translit>
                    {value}
                  </dd>
                  <CopyButton value={value!} label={`${label} nusxalash`} />
                </div>
              ))}
            </dl>
            <div className="mt-4 flex justify-end">
              <Button size="lg" onClick={onClose}>
                Tayyor
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>Yangi logist</DialogTitle>
            <DialogDescription className="text-ink-muted text-dense">
              Logist shu login bilan logist saytiga kiradi.
            </DialogDescription>
            <form
              className="scrollbar-thin -mx-1 mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-1"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (ready && !save.isPending) save.mutate();
              }}
            >
              <Field label="Filial">
                <select
                  id="logist-filial"
                  aria-label="Filial"
                  value={filialId ?? ""}
                  onChange={(event) => setFilialId(Number(event.target.value))}
                  className={inputClass}
                >
                  {filials.map((filial) => (
                    <option key={filial.id} value={filial.id}>
                      {filial.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ism familiya">
                <input
                  id="logist-name"
                  aria-label="Ism familiya"
                  autoFocus
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Login">
                  <input
                    id="logist-username"
                  aria-label="Login"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="off"
                    className={cn(inputClass, "font-mono")}
                  />
                </Field>
                <Field
                  label="Parol"
                 
                  error={passwordError ? `Kamida ${PASSWORD_MIN} belgi` : undefined}
                >
                  <div className="flex gap-1.5">
                    <input
                      id="logist-password"
                  aria-label="Parol"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      spellCheck={false}
                      className={cn(inputClass, "min-w-0 flex-1 font-mono")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Tasodifiy parol"
                      title="Tasodifiy parol"
                      onClick={() => setPassword(randomPassword())}
                    >
                      <WandSparkles />
                    </Button>
                  </div>
                </Field>
              </div>
              {canGrant ? (
                <div className="border-line space-y-3 rounded-xl border p-3.5">
                  <p className="eyebrow">Rol</p>
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Rol">
                    {(
                      [
                        ["logist", "Logist", "Zakazlarni boshqaradi, bosh kuryerga beradi"],
                        ["chief", "Viloyat bosh kuryeri", "Viloyat zakazlarini o'z kuryerlariga taqsimlaydi"],
                      ] as const
                    ).map(([value, label, hint]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={kind === value}
                        onClick={() => setKind(value)}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-left transition-colors duration-(--dur-micro)",
                          kind === value ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                        )}
                      >
                        <span className="text-ink block text-dense font-semibold">{label}</span>
                        <span className="text-ink-faint block text-fine">{hint}</span>
                      </button>
                    ))}
                  </div>
                  {kind === "chief" ? (
                    <Field label="Viloyat">
                      <select
                        aria-label="Viloyat"
                        value={region}
                        onChange={(event) => setRegion(event.target.value)}
                        className={inputClass}
                      >
                        {REGIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                </div>
              ) : null}
              <div>
                <p className="text-ink text-dense pb-2 font-medium">Qo&apos;shimcha dopusklar</p>
                <LogistPermissionPicker role="logist" value={extras} onChange={setExtras} disabled={save.isPending} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="lg" onClick={onClose}>
                  Bekor qilish
                </Button>
                <Button type="submit" size="lg" disabled={!ready || save.isPending}>
                  {save.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Saqlash
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Mavjud rolning qo'shimcha dopusklari (`logist.grant`). */
export function LogistPermissionsDialog({
  seat,
  role,
  onClose,
}: {
  seat: LogistSeat;
  role: StaffRole;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [extras, setExtras] = useState<string[]>(role.permissions);
  const changed = extras.length !== role.permissions.length || extras.some((key) => !role.permissions.includes(key));
  const save = useMutation({
    mutationFn: () => replaceRolePermissions(role, seat.id, extras.filter((key) => !isRoleDefault(role.role, key))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["structure"] });
      toast.success("Dopusklar saqlandi");
      onClose();
    },
    onError: (error) => toast.error(logistsErrorMessage(error, "Dopusklarni saqlashda xatolik")),
  });
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[34rem] max-w-[calc(100vw-1.5rem)] flex-col">
        <DialogTitle>Dopusklar · {roleLabel(role.role)}</DialogTitle>
        <DialogDescription className="text-ink-muted text-dense" data-no-translit>
          {seat.fullName} · {seat.username}
        </DialogDescription>
        <div className="scrollbar-thin -mx-1 mt-4 min-h-0 flex-1 overflow-y-auto px-1">
          <LogistPermissionPicker role={role.role} value={extras} onChange={setExtras} disabled={save.isPending} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="lg" disabled={!changed || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Saqlash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
