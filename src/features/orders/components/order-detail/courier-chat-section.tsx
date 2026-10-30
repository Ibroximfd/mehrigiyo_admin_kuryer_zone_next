"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  Check,
  FileText,
  LoaderCircle,
  Mic,
  Paperclip,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LinkifiedText } from "@/components/kit/linkified-text";
import { ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  COURIER_ATTACH_ACCEPT,
  COURIER_MESSAGE_MAX,
  URGENT_PING_MAX,
  checkCourierAttachment,
  courierMessageTextError,
  fetchCourierMessages,
  markCourierMessagesRead,
  mergeCourierMessages,
  sendCourierAttachment,
  sendCourierMessage,
  sendCourierVoice,
  sendUrgentPing,
} from "@/features/orders/courier-messages";
import type { CourierMessage } from "@/features/orders/courier-messages";
import { DetailSection } from "@/features/orders/components/order-detail/section";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { isEndpointMissing } from "@/lib/api-availability";
import { formatDuration, formatFileSize, formatSmartTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useCourierInboxStore } from "@/stores/courier-inbox-store";

/** Soket uzilgan bo'lsa ham lenta eskirmasin — zaxira so'rov oralig'i. */
const POLL_MS = 60_000;

/**
 * Buyurtma bo'yicha kuryer bilan chat (`KURYER_SAYTLAR_LOGIST_OPERATOR.md`
 * §2.5–§2.6): bitta lenta (matn, ovoz, rasm, hujjat, tizim yozuvlari),
 * "✓✓" belgisi va shoshilinch signal. Kuryer biriktirilmagan bo'lsa
 * bo'lim chiqmaydi.
 */
export function CourierChatSection({ order }: { order: LogistOrder }) {
  const [pingOpen, setPingOpen] = useState(false);
  const messages = useCourierMessages(order.id, order.courier !== null);
  const clearInbox = useCourierInboxStore((state) => state.clear);
  const lastId = messages.data?.at(-1)?.id;

  // Chat ko'rinib turibdi — kartadagi "kuryerdan xabar" belgisi o'chadi
  // (yangi xabar kelganda ham, chunki logist uni shu yerda ko'rib turibdi).
  useEffect(() => {
    clearInbox(order.id);
  }, [clearInbox, order.id, lastId]);

  if (!order.courier) return null;
  if (messages.isError && isEndpointMissing(messages.error)) return null;

  return (
    <DetailSection
      title="Kuryer bilan chat"
      aside={
        <Button
          variant="destructive"
          size="xs"
          onClick={() => setPingOpen(true)}
        >
          <Zap />
          Shoshilinch
        </Button>
      }
    >
      {messages.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-2/3 rounded-xl" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
        </div>
      ) : null}

      {messages.isError ? (
        <ErrorView
          message={orderErrorMessage(
            messages.error,
            "Chatni yuklashda xatolik",
          )}
          onRetry={() => void messages.refetch()}
        />
      ) : null}

      {messages.data ? <MessageList messages={messages.data} /> : null}

      <Composer orderId={order.id} />

      <UrgentPingDialog
        order={order}
        open={pingOpen}
        onOpenChange={setPingOpen}
      />
    </DetailSection>
  );
}

/** Lenta + kuryer xabarlarini avtomatik "o'qildi" qilish. */
function useCourierMessages(orderId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const lastMarked = useRef(0);

  const messages = useQuery({
    queryKey: queryKeys.orderCourierMessages(orderId),
    queryFn: ({ signal }) => fetchCourierMessages(orderId, signal),
    enabled,
    refetchInterval: POLL_MS,
    retry: (count, error) => !isEndpointMissing(error) && count < 2,
  });

  const upTo = unreadCourierUpTo(messages.data ?? []);

  useEffect(() => {
    if (upTo === null || upTo <= lastMarked.current) return;
    lastMarked.current = upTo;
    markCourierMessagesRead(orderId, upTo)
      .then(() => {
        const at = new Date();
        queryClient.setQueryData<CourierMessage[]>(
          queryKeys.orderCourierMessages(orderId),
          (current) =>
            current?.map((message) =>
              message.role === "courier" &&
              message.id <= upTo &&
              !message.readAt
                ? { ...message, readAt: at }
                : message,
            ),
        );
      })
      .catch(() => {
        // Keyingi yangilanishda qayta urinadi.
        lastMarked.current = 0;
      });
  }, [orderId, upTo, queryClient]);

  return messages;
}

/** Logist o'qimagan eng oxirgi kuryer xabari id si (yo'q bo'lsa `null`). */
function unreadCourierUpTo(messages: CourierMessage[]): number | null {
  let upTo: number | null = null;
  for (const message of messages) {
    if (message.role === "courier" && !message.readAt) upTo = message.id;
  }
  return upTo;
}

function MessageList({ messages }: { messages: CourierMessage[] }) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages.at(-1)?.id;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [last]);

  if (messages.length === 0) {
    return (
      <p className="text-ink-faint py-3 text-center text-meta">
        Hali xabar yo&apos;q. Kuryerga savol yoki ko&apos;rsatma yozing.
      </p>
    );
  }

  return (
    <div
      className="scrollbar-thin flex max-h-96 flex-col gap-2 overflow-y-auto pr-1"
      aria-live="polite"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={end} />
    </div>
  );
}

function MessageBubble({ message }: { message: CourierMessage }) {
  const time = message.createdAt ? formatSmartTime(message.createdAt) : "";

  if (message.role === "system") {
    return (
      <p className="bg-subtle text-ink-muted mx-auto max-w-[85%] rounded-full px-3 py-1 text-center text-fine">
        {message.text || message.event}
        {message.photoCount > 0 ? ` · ${message.photoCount} rasm` : ""}
        {time ? <span className="text-ink-faint"> · {time}</span> : null}
      </p>
    );
  }

  const mine = message.role === "logist";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-dense",
          mine
            ? "bg-brand text-brand-ink rounded-br-sm"
            : "bg-subtle text-ink rounded-bl-sm",
        )}
      >
        {!mine && message.authorName ? (
          <p
            className="text-ink-muted text-fine font-semibold"
            data-no-translit
          >
            {message.authorName}
          </p>
        ) : null}
        <MessageBody message={message} mine={mine} />
      </div>
      <p className="text-ink-faint mt-0.5 flex items-center gap-1 text-fine">
        {time}
        {mine ? (
          message.readAt ? (
            <CheckCheck className="text-brand size-3.5" aria-label="O'qildi" />
          ) : (
            <Check className="size-3.5" aria-label="Yuborildi" />
          )
        ) : null}
      </p>
    </div>
  );
}

function MessageBody({
  message,
  mine,
}: {
  message: CourierMessage;
  mine: boolean;
}) {
  // Havola, telefon, `#buyurtma` — bosiladigan (`HUDUD_BACKEND_TALABLAR_3` §3).
  const caption = message.text.trim() ? (
    <p className="mt-1 whitespace-pre-wrap break-words" data-no-translit>
      <LinkifiedText
        text={message.text}
        linkClassName={mine ? "text-link-on-brand" : "text-link"}
      />
    </p>
  ) : null;

  if (message.kind === "voice" && message.audioUrl) {
    return (
      <>
        <audio
          src={message.audioUrl}
          controls
          preload="metadata"
          className="w-60 max-w-full"
        />
        {message.durationMs ? (
          <p className="tabular text-fine opacity-70">
            {formatDuration(Math.round(message.durationMs / 1000))}
          </p>
        ) : null}
      </>
    );
  }

  if (message.kind === "image" && message.url) {
    return (
      <>
        <a
          href={message.url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg"
          aria-label="Rasmni ochish"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- server media, o'lchami noma'lum */}
          <img
            src={message.thumb ?? message.url}
            alt="Rasm"
            loading="lazy"
            className="max-h-60 w-60 max-w-full object-cover"
          />
        </a>
        {caption}
      </>
    );
  }

  if (message.kind === "file" && message.url) {
    return (
      <>
        <a
          href={message.url}
          target="_blank"
          rel="noreferrer"
          download={message.fileName || undefined}
          className={cn(
            "flex w-60 max-w-full items-center gap-2.5 rounded-lg p-2 transition-colors",
            mine ? "bg-brand-ink/15 hover:bg-brand-ink/25" : "bg-surface hover:bg-line",
          )}
        >
          <FileText className="size-6 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate font-medium" data-no-translit>
              {message.fileName || "Fayl"}
            </span>
            {message.fileSize ? (
              <span className="tabular block text-fine opacity-70">
                {formatFileSize(message.fileSize)}
              </span>
            ) : null}
          </span>
        </a>
        {caption}
      </>
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words" data-no-translit>
      {message.text}
    </p>
  );
}

function Composer({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  // Server rad etgan matn sababi ("Ruxsatsiz havola") — matn o'zgarguncha.
  const [textError, setTextError] = useState<string | null>(null);
  const trimmed = text.trim();
  const tooLong = trimmed.length > COURIER_MESSAGE_MAX;
  const fieldError = tooLong ? "Xabar juda uzun" : textError;

  const failed = (error: unknown, fallback: string) => {
    const message = courierMessageTextError(error);
    if (message) setTextError(message);
    else toast.error(orderErrorMessage(error, fallback));
  };

  const recorder = useVoiceRecorder();
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const append = (message: CourierMessage) =>
    queryClient.setQueryData<CourierMessage[]>(
      queryKeys.orderCourierMessages(orderId),
      (current) => mergeCourierMessages(current ?? [], [message]),
    );

  const send = useMutation({
    mutationFn: () => sendCourierMessage(orderId, trimmed),
    onSuccess: (message) => {
      setText("");
      append(message);
    },
    onError: (error) => failed(error, "Xabarni yuborishda xatolik"),
  });

  const sendVoice = useMutation({
    mutationFn: ({ file, seconds }: { file: File; seconds: number }) =>
      sendCourierVoice(orderId, file, Math.max(1, seconds) * 1000),
    onSuccess: append,
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Ovozli xabarni yuborishda xatolik")),
  });

  const sendFile = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: "image" | "file" }) =>
      sendCourierAttachment(orderId, file, kind, trimmed, setProgress),
    onSuccess: (message) => {
      // Matn maydonidagi yozuv fayl izohi bo'lib ketdi.
      setText("");
      append(message);
    },
    onError: (error) => failed(error, "Faylni yuborishda xatolik"),
    onSettled: () => setProgress(null),
  });

  const busy = send.isPending || sendVoice.isPending || sendFile.isPending;

  const submit = () => {
    if (!trimmed || tooLong || busy) return;
    send.mutate();
  };

  const pickFile = (file: File) => {
    const check = checkCourierAttachment(file);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    if (tooLong) {
      toast.error("Izoh juda uzun");
      return;
    }
    sendFile.mutate({ file, kind: check.kind });
  };

  if (recorder.isRecording) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Yozishni bekor qilish"
          onClick={recorder.cancel}
          className="text-danger"
        >
          <Trash2 />
        </Button>
        <div
          className="bg-danger-soft text-danger flex h-(--control-h) flex-1 items-center gap-2.5 rounded-xl px-3.5 text-dense font-medium"
          role="status"
        >
          <span className="bg-danger size-2 animate-pulse rounded-full" />
          Yozilmoqda
          <span className="tabular ml-auto">
            {formatDuration(recorder.seconds)}
          </span>
        </div>
        <Button
          type="button"
          size="icon"
          aria-label="Ovozli xabarni yuborish"
          onClick={async () => {
            const seconds = recorder.seconds;
            const file = await recorder.stop();
            if (file) sendVoice.mutate({ file, seconds });
          }}
        >
          <Send />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept={COURIER_ATTACH_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pickFile(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Rasm yoki fayl yuborish"
          title="Rasm yoki fayl yuborish (PDF, Word, Excel, JPEG/PNG · 5 MB gacha)"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {sendFile.isPending ? (
            <span className="tabular text-fine">
              {progress !== null ? `${Math.round(progress * 100)}%` : ""}
              <LoaderCircle className="inline size-4 animate-spin" />
            </span>
          ) : (
            <Paperclip />
          )}
        </Button>
        <Textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setTextError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Kuryerga yozing…"
          aria-label="Kuryerga xabar"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "courier-chat-text-error" : undefined}
          className="max-h-32 min-h-(--control-h) flex-1 resize-none"
        />
        {trimmed || !recorder.isSupported ? (
          <Button
            type="submit"
            size="icon"
            disabled={!trimmed || tooLong || busy}
            aria-label="Yuborish"
          >
            {send.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={busy}
            aria-label="Ovozli xabar yozish"
            title="Ovozli xabar yozish"
            onClick={() => {
              void recorder.start().catch(() => {
                toast.error("Mikrofonga ruxsat berilmadi");
              });
            }}
          >
            {sendVoice.isPending ? <LoaderCircle className="animate-spin" /> : <Mic />}
          </Button>
        )}
      </form>
      {fieldError ? (
        <p
          id="courier-chat-text-error"
          role="alert"
          className="text-danger flex items-center justify-between gap-2 px-11 text-fine"
        >
          <span>{fieldError}</span>
          {tooLong ? (
            <span className="tabular">{`${trimmed.length}/${COURIER_MESSAGE_MAX}`}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function UrgentPingDialog({
  order,
  open,
  onOpenChange,
}: {
  order: LogistOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  const ping = useMutation({
    mutationFn: () => sendUrgentPing(order.id, trimmed),
    onSuccess: () => {
      toast.success(
        `${order.courier?.fullName ?? "Kuryer"}ga signal yuborildi`,
      );
      setText("");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Signal yuborishda xatolik")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>Shoshilinch signal</DialogTitle>
        <DialogDescription>
          <span data-no-translit>{order.courier?.fullName}</span> telefonida
          baland bildirishnoma chiqadi — smenadan tashqarida ham.
        </DialogDescription>
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed && !ping.isPending) ping.mutate();
          }}
        >
          <Textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value.slice(0, URGENT_PING_MAX))
            }
            rows={3}
            autoFocus
            placeholder="Mijoz 10 daqiqada ketadi, tezroq!"
            aria-label="Signal matni"
          />
          <p className="text-ink-faint tabular mt-1 text-right text-fine">
            {trimmed.length}/{URGENT_PING_MAX}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={!trimmed || ping.isPending}>
              {ping.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Yuborish
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
