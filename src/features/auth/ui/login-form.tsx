"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { describeError, validationMessage } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { isAppError } from "@/shared/lib/app-error";
import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { PasswordInput } from "@/shared/ui/password-input";
import { PhoneInput } from "@/shared/ui/phone-input";

import { useAuthStore } from "../hooks/auth-store";
import { useLogin } from "../hooks/use-login";
import { INVALID_CREDENTIALS, loginFormSchema, type LoginFormValues } from "../model/auth";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const expired = useAuthStore((state) => state.expired);
  const login = useLogin();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
    defaultValues: { phone: "", password: "" },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    if (login.isPending) return;
    try {
      await login.mutateAsync(values);
      onSuccess();
    } catch (error) {
      const message =
        isAppError(error) && error.code === INVALID_CREDENTIALS ? t.auth.invalidCredentials : describeError(error, t);
      form.setError("root", { message });
      form.setValue("password", "");
      form.setFocus("password");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {expired && !errors.root ? (
        <p role="status" className="rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
          {t.auth.sessionExpired}
        </p>
      ) : null}

      <Field label={t.auth.phone} error={validationMessage(t, errors.phone?.message)}>
        {(control) => (
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                {...control}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="username"
                autoFocus
              />
            )}
          />
        )}
      </Field>

      <Field label={t.auth.password} error={validationMessage(t, errors.password?.message)}>
        {(control) => <PasswordInput {...control} autoComplete="current-password" {...form.register("password")} />}
      </Field>

      {errors.root?.message ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" pending={login.isPending} className="w-full">
        {login.isPending ? t.auth.submitting : t.auth.submit}
      </Button>
    </form>
  );
}
