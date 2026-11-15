"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/kit/copy-button";
import { Field, inputClass } from "@/components/kit/field";
import { SecretValue } from "@/components/kit/secret-value";
import { ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyCredentials, updateMyCredentials } from "@/features/account/api";
import { credentialsPatch } from "@/features/account/types";
import type { MyCredentials } from "@/features/account/types";
import { errorMessage } from "@/lib/api-client";
import { apiFieldError, passwordError } from "@/lib/password";
import { queryKeys } from "@/lib/query-keys";

/**
 * Bosh kuryerning o'z login/paroli (hujjat 67 §4): ko'rish va o'zgartirish.
 * O'zgartirgandan keyin saytdan chiqarilmaydi — shu qurilmada ishlayveradi.
 */
export function MyCredentialsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open ? <Body onDone={() => onOpenChange(false)} /> : null}</DialogContent>
    </Dialog>
  );
}

function Body({ onDone }: { onDone: () => void }) {
  const credentials = useQuery({
    queryKey: queryKeys.myCredentials,
    queryFn: ({ signal }) => fetchMyCredentials(signal),
    // Parol xotirada ortiqcha turmasin.
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <div>
      <DialogTitle>Login va parol</DialogTitle>
      <DialogDescription>Saytga kirish ma&apos;lumotlaringiz</DialogDescription>
      {credentials.isPending ? (
        <div className="mt-4 space-y-2" aria-busy>
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : credentials.isError ? (
        <ErrorView
          message={errorMessage(credentials.error, "Login va parolni yuklashda xatolik")}
          onRetry={() => void credentials.refetch()}
          className="mt-4"
        />
      ) : (
        <CredentialsForm data={credentials.data} onDone={onDone} />
      )}
    </div>
  );
}

function CredentialsForm({ data, onDone }: { data: MyCredentials; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(data.username);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const errors = {
    username: username.trim() ? null : "Loginni kiriting",
    password: passwordError(password, { optional: true }),
  };
  const patch = credentialsPatch(data, { username, password });

  const save = useMutation({
    mutationFn: () => updateMyCredentials(patch ?? {}),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.myCredentials, next);
      toast.success("Login va parol saqlandi");
      onDone();
    },
    onError: (error) => {
      if (!apiFieldError(error, "username") && !apiFieldError(error, "password"))
        toast.error(errorMessage(error, "Login va parolni saqlashda xatolik"));
    },
  });

  const shownError = (field: "username" | "password") =>
    touched ? (errors[field] ?? apiFieldError(save.error, field) ?? undefined) : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (errors.username || errors.password || !patch || save.isPending) return;
        save.mutate();
      }}
    >
      <dl className="bg-subtle mt-4 grid gap-2.5 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted text-meta">Login</dt>
          <dd>
            <CopyButton value={data.username} label="Loginni nusxalash" successMessage="Login nusxalandi">
              <span className="text-ink font-semibold" data-no-translit>
                {data.username}
              </span>
            </CopyButton>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted text-meta">Parol</dt>
          <dd className="text-right">
            {data.password ? (
              <SecretValue value={data.password} label="Parol" />
            ) : (
              <span className="text-warn text-dense font-medium">Parol noma&apos;lum — yangisini qo&apos;ying</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3.5">
        <Field label="Login" htmlFor="my-username" error={shownError("username")}>
          <input
            id="my-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(shownError("username"))}
            value={username}
            maxLength={150}
            onChange={(event) => {
              setUsername(event.target.value);
              if (save.isError) save.reset();
            }}
            className={inputClass}
          />
        </Field>
        <Field
          label="Yangi parol"
          htmlFor="my-new-password"
          error={shownError("password")}
          hint="Kamida 6 belgi. O'zgartirmasangiz bo'sh qoldiring."
        >
          <input
            id="my-new-password"
            type="text"
            autoComplete="new-password"
            spellCheck={false}
            aria-invalid={Boolean(shownError("password"))}
            value={password}
            maxLength={64}
            onChange={(event) => {
              setPassword(event.target.value);
              if (save.isError) save.reset();
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={save.isPending || !patch}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}
