"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { describeError, validationMessage } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { mapFieldErrors } from "@/shared/lib/app-error";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field } from "@/shared/ui/field";
import { PasswordInput } from "@/shared/ui/password-input";

import { useSetCourierPassword } from "../hooks/use-couriers";
import type { Courier } from "../model/courier";
import {
  resolveOneTimePassword,
  setPasswordFormSchema,
  toSetPasswordPayload,
  type SetPasswordFormValues,
} from "../model/courier-form";
import type { OneTimePassword } from "./one-time-password-dialog";
import { PasswordModeField } from "./password-mode-field";

/**
 * "Parol berish": hamma qurilma uziladi — ogohlantirish tasdiqdan oldin ko'rinadi.
 * Sukut — server yaratadi (backend #24); javobdagi parol bir martalik oynada.
 */
export function SetPasswordDialog({
  courier,
  onClose,
  onPassword,
}: {
  courier: Courier | null;
  onClose: () => void;
  onPassword: (value: OneTimePassword) => void;
}) {
  const t = useT();
  return (
    <Dialog open={courier !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent closeLabel={t.common.close}>
        {courier ? <SetPasswordForm key={courier.id} courier={courier} onClose={onClose} onPassword={onPassword} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordForm({ courier, onClose, onPassword }: { courier: Courier; onClose: () => void; onPassword: (value: OneTimePassword) => void }) {
  const t = useT();
  const setPassword = useSetCourierPassword();
  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordFormSchema),
    mode: "onBlur",
    defaultValues: { mode: "auto", password: "" },
  });
  const { errors } = form.formState;
  const mode = useWatch({ control: form.control, name: "mode" });

  const submit = form.handleSubmit(async (values) => {
    if (setPassword.isPending) return;
    try {
      const result = await setPassword.mutateAsync({ id: courier.id, payload: toSetPasswordPayload(values) });
      onClose();
      const password = resolveOneTimePassword(values.mode, values.password, result.password);
      if (password) onPassword({ name: courier.fullName, phone: courier.phone, password });
      else toast.warning(t.couriers.passwordMissing);
    } catch (error) {
      const mapping = mapFieldErrors(error, ["password"] as const);
      const fieldMessage = mapping.fields[0]?.message;
      if (fieldMessage && values.mode === "manual") form.setError("password", { type: "server", message: fieldMessage });
      else form.setError("root", { type: "server", message: fieldMessage ?? describeError(error, t) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t.couriers.setPasswordTitle(courier.fullName)}</DialogTitle>
        <DialogDescription>{t.couriers.setPasswordText}</DialogDescription>
      </DialogHeader>
      <Controller
        control={form.control}
        name="mode"
        render={({ field }) => (
          <PasswordModeField
            mode={field.value}
            onModeChange={(next) => {
              field.onChange(next);
              form.clearErrors("password");
            }}
          />
        )}
      />
      {mode === "manual" ? (
        <Field label={t.couriers.password} hint={t.couriers.passwordManualHint} error={validationMessage(t, errors.password?.message)}>
          {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("password")} />}
        </Field>
      ) : null}
      {errors.root?.message ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errors.root.message}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={setPassword.isPending}>
          {t.common.cancel}
        </Button>
        <Button type="submit" pending={setPassword.isPending}>
          {t.couriers.setPasswordConfirm}
        </Button>
      </DialogFooter>
    </form>
  );
}
