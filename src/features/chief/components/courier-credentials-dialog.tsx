"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, LogOut, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { CopyButton } from "@/components/kit/copy-button";
import { Field, inputClass } from "@/components/kit/field";
import { SecretValue } from "@/components/kit/secret-value";
import { ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCourierCredentials, logoutCourierDevice, setCourierPassword } from "@/features/chief/api";
import type { CourierCredentials } from "@/features/chief/credentials";
import type { Courier } from "@/features/couriers/types";
import { errorCode, errorMessage } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { apiFieldError, passwordError } from "@/lib/password";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Kuryerning login/paroli (hujjat 67): ko'rish, yangi parol qo'yish
 * (akkaunt yo'q bo'lsa — ochish) va qurilmadan chiqarish. Parol faqat shu
 * oyna ochiq turganda so'raladi va keshda qolmaydi.
 */
export function CourierCredentialsDialog({ courier, onClose }: { courier: Courier | null; onClose: () => void }) {
  return (
    <Dialog open={courier !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {courier ? <CredentialsBody key={courier.id} courier={courier} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function loadErrorText(error: unknown): string {
  switch (errorCode(error)) {
    case "courier_not_yours":
      return "Bu kuryer jamoangizda emas";
    case "courier_not_found":
      return "Kuryer topilmadi";
    default:
      return errorMessage(error, "Login va parolni yuklashda xatolik");
  }
}

function CredentialsBody({ courier }: { courier: Courier }) {
  const queryClient = useQueryClient();
  const key = queryKeys.chiefCourierCredentials(courier.id);
  const credentials = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchCourierCredentials(courier.id, signal),
    // Parol xotirada ortiqcha turmasin — oyna yopilishi bilan tashlanadi.
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <div>
      <DialogTitle>Login va parol</DialogTitle>
      <DialogDescription>
        <span data-no-translit>{courier.fullName}</span>
        {" · kuryer ilovasiga kirish"}
      </DialogDescription>

      {credentials.isPending ? (
        <div className="mt-4 space-y-2" aria-busy>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : credentials.isError ? (
        <ErrorView
          message={loadErrorText(credentials.error)}
          onRetry={() => void credentials.refetch()}
          className="mt-4"
        />
      ) : (
        <CredentialsReady
          courier={courier}
          data={credentials.data}
          onChanged={(next) => {
            queryClient.setQueryData(key, next);
            void queryClient.invalidateQueries({ queryKey: queryKeys.chiefCouriers });
          }}
        />
      )}
    </div>
  );
}

function deviceLabel(courier: Courier): string | null {
  const device = courier.device;
  if (!device) return null;
  const parts = [device.deviceName ?? device.platform, device.appVersion ? `v${device.appVersion}` : null];
  return parts.filter(Boolean).join(" · ") || "Qurilma";
}

function CredentialsReady({
  courier,
  data,
  onChanged,
}: {
  courier: Courier;
  data: CourierCredentials;
  onChanged: (next: CourierCredentials) => void;
}) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const localError = passwordError(password, { optional: true });

  const save = useMutation({
    mutationFn: () => setCourierPassword(data, password),
    onSuccess: (next) => {
      toast.success(data.hasAccount ? "Yangi parol qo'yildi" : "Akkaunt ochildi");
      setConfirming(false);
      setPassword("");
      setTouched(false);
      onChanged(next);
    },
    onError: (error) => {
      setConfirming(false);
      if (!apiFieldError(error, "password")) toast.error(errorMessage(error, "Parol qo'yishda xatolik"));
    },
  });

  const logout = useMutation({
    mutationFn: () => logoutCourierDevice(courier.id),
    onSuccess: () => {
      toast.success(`${courier.fullName} qurilmadan chiqarildi`);
      setLoggingOut(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefCouriers });
    },
    onError: (error) => toast.error(errorMessage(error, "Qurilmadan chiqarishda xatolik")),
  });

  const fieldError = touched ? (localError ?? apiFieldError(save.error, "password")) : null;
  const device = deviceLabel(courier);
  const submit = () => {
    setTouched(true);
    if (localError || save.isPending) return;
    // Akkaunt bor bo'lsa — kuryer ilovadan chiqariladi, oldin so'raymiz.
    if (data.hasAccount) setConfirming(true);
    else save.mutate();
  };

  return (
    <>
      <dl className="bg-subtle mt-4 grid gap-2.5 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted text-meta">Login</dt>
          <dd>
            <CopyButton value={data.login} label="Loginni nusxalash" successMessage="Login nusxalandi">
              <span className="text-ink tabular font-semibold">{formatPhone(data.login) || data.login}</span>
            </CopyButton>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted text-meta">Parol</dt>
          <dd className="text-right">
            {!data.hasAccount ? (
              <span className="text-ink-muted text-dense">Ilova akkaunti yo&apos;q</span>
            ) : data.password ? (
              <SecretValue value={data.password} label="Parol" />
            ) : (
              <span className="text-warn text-dense font-medium">Parol noma&apos;lum — yangisini qo&apos;ying</span>
            )}
          </dd>
        </div>
        {data.hasAccount ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted text-meta">Qurilma</dt>
            <dd className="text-ink text-dense flex items-center gap-1.5">
              {device ? (
                <>
                  <Smartphone aria-hidden className="text-ink-faint size-3.5" />
                  <span data-no-translit>{device}</span>
                </>
              ) : (
                <span className="text-ink-faint">Ilovaga kirmagan</span>
              )}
            </dd>
          </div>
        ) : null}
      </dl>

      <form
        noValidate
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label={data.hasAccount ? "Yangi parol" : "Parol"}
          htmlFor="courier-new-password"
          error={fieldError ?? undefined}
          hint="Kamida 6 belgi. Bo'sh qoldirsangiz — server o'zi yasaydi."
        >
          <input
            id="courier-new-password"
            type="text"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(fieldError)}
            value={password}
            maxLength={64}
            onChange={(event) => {
              setPassword(event.target.value);
              if (save.isError) save.reset();
            }}
            className={cn(inputClass, "tabular")}
          />
        </Field>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {device ? (
            <Button type="button" variant="ghost" onClick={() => setLoggingOut(true)} disabled={logout.isPending}>
              <LogOut />
              Qurilmadan chiqarish
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={save.isPending || (touched && Boolean(localError))}>
            {save.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
            {data.hasAccount ? "Parolni o'zgartirish" : "Akkaunt ochish"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Parol o'zgartirilsinmi?"
        description="Yangi parolni kuryerga ayting — u ilovaga shu parol bilan qayta kiradi."
        consequence="Kuryer ilovadan chiqariladi"
        confirmLabel="O'zgartirish"
        isPending={save.isPending}
        onConfirm={() => save.mutate()}
      />
      <ConfirmDialog
        open={loggingOut}
        onOpenChange={setLoggingOut}
        title="Qurilmadan chiqarilsinmi?"
        description="Parol o'zgarmaydi — kuryer shu parol bilan qayta kira oladi."
        consequence="Kuryer ilovadan chiqariladi"
        confirmLabel="Chiqarish"
        isPending={logout.isPending}
        onConfirm={() => logout.mutate()}
      />
    </>
  );
}
