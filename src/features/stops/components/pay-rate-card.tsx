"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, LoaderCircle, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPayRate, savePayRate } from "@/features/stops/api";
import { stopErrorMessage } from "@/features/stops/error-hints";
import { errorCode } from "@/lib/api-client";
import { formatShortDateTime, formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

/**
 * Kuryer haqi stavkasi (`LOGIST_03` §2–3): so'm / manzil, umumiy.
 * Faqat bosh filial logisti o'zgartiradi (`can_edit`); boshqalarga faqat
 * ko'rish. Stavka belgilanmagan bo'lsa `0` — hisob chiqmaydi, xolos.
 */
export function PayRateCard() {
  const rate = useQuery({
    queryKey: queryKeys.payRate,
    queryFn: ({ signal }) => fetchPayRate(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (rate.isPending) return <Skeleton className="h-28 rounded-xl" />;
  if (errorCode(rate.error) === "endpoint_missing") return null;

  return (
    <section className="border-line bg-surface flex flex-col gap-3 rounded-xl border px-4 py-3.5">
      <header className="flex items-center gap-2">
        <Coins className="text-gold size-4" aria-hidden />
        <h2 className="text-ink text-dense font-semibold">Kuryer haqi</h2>
        {rate.data && !rate.data.canEdit ? (
          <span
            className="text-ink-faint ml-auto inline-flex items-center gap-1 text-fine"
            title="Stavkani faqat bosh filial logisti belgilaydi"
          >
            <Lock className="size-3" aria-hidden />
            Faqat ko&apos;rish
          </span>
        ) : null}
      </header>

      {rate.error ? (
        <p className="text-danger text-meta">
          {stopErrorMessage(rate.error, "Stavkani yuklashda xatolik")}{" "}
          <button
            type="button"
            className="text-link font-medium hover:underline"
            onClick={() => void rate.refetch()}
          >
            Qayta urinish
          </button>
        </p>
      ) : rate.data ? (
        <>
          <p className="text-ink tabular text-title">
            {rate.data.perStop > 0 ? formatSom(rate.data.perStop) : "Belgilanmagan"}
            <span className="text-ink-muted text-meta font-normal"> / manzil</span>
          </p>
          <p className="text-ink-muted text-meta">
            1 manzilga bir borish = 1 to&apos;lov, ikki zakaz bo&apos;lsa ham.
          </p>
          {rate.data.canEdit ? <PayRateForm current={rate.data.perStop} /> : null}
          {rate.data.history.length > 0 ? (
            <ul className="flex flex-col gap-1" aria-label="Stavka tarixi">
              {rate.data.history.slice(0, 4).map((entry, index) => (
                <li
                  key={`${entry.effectiveFrom ?? ""}-${index}`}
                  className="text-ink-muted flex flex-wrap items-baseline gap-x-2 text-fine"
                >
                  <span className="text-ink tabular font-semibold">{formatSom(entry.perStop)}</span>
                  {entry.effectiveFrom ? <span className="tabular">{entry.effectiveFrom} dan</span> : null}
                  {entry.createdBy ? <span data-no-translit>{entry.createdBy}</span> : null}
                  {entry.createdAt ? (
                    <span className="tabular ml-auto">{formatShortDateTime(entry.createdAt)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function PayRateForm({ current }: { current: number }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(current > 0 ? String(current) : "");
  const [from, setFrom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (perStop: number) => savePayRate({ perStop, effectiveFrom: from || null }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.payRate, next);
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      toast.success(`Yangi stavka: ${formatSom(next.perStop)} / manzil`);
      setError(null);
    },
    onError: (failure) => setError(stopErrorMessage(failure, "Stavkani saqlashda xatolik")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const perStop = Number(value.replace(/\s/g, ""));
    if (!Number.isFinite(perStop) || perStop < 0 || !Number.isInteger(perStop)) {
      setError("Stavka butun musbat son bo'lsin");
      return;
    }
    save.mutate(perStop);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2" noValidate>
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-ink-muted text-fine">Stavka, so&apos;m</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          className={inputClass}
        />
      </label>
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-ink-muted text-fine">Amal qilish sanasi</span>
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className={inputClass}
        />
      </label>
      <Button type="submit" size="lg" disabled={save.isPending}>
        {save.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Saqlash
      </Button>
      {error ? (
        <p role="alert" className="text-danger w-full text-meta">
          {error}
        </p>
      ) : null}
    </form>
  );
}
