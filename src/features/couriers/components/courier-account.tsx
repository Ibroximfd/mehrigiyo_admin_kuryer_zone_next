"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  LoaderCircle,
  LogOut,
  MoreVertical,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { CopyButton } from "@/components/kit/copy-button";
import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deactivateCourier,
  logoutCourierDevice,
  setCourierPassword,
} from "@/features/couriers/api";
import type { Courier } from "@/features/couriers/types";
import { errorMessage } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

type Action = "password" | "logout" | "deactivate" | null;

/**
 * Kuryer ilovasi akkaunti (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.3):
 * parol berish/yangilash, qurilmadan chiqarish, ilovadan o'chirish.
 */
export function CourierAccountMenu({ courier }: { courier: Courier }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.couriers });

  const logout = useMutation({
    mutationFn: () => logoutCourierDevice(courier.id),
    onSuccess: () => {
      toast.success(`${courier.fullName} qurilmadan chiqarildi`);
      setAction(null);
      refresh();
    },
    onError: (error) => {
      setAction(null);
      toast.error(errorMessage(error, "Qurilmadan chiqarishda xatolik"));
    },
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateCourier(courier.id),
    onSuccess: () => {
      toast.success(`${courier.fullName} ilovadan o'chirildi`);
      setAction(null);
      refresh();
    },
    onError: (error) => {
      setAction(null);
      toast.error(errorMessage(error, "Kuryerni o'chirishda xatolik"));
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${courier.fullName} — ilova akkaunti`}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => setAction("password")}>
            <KeyRound />
            {courier.hasAccount
              ? "Parolni yangilash"
              : "Ilova akkauntini ochish"}
          </DropdownMenuItem>
          {courier.hasAccount ? (
            <>
              <DropdownMenuItem
                disabled={!courier.device}
                onSelect={() => setAction("logout")}
              >
                <LogOut />
                Qurilmadan chiqarish
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setAction("deactivate")}
              >
                <ShieldOff />
                Ilovadan o&apos;chirish
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SetPasswordDialog
        courier={courier}
        open={action === "password"}
        onOpenChange={(open) => setAction(open ? "password" : null)}
        onDone={(password) => {
          setAction(null);
          setRevealed(password);
          refresh();
        }}
      />

      <ConfirmDialog
        open={action === "logout"}
        onOpenChange={(open) => setAction(open ? "logout" : null)}
        title="Qurilmadan chiqarilsinmi?"
        description={`${courier.fullName} · ${courier.device?.deviceName ?? "telefon"}`}
        consequence="Kuryer o'z paroli bilan qayta kira oladi. Telefondagi yuborilmagan amallar o'sha telefonda qoladi."
        confirmLabel="Chiqarish"
        isPending={logout.isPending}
        onConfirm={() => logout.mutate()}
      />

      <ConfirmDialog
        open={action === "deactivate"}
        onOpenChange={(open) => setAction(open ? "deactivate" : null)}
        title="Ilovadan o'chirilsinmi?"
        description={courier.fullName}
        consequence="Kuryer ilovaga kira olmaydi, sessiyasi darhol yopiladi. Qayta yoqish uchun yangi parol beriladi."
        confirmLabel="O'chirish"
        isPending={deactivate.isPending}
        onConfirm={() => deactivate.mutate()}
      />

      <PasswordRevealDialog
        courier={courier}
        password={revealed}
        onClose={() => setRevealed(null)}
      />
    </>
  );
}

function SetPasswordDialog({
  courier,
  open,
  onOpenChange,
  onDone,
}: {
  courier: Courier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (password: string | null) => void;
}) {
  const [password, setPassword] = useState("");

  const submit = useMutation({
    mutationFn: () => setCourierPassword(courier.id, password.trim()),
    onSuccess: (result) => {
      setPassword("");
      onDone(result.password ?? (password.trim() || null));
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Parolni o'rnatishda xatolik")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>
          {courier.hasAccount ? "Parolni yangilash" : "Ilova akkauntini ochish"}
        </DialogTitle>
        <DialogDescription>
          <span data-no-translit>{courier.fullName}</span> ·{" "}
          {formatPhone(courier.phone)}
          {courier.hasAccount ? " — kuryerning barcha qurilmasi uziladi." : ""}
        </DialogDescription>

        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!submit.isPending) submit.mutate();
          }}
        >
          <Field
            label="Yangi parol"
            hint="Bo'sh qoldirsangiz server oson parol yasaydi."
          >
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="masalan, 482913"
              autoFocus
              className={inputClass}
            />
          </Field>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Parol faqat shu oynada, bir marta ko'rinadi — keyin uni hech qayerdan
 * o'qib bo'lmaydi. Logist kuryerga aytadi.
 */
export function PasswordRevealDialog({
  courier,
  password,
  onClose,
}: {
  courier: Pick<Courier, "fullName" | "phone"> | null;
  password: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={password !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>Kuryerga ayting</DialogTitle>
        <DialogDescription>
          Parol faqat hozir ko&apos;rinadi — keyin uni qayta ko&apos;rib
          bo&apos;lmaydi.
        </DialogDescription>

        <dl className="bg-subtle mt-3 grid gap-2 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted text-meta">Telefon</dt>
            <dd className="text-ink tabular font-semibold">
              {courier ? formatPhone(courier.phone) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted text-meta">Parol</dt>
            <dd>
              <CopyButton
                value={password ?? ""}
                label="Parolni nusxalash"
                successMessage="Parol nusxalandi"
              >
                <span className="text-ink tabular text-title font-semibold tracking-wide">
                  {password}
                </span>
              </CopyButton>
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Aytdim</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
