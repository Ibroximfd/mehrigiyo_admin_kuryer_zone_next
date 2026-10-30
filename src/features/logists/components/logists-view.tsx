"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Crown, KeyRound, Lock, Plus, ServerOff, ShieldX, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, useConfirm } from "@/components/kit/confirm-dialog";
import { PageHeader } from "@/components/kit/page-header";
import { EmptyView, ErrorView, TableSkeleton } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { isEndpointMissing } from "@/lib/api-availability";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { blockLogist, fetchLogistTree, grantRole, logistsErrorMessage, revokeRole } from "../api";
import { useMyPermissions } from "../hooks";
import { activeRoles, can, hasAllScope, permissionLabel, roleLabel } from "../types";
import type { LogistSeat, StaffRole } from "../types";
import { CreateLogistDialog, LogistPermissionsDialog } from "./logist-dialogs";

type Pending =
  | { kind: "revoke"; seat: LogistSeat; role: StaffRole }
  | { kind: "block"; seat: LogistSeat }
  | { kind: "promote"; seat: LogistSeat };

/**
 * «Logistlar» — bosh logist logist ochadi, dopusk beradi, bosh logist
 * qiladi va rolni yopadi (B2 §4, §6). Tugmalar dopusk bo'yicha.
 */
export function LogistsView() {
  const queryClient = useQueryClient();
  const permissions = useMyPermissions();
  const tree = useQuery({
    queryKey: queryKeys.logistStructure,
    queryFn: ({ signal }) => fetchLogistTree(signal),
    retry: (count, error) => !isEndpointMissing(error) && count < 2,
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ seat: LogistSeat; role: StaffRole } | null>(null);
  const confirm = useConfirm<Pending>();

  const canCreate = can(permissions.data, "logist.create");
  const canGrant = can(permissions.data, "logist.grant");
  const canBlock = can(permissions.data, "seat.block");
  const allScope = hasAllScope(permissions.data?.roles ?? tree.data?.meRoles ?? []);

  const done = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: ["structure"] });
    toast.success(message);
  };
  const act = useMutation({
    mutationFn: async (pending: Pending) => {
      if (pending.kind === "revoke") return revokeRole(pending.role.id);
      if (pending.kind === "block") return blockLogist(pending.seat.id);
      await grantRole({ seatId: pending.seat.id, role: "chief_logist", scopeKind: "all", scopeId: "", permissions: [] });
    },
    onSuccess: (_result, pending) =>
      done(
        pending.kind === "revoke" ? "Rol yopildi" : pending.kind === "block" ? "Logist bloklandi" : "Bosh logist qilindi",
      ),
    onError: (error) => toast.error(logistsErrorMessage(error, "Amalni bajarib bo'lmadi")),
  });

  const filials = tree.data?.filials ?? [];
  const total = filials.reduce((sum, filial) => sum + filial.logists.length, 0);

  return (
    <>
      <PageHeader
        title="Logistlar"
        description="Logist ochish, dopusklar va bosh logist"
        onRefresh={() => void tree.refetch()}
        isRefreshing={tree.isFetching}
        actions={
          canCreate && filials.length > 0 ? (
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Yangi logist</span>
            </Button>
          ) : null
        }
      />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <MyAccessCard
          loading={permissions.isPending}
          failed={permissions.isError}
          roles={activeRoles(permissions.data?.roles ?? [])}
          granted={Object.entries(permissions.data?.permissions ?? {})
            .filter(([, value]) => value)
            .map(([key]) => key)}
          canCreate={canCreate}
          canGrant={canGrant}
        />
        {tree.isPending ? (
          <TableSkeleton rows={5} />
        ) : tree.isError ? (
          isEndpointMissing(tree.error) ? (
            <EmptyView
              Icon={ServerOff}
              title="Serverda hali yoqilmagan"
              description="Logistlar bo'limi backend yangilangach ishlaydi."
            />
          ) : (
            <ErrorView
              message={logistsErrorMessage(tree.error, "Logistlarni yuklab bo'lmadi")}
              onRetry={() => void tree.refetch()}
            />
          )
        ) : total === 0 ? (
          <EmptyView
            Icon={UsersRound}
            title="Logist yo'q"
            description={canCreate ? "Birinchi logistni oching." : "Sizga ko'rinadigan logist yo'q."}
          />
        ) : (
          filials
            .filter((filial) => filial.logists.length > 0)
            .map((filial) => (
              <section key={filial.id} className="border-line bg-surface rounded-xl border">
                <h2 className="border-line text-ink flex items-center gap-2 border-b px-4 py-2.5 text-dense font-semibold">
                  <Building2 className="text-ink-muted size-4" aria-hidden />
                  <span className="min-w-0 flex-1 truncate" data-no-translit>
                    {filial.name}
                  </span>
                  <span className="text-ink-faint tabular font-normal">{filial.logists.length}</span>
                </h2>
                <ul className="divide-line divide-y">
                  {filial.logists.map((seat) => {
                    const roles = activeRoles(seat.roles).filter(
                      (role) => role.role === "logist" || role.role === "chief_logist",
                    );
                    const isChief = roles.some((role) => role.role === "chief_logist");
                    return (
                      <li key={seat.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !seat.isActive && "opacity-60")}>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink flex flex-wrap items-center gap-1.5 text-dense font-medium">
                            <span className="truncate" data-no-translit>{seat.fullName || seat.username}</span>
                            {isChief ? <Crown className="text-gold size-3.5" aria-label="Bosh logist" /> : null}
                            {seat.isActive ? null : (
                              <span className="bg-danger-soft text-danger rounded-md px-1.5 text-fine font-semibold">
                                Bloklangan
                              </span>
                            )}
                          </p>
                          <p className="text-ink-faint truncate font-mono text-fine" data-no-translit>
                            {seat.username}
                          </p>
                          <ul className="mt-1.5 flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <li key={role.id} className="flex flex-wrap items-center gap-1">
                                <span className="bg-brand-soft text-brand rounded-md px-1.5 text-fine font-semibold">
                                  {roleLabel(role.role)}
                                </span>
                                {role.permissions.map((key) => (
                                  <span key={key} title={key} className="bg-ok-soft text-ok rounded-md px-1.5 text-fine">
                                    {permissionLabel(key)}
                                  </span>
                                ))}
                                {role.since ? (
                                  <span className="text-ink-faint text-fine">{formatDate(role.since)} dan</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {seat.isActive ? (
                          <div className="flex items-center gap-1">
                            {canGrant && roles[0] ? (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Dopusklar"
                                title="Dopusklar"
                                onClick={() => setEditing({ seat, role: roles[0]! })}
                              >
                                <KeyRound />
                              </Button>
                            ) : null}
                            {canGrant && allScope && !isChief ? (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Bosh logist qilish"
                                title="Bosh logist qilish"
                                onClick={() => confirm.ask({ kind: "promote", seat })}
                              >
                                <Crown />
                              </Button>
                            ) : null}
                            {canGrant
                              ? roles.map((role) => (
                                  <Button
                                    key={role.id}
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`«${roleLabel(role.role)}» rolini yopish`}
                                    title={`«${roleLabel(role.role)}» rolini yopish`}
                                    onClick={() => confirm.ask({ kind: "revoke", seat, role })}
                                  >
                                    <ShieldX />
                                  </Button>
                                ))
                              : null}
                            {canBlock ? (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Bloklash"
                                title="Bloklash"
                                onClick={() => confirm.ask({ kind: "block", seat })}
                              >
                                <Lock />
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(next) => !next && confirm.close()}
        title={
          confirm.target?.kind === "promote"
            ? "Bosh logist qilinsinmi?"
            : confirm.target?.kind === "block"
              ? "Logist bloklansinmi?"
              : "Rol yopilsinmi?"
        }
        description={
          confirm.target?.kind === "promote"
            ? "Barcha filiallar, kassa, kuryerlar va logist ochish ruxsati beriladi."
            : confirm.target?.kind === "block"
              ? "Logist tizimdan chiqariladi va qayta kira olmaydi."
              : "Ruxsatlar darhol o'chadi. Tarix saqlanadi."
        }
        confirmLabel={confirm.target?.kind === "promote" ? "Tasdiqlash" : confirm.target?.kind === "block" ? "Bloklash" : "Yopish"}
        isPending={act.isPending}
        onConfirm={() => {
          const target = confirm.target;
          confirm.close();
          if (target) act.mutate(target);
        }}
      />
      {creating ? (
        <CreateLogistDialog
          filials={filials}
          defaultFilialId={filials.length === 1 ? filials[0]!.id : null}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <LogistPermissionsDialog seat={editing.seat} role={editing.role} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

/**
 * «Mening huquqlarim» — bosh logist emasman-mi, nima yetishmaydi: rollar va
 * dopusklar (`me/permissions/`). Tugma ko'rinmasa sababi shu yerda.
 */
function MyAccessCard({
  loading,
  failed,
  roles,
  granted,
  canCreate,
  canGrant,
}: {
  loading: boolean;
  failed: boolean;
  roles: StaffRole[];
  granted: string[];
  canCreate: boolean;
  canGrant: boolean;
}) {
  if (loading) return null;
  const full = canCreate && canGrant;
  return (
    <section
      className={cn(
        "rounded-xl border px-4 py-3",
        full ? "border-line bg-surface" : "border-warn/40 bg-warn-soft",
      )}
    >
      <p className="text-ink text-dense font-semibold">
        {failed
          ? "Huquqlaringizni o'qib bo'lmadi"
          : full
            ? "Siz logist ochasiz va dopusk berasiz"
            : "Logist ochish va dopusk berish — bosh logistda"}
      </p>
      <p className="text-ink-muted mt-0.5 text-meta">
        {failed
          ? "Server huquqlar ro'yxatini bermadi — bo'lim tugmalari yashirin."
          : full
            ? "Yangi logist, viloyat bosh kuryeri, dopusklar va bosh logist roli shu sahifadan."
            : "Sizda «Logist ochish» yoki «Logist rollarini berish» dopuski yo'q. Birinchi bosh logistni backend beradi, keyingilarini bosh logist shu sahifadan."}
      </p>
      {!failed ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {roles.length === 0 ? (
            <span className="text-ink-faint text-fine">Rol yo&apos;q</span>
          ) : (
            roles.map((role) => (
              <span key={role.id} className="bg-brand-soft text-brand rounded-md px-1.5 text-fine font-semibold">
                {`${roleLabel(role.role)}${role.scopeKind === "all" ? " · hammasi" : role.scopeId ? ` · ${role.scopeId}` : ""}`}
              </span>
            ))
          )}
          {granted.slice(0, 12).map((key) => (
            <span key={key} title={key} className="bg-surface text-ink-muted rounded-md px-1.5 text-fine">
              {permissionLabel(key)}
            </span>
          ))}
          {granted.length > 12 ? <span className="text-ink-faint text-fine">{`+${granted.length - 12}`}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

