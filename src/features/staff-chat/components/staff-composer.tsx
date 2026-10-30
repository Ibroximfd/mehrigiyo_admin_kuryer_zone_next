"use client";

import {
  LoaderCircle,
  Mic,
  Paperclip,
  Pencil,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fileTooLargeReason } from "@/features/staff-chat/error-hints";
import { staffKindForFile, staffRoleLabel } from "@/features/staff-chat/types";
import type { StaffMessage } from "@/features/staff-chat/types";

/** Eslatma ro'yxatidagi bitta odam. */
export type MentionCandidate = {
  username: string;
  fullName: string;
  role: string;
};
import { useIsMobile } from "@/hooks/use-media-query";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Xodimlar chatining yozish maydoni.
 *
 * Mijoz chatidagidan uchta narsa bilan farq qiladi:
 *   • `@login` eslatmasi — yozilganda o'sha xodimga bildirishnoma ketadi
 *     (`STAFF_CHAT_FLUTTER.md` §1.5), shuning uchun bu yerda tanlash
 *     ro'yxati bor: login noto'g'ri yozilsa eslatma umuman bormaydi;
 *   • tahrir rejimi — 15 daqiqa ichida o'z xabarini tuzatish;
 *   • fayl hajmi mijoz tomonda tekshiriladi — 50 MB videoni yuborib,
 *     keyin rad javobini kutish behuda.
 */
export function StaffComposer({
  replyTo,
  editing,
  isSending,
  onCancelReply,
  onCancelEdit,
  onSubmit,
  onFile,
  onEditSave,
  onTyping,
  mentionCandidates,
}: {
  replyTo: StaffMessage | null;
  /** Tahrirlanayotgan xabar; `null` — oddiy yozish rejimi. */
  editing: StaffMessage | null;
  /**
   * Tahrir saqlanmoqda — tugma shunda qulflanadi.
   *
   * Oddiy yuborish uchun bu bayroq **ko'tarilmaydi**: xabar tugma bosilgan
   * zahoti lentaga tushadi va o'z holatini (soat / halqa / xato) pufakda
   * ko'rsatadi, operator esa ketma-ket yozaveradi — Telegram'dagi kabi.
   */
  isSending: boolean;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSubmit: (text: string) => void;
  onFile: (file: File, duration: number | null) => void;
  onEditSave: (text: string) => void;
  /** Yozayotganini bildirish — soket buyrug'i (§1.4). */
  onTyping: (isTyping: boolean) => void;
  /**
   * `@login` uchun nomzodlar.
   *
   * Logist saytida xodimlar ro'yxati endpointi yo'q, shuning uchun nomzodlar
   * shu kanalda yozgan odamlardan yig'iladi (xona beradi) — muhokamada kimga
   * javob berilsa, o'sha allaqachon ro'yxatda bo'ladi.
   */
  mentionCandidates: MentionCandidate[];
}) {
  const [draft, setDraft] = useState("");
  /** `@` dan keyin yozilayotgan login; `null` — ro'yxat yopiq. */
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recorder = useVoiceRecorder();
  const isMobile = useIsMobile();

  /*
   * Tahrir rejimi almashganda maydon qaytadan to'ldiriladi — render
   * vaqtida, effektsiz. Effekt ichida `setState` chaqirish ketma-ket
   * renderlarni keltirib chiqaradi; React'ning "propga qarab holatni
   * to'g'rilash" naqshi esa aynan shu.
   */
  const [editingId, setEditingId] = useState<number | null>(null);
  if ((editing?.id ?? null) !== editingId) {
    setEditingId(editing?.id ?? null);
    setDraft(editing ? editing.text : "");
    setMentionQuery(null);
  }

  /*
   * Fokus — DOM amali, u effektda qoladi.
   *
   * Chat ochilishi bilan maydon tayyor turadi: kursorni qidirib topish
   * shart emas. Telefonda esa fokus berilmaydi — klaviatura darhol
   * ochilib, yozishmaning yarmini yopib qo'yardi.
   */
  useEffect(() => {
    if (isMobile) return;
    textareaRef.current?.focus();
  }, [isMobile]);

  useEffect(() => {
    if (editing || replyTo) textareaRef.current?.focus();
  }, [editing, replyTo]);

  const suggestions = (() => {
    if (mentionQuery === null) return [];
    const needle = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter((person) => person.username)
      .filter(
        (person) =>
          needle === "" ||
          person.username.toLowerCase().includes(needle) ||
          person.fullName.toLowerCase().includes(needle),
      )
      .slice(0, 6);
  })();

  /** Yozayotganini soketga bildiradi — ketma-ket bosishda takrorlanmaydi. */
  const pingTyping = () => {
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 2500);
  };

  const stopTyping = () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (typingRef.current) {
      typingRef.current = false;
      onTyping(false);
    }
  };

  useEffect(() => stopTyping, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Kursor oldidagi `@login` bo'lagini topadi. */
  const syncMention = (value: string, caret: number) => {
    const match = /(?:^|\s)@([A-Za-z0-9_.]*)$/.exec(value.slice(0, caret));
    setMentionQuery(match ? match[1] : null);
    setMentionIndex(0);
  };

  const applyMention = (username: string) => {
    const node = textareaRef.current;
    const caret = node?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret).replace(/@[A-Za-z0-9_.]*$/, "");
    const next = `${before}@${username} ${draft.slice(caret)}`;

    setDraft(next);
    setMentionQuery(null);

    // Kursor eslatmadan keyin turishi kerak — yozish davom etadi.
    requestAnimationFrame(() => {
      const position = before.length + username.length + 2;
      node?.focus();
      node?.setSelectionRange(position, position);
    });
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || isSending) return;

    stopTyping();
    setDraft("");
    setMentionQuery(null);

    if (editing) onEditSave(text);
    else onSubmit(text);
  };

  const pickFile = (file: File) => {
    const reason = fileTooLargeReason(file, staffKindForFile(file));
    if (reason) {
      toast.error(reason);
      return;
    }
    onFile(file, null);
  };

  return (
    <div className="border-line bg-surface/80 shrink-0 border-t backdrop-blur-md">
      {/* ── Tahrir / javob ko'rsatkichi ─────────────────────────────────── */}
      {editing ? (
        <ContextBar
          Icon={Pencil}
          title="Xabarni tahrirlash"
          body={editing.text}
          onCancel={onCancelEdit}
        />
      ) : replyTo ? (
        <ContextBar
          title={`Javob: ${replyTo.isMine ? "siz" : (replyTo.sender?.fullName ?? "xodim")}`}
          body={replyTo.text || "Media xabar"}
          onCancel={onCancelReply}
        />
      ) : null}

      {/* ── Eslatma ro'yxati ────────────────────────────────────────────── */}
      {mentionQuery !== null && suggestions.length > 0 ? (
        <div className="border-line bg-surface animate-in fade-in slide-in-from-bottom-1 max-h-56 overflow-y-auto border-t duration-150">
          <p className="text-ink-faint px-3 pt-2 pb-1 text-fine">
            Eslatish — xodimga bildirishnoma boradi
          </p>
          <ul>
            {suggestions.map((person, index) => (
              <li key={person.username}>
                <button
                  type="button"
                  onMouseEnter={() => setMentionIndex(index)}
                  onClick={() => applyMention(person.username)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                    index === mentionIndex ? "bg-subtle" : "hover:bg-subtle",
                  )}
                >
                  <span
                    className="text-ink min-w-0 flex-1 truncate text-dense font-medium"
                    data-no-translit
                  >
                    {person.fullName || person.username}
                  </span>
                  <span className="text-ink-muted shrink-0 text-meta" data-no-translit>
                    @{person.username}
                  </span>
                  {staffRoleLabel(person.role) ? (
                    <span className="bg-subtle text-ink-muted shrink-0 rounded px-1 text-micro font-medium">
                      {staffRoleLabel(person.role)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Maydon ──────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2 px-3 py-2.5 sm:px-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pickFile(file);
            event.target.value = "";
          }}
        />

        {recorder.isRecording ? (
          <>
            <button
              type="button"
              aria-label="Yozishni bekor qilish"
              onClick={recorder.cancel}
              className="text-danger hover:bg-danger-soft shrink-0 rounded-lg p-2.5 transition-colors"
            >
              <Trash2 className="size-5" />
            </button>

            <div className="bg-danger-soft text-danger flex h-10 flex-1 items-center gap-2.5 rounded-xl px-3.5 text-body font-medium">
              <span className="bg-danger size-2 animate-pulse rounded-full" />
              Yozilmoqda
              <span className="tabular ml-auto">
                {formatDuration(recorder.seconds)}
              </span>
            </div>

            <Button
              size="icon-lg"
              aria-label="Ovozli xabarni yuborish"
              className="shrink-0"
              onClick={async () => {
                const seconds = recorder.seconds;
                const file = await recorder.stop();
                if (file) onFile(file, seconds);
              }}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </>
        ) : (
          <>
            {/* Tahrir rejimida fayl biriktirish yo'q: PATCH faqat matnni
                o'zgartiradi (hujjat §1.3). */}
            {!editing ? (
              <button
                type="button"
                aria-label="Fayl biriktirish"
                title="Fayl biriktirish"
                disabled={isSending}
                onClick={() => fileInputRef.current?.click()}
                className="text-ink-muted hover:bg-subtle hover:text-ink shrink-0 rounded-lg p-2.5 transition-colors disabled:opacity-50"
              >
                <Paperclip className="size-5" />
              </button>
            ) : null}

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                syncMention(event.target.value, event.target.selectionStart);
                if (!editing) pingTyping();
              }}
              onClick={(event) =>
                syncMention(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                )
              }
              onKeyDown={(event) => {
                // Eslatma ro'yxati ochiq — strelkalar unga tegishli.
                if (mentionQuery !== null && suggestions.length > 0) {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setMentionIndex((index) => {
                      const next =
                        index + (event.key === "ArrowDown" ? 1 : -1);
                      return (next + suggestions.length) % suggestions.length;
                    });
                    return;
                  }
                  if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    applyMention(suggestions[mentionIndex].username);
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setMentionQuery(null);
                    return;
                  }
                }

                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                  return;
                }

                if (event.key === "Escape") {
                  if (editing) {
                    event.preventDefault();
                    onCancelEdit();
                  } else if (replyTo) {
                    event.preventDefault();
                    onCancelReply();
                  }
                }
              }}
              rows={1}
              placeholder={
                editing ? "Xabarni tuzating..." : "Xabar yozing... (@ — eslatish)"
              }
              // Bitta fokus belgisi: chegara rangi + yumshoq halqa. Global
              // `:focus-visible` halqasi (offset bilan) bu yerda o'chiriladi —
              // aks holda chegara ustidan ikkinchi chiziq chiqardi.
              className="bg-subtle border-line text-ink placeholder:text-ink-faint focus:border-brand focus:bg-surface max-h-32 min-h-10 flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-body transition-[border-color,background-color,box-shadow] [field-sizing:content] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_14%,transparent)] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            {draft.trim() || editing || !recorder.isSupported ? (
              <Button
                size="icon-lg"
                aria-label={editing ? "Saqlash" : "Yuborish"}
                disabled={!draft.trim() || isSending}
                onClick={submit}
                className="shrink-0"
              >
                {isSending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : editing ? (
                  <Pencil className="size-4" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
            ) : (
              <Button
                size="icon-lg"
                variant="outline"
                aria-label="Ovozli xabar yozish"
                title="Ovozli xabar yozish"
                className="shrink-0"
                onClick={() => {
                  void recorder.start().catch(() => {
                    toast.error("Mikrofonga ruxsat berilmadi");
                  });
                }}
              >
                <Mic className="size-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ContextBar({
  Icon,
  title,
  body,
  onCancel,
}: {
  Icon?: typeof Pencil;
  title: string;
  body: string;
  onCancel: () => void;
}) {
  return (
    <div className="border-line bg-subtle/60 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 border-t px-3 py-2 duration-200 sm:px-4">
      {Icon ? <Icon className="text-brand size-4 shrink-0" /> : null}
      <div className="border-brand min-w-0 flex-1 border-l-2 pl-2">
        <p className="text-ink-muted text-fine font-medium">{title}</p>
        <p className="text-ink truncate text-meta" data-no-translit={body ? "" : undefined}>
          {body || "Media xabar"}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Bekor qilish"
        className="text-ink-faint hover:text-ink rounded-md p-1.5"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
