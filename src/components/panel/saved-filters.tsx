"use client";

import { Bookmark, BookmarkCheck, BookmarkPlus, Check, LoaderCircle, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { filterQuery, readSavedFilters, readUserFilters, writeSavedFilters } from "@/lib/filter-memory";
import {
  activePreset,
  addPreset,
  parsePresets,
  PRESET_ERROR_TEXT,
  PRESET_NAME_MAX,
  presetsKey,
  removePreset,
  serializePresets,
} from "@/lib/filter-presets";
import type { FilterPreset } from "@/lib/filter-presets";
import { fitsUiPrefsLimit } from "@/lib/ui-prefs";
import { queueUiPrefsPush, startUiPrefsSync } from "@/lib/ui-prefs-sync";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Sahifaning nomli filtrlari: xodim o'zi nom berib saqlaydi, bir bosishda
 * qaytaradi, keraksizini o'chiradi. Ro'yxat server bilan sinxron (`ui-prefs`).
 */
function usePresets(pathname: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const key = presetsKey(pathname);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    // Server nusxasi kelgach o'qiladi — boshqa qurilmada saqlangani ham chiqsin.
    void startUiPrefsSync(userId).finally(() => {
      if (!alive) return;
      setPresets(parsePresets(readSavedFilters(userId, key)));
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [userId, key]);

  /** Saqlandi — `true`; 16 KB chegarasidan oshsa yozilmaydi. */
  const persist = (next: FilterPreset[]): boolean => {
    if (!userId) return false;
    const value = serializePresets(next);
    if (!fitsUiPrefsLimit({ ...readUserFilters(userId), [key]: value })) return false;
    if (writeSavedFilters(userId, key, value)) queueUiPrefsPush(userId, key);
    setPresets(next);
    return true;
  };

  return { presets, ready, persist };
}

export function SavedFilters({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const query = filterQuery(useSearchParams().toString());
  const { presets, ready, persist } = usePresets(pathname);
  const [naming, setNaming] = useState(false);
  const current = activePreset(presets, query);

  const apply = (preset: FilterPreset) => router.replace(`${pathname}?${preset.query}`, { scroll: false });
  const remove = (preset: FilterPreset) => {
    if (persist(removePreset(presets, preset.id))) toast.success(`«${preset.name}» o'chirildi`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label="Saqlangan filtrlar"
            className={cn("shrink-0", current && "border-brand text-brand", className)}
          >
            {current ? <BookmarkCheck /> : <Bookmark />}
            {current ? (
              <span className="max-w-24 truncate sm:max-w-40" data-no-translit>{current.name}</span>
            ) : (
              // Telefonda faqat belgi — qidiruv maydoniga joy qolsin.
              <span className="hidden sm:inline">Saqlanganlar</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel>Saqlangan filtrlar</DropdownMenuLabel>
          {!ready ? (
            <div className="text-ink-faint flex items-center gap-2 px-2 py-1.5 text-meta">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              Yuklanmoqda
            </div>
          ) : presets.length === 0 ? (
            <p className="text-ink-faint px-2 py-1.5 text-meta">
              Hali yo&apos;q. Filtrlarni tanlang va «Joriy filtrni saqlash» bilan nom bering.
            </p>
          ) : (
            presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-1">
                <DropdownMenuItem className="min-w-0 flex-1" onSelect={() => apply(preset)}>
                  {current?.id === preset.id ? <Check className="text-brand" /> : <span className="size-4" aria-hidden />}
                  <span className="truncate" data-no-translit>{preset.name}</span>
                </DropdownMenuItem>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${preset.name}: o'chirish`}
                  onClick={() => remove(preset)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!ready || !query || current !== null} onSelect={() => setNaming(true)}>
            <BookmarkPlus />
            Joriy filtrni saqlash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {naming ? (
        <NameDialog
          onClose={() => setNaming(false)}
          onSave={(name) => {
            const result = addPreset(presets, name, query, crypto.randomUUID());
            if (!result.ok) return PRESET_ERROR_TEXT[result.error];
            if (!persist(result.presets)) return "Joy qolmadi — keraksiz filtrlarni o'chiring";
            toast.success(`«${result.preset.name}» saqlandi`);
            setNaming(false);
            return null;
          }}
        />
      ) : null}
    </>
  );
}

/** Nom berish oynasi. `onSave` xato matnini qaytaradi (yoki `null` — saqlandi). */
function NameDialog({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => string | null }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError(onSave(name));
          }}
        >
          <DialogTitle>Filtrni saqlash</DialogTitle>
          <DialogDescription>Tanlangan filtrlar shu nom bilan saqlanadi va keyin bir bosishda qaytadi.</DialogDescription>
          <Field label="Nomi" htmlFor="preset-name" error={error ?? undefined} className="mt-4">
            <input
              autoFocus
              id="preset-name"
              value={name}
              maxLength={PRESET_NAME_MAX}
              aria-invalid={error !== null}
              placeholder="Masalan, Namangan · kremlar"
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
