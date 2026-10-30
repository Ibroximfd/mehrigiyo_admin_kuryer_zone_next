"use client";

import {
  Ban,
  Check,
  CheckCheck,
  Clock,
  CornerUpLeft,
  Download,
  FileText,
  Maximize2,
  MoreHorizontal,
  Pencil,
  RotateCw,
  Trash2,
} from "lucide-react";
import { memo, useState } from "react";

import { MediaLightbox } from "@/components/kit/media-lightbox";
import { UploadRing } from "@/components/kit/upload-ring";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PeerAvatar } from "@/features/staff-chat/components/peer-avatar";
import {
  canDeleteStaffMessage,
  canEditStaffMessage,
  isLocalStaffMessage,
  senderAvatarId,
  staffRoleLabel,
} from "@/features/staff-chat/types";
import { LinkPreviewCard } from "@/components/kit/link-preview";
import { LinkifiedText } from "@/components/kit/linkified-text";
import type { StaffMessage } from "@/features/staff-chat/types";
import {
  formatDuration,
  formatFileSize,
  formatTime,
  parseDate,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Xodimlar chatidagi bitta xabar.
 *
 * Mijoz chatidan farqi ko'p kishilikda: kim yozgani har safar ko'rinishi
 * kerak, lekin ketma-ket kelgan xabarlarda ism takrorlanmaydi
 * (`showSender`) — aks holda suhbat ism ustuniga aylanib qolardi.
 *
 * Tizim xabari (`system`) — umuman pufak emas: markazdagi kulrang yozuv.
 * Unga javob berib ham, tahrirlab ham bo'lmaydi.
 *
 * Yuborilayotgan xabar (`pending`) — Telegram'dagi kabi: vaqt o'rnida
 * soat, fayl ustida to'lib boruvchi halqa. Yiqilgani (`failed`) qizil
 * halqa oladi va ostida "qayta yuborish / o'chirish" turadi. Ikkalasiga
 * ham javob berib, tahrirlab bo'lmaydi — ular hali serverda yo'q.
 */
export const StaffMessageBubble = memo(function StaffMessageBubble({
  message,
  showSender,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  onJumpToReply,
  onRetry,
  onDiscard,
  onCancelUpload,
  highlighted = false,
}: {
  message: StaffMessage;
  /** Ketma-ketlikdagi birinchi xabarmi — ism va avatar shunda chiziladi. */
  showSender: boolean;
  /** Filial admini istalgan xabarni o'chira oladi. */
  isAdmin: boolean;
  onReply?: (message: StaffMessage) => void;
  onEdit?: (message: StaffMessage) => void;
  onDelete?: (message: StaffMessage) => void;
  onJumpToReply?: (id: number) => void;
  /** Yiqilgan xabarni qayta yuborish. */
  onRetry?: (message: StaffMessage) => void;
  /** Yiqilgan xabarni lentadan olib tashlash. */
  onDiscard?: (message: StaffMessage) => void;
  /** Yuklanayotgan faylni bekor qilish. */
  onCancelUpload?: (message: StaffMessage) => void;
  /** Bildirishnomadan o'tilgan xabar — bir zumga ajratib ko'rsatiladi. */
  highlighted?: boolean;
}) {
  if (message.kind === "system") {
    return (
      <div
        data-message-id={message.id}
        className="flex justify-center py-0.5"
      >
        <span className="bg-subtle text-ink-muted rounded-full px-3 py-1 text-fine">
          {message.text || "Tizim xabari"}
        </span>
      </div>
    );
  }

  const mine = message.isMine;
  const local = isLocalStaffMessage(message);
  const created = parseDate(message.createdAt);
  const canEdit = onEdit !== undefined && canEditStaffMessage(message);
  const canDelete =
    onDelete !== undefined && canDeleteStaffMessage(message, isAdmin);
  const canReply = onReply !== undefined && !message.isDeleted && !local;
  const hasMenu = canEdit || canDelete;

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group flex w-full items-end gap-2",
        mine ? "justify-end" : "justify-start",
      )}
    >
      {/* Chapdagi avatar — faqat begona xabarda va faqat ketma-ketlik
          boshida. Qolganlarida joyi bo'sh qoladi, ya'ni pufaklar bitta
          vertikal chiziqda turadi. */}
      {!mine ? (
        showSender ? (
          <span title={message.sender?.fullName} className="mb-0.5 shrink-0">
            <PeerAvatar
              id={senderAvatarId(message.sender)}
              fullName={message.sender?.fullName || message.sender?.username || "?"}
              avatarUrl={message.sender?.avatarUrl ?? null}
              size="sm"
              className="size-7"
            />
          </span>
        ) : (
          <span aria-hidden className="size-7 shrink-0" />
        )
      ) : null}

      {mine && canReply ? (
        <IconAction
          label="Javob berish"
          Icon={CornerUpLeft}
          onClick={() => onReply!(message)}
        />
      ) : null}

      {/* Yuborilmagan xabar — Telegram'dagi qizil "!" pufak yonida. */}
      {mine && message.failed ? (
        <span
          aria-hidden
          className="bg-danger text-micro mb-2 flex size-5 shrink-0 items-center justify-center rounded-full font-bold text-white"
        >
          !
        </span>
      ) : null}

      {/* Pufak va uning ostidagi qator (yiqilgan xabar amallari) bitta
          ustunda — kenglik chegarasi ustunda turadi, pufak uni to'ldiradi. */}
      <div
        className={cn(
          "flex min-w-0 max-w-[min(80%,560px)] flex-col gap-1",
          mine ? "items-end" : "items-start",
        )}
      >
      <div
        className={cn(
          "max-w-full rounded-2xl px-3 py-2 text-body",
          mine
            ? "text-brand-ink rounded-br-md [background:linear-gradient(160deg,color-mix(in_oklab,var(--accent)_30%,var(--brand)),var(--brand))] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18)]"
            : "bg-surface text-ink rounded-bl-md shadow-[0_0_0_1px_var(--line)]",
          // Soya va xatolik halqasi ikkalasi box-shadow — birga bo'lmaydi.
          message.failed ? "ring-danger ring-2" : "elev-1",
          message.pending && "opacity-90",
          highlighted && "ring-brand ring-2",
        )}
      >
        {/* Kim yozgani — begona xabarda, ketma-ketlik boshida. */}
        {!mine && showSender ? (
          <p className="mb-1 flex items-center gap-1.5">
            <span
              className="text-brand text-fine font-semibold"
              data-no-translit={
                message.sender?.fullName || message.sender?.username ? "" : undefined
              }
            >
              {message.sender?.fullName || message.sender?.username || "Xodim"}
            </span>
            {message.sender?.role ? (
              <span className="bg-subtle text-ink-muted rounded px-1 py-px text-micro font-medium tracking-normal">
                {staffRoleLabel(message.sender.role) || message.sender.role}
              </span>
            ) : null}
          </p>
        ) : null}

        {message.replyTo ? (
          <button
            type="button"
            disabled={!onJumpToReply}
            onClick={
              onJumpToReply
                ? () => onJumpToReply(message.replyTo!.id)
                : undefined
            }
            title={onJumpToReply ? "Asl xabarga o'tish" : undefined}
            className={cn(
              "mb-1.5 block w-full rounded-lg border-l-2 px-2 py-1 text-left text-meta",
              "transition-colors duration-(--dur-micro)",
              mine
                ? "border-white/50 bg-white/10 text-white/80"
                : "border-brand bg-subtle text-ink-muted",
              onJumpToReply &&
                (mine
                  ? "cursor-pointer hover:bg-white/20"
                  : "hover:bg-line/60 cursor-pointer"),
            )}
          >
            {message.replyTo.senderName ? (
              <span className="block text-fine font-semibold" data-no-translit>
                {message.replyTo.senderName}
              </span>
            ) : null}
            <span
              className="line-clamp-2"
              data-no-translit={message.replyTo.text ? "" : undefined}
            >
              {message.replyTo.text || kindLabel(message.replyTo.kind)}
            </span>
          </button>
        ) : null}

        {message.isDeleted ? (
          <p
            className={cn(
              "flex items-center gap-1.5 text-meta italic",
              mine ? "text-white/70" : "text-ink-faint",
            )}
          >
            <Ban className="size-3.5 shrink-0" />
            Xabar o&apos;chirildi
          </p>
        ) : (
          <>
            {message.file ? (
              <StaffAttachment
                file={message.file}
                kind={message.kind}
                mine={mine}
                pending={Boolean(message.pending)}
                progress={message.outbox?.progress ?? null}
                onCancel={
                  onCancelUpload && message.pending && message.outbox?.abort
                    ? () => onCancelUpload(message)
                    : undefined
                }
              />
            ) : null}

            <div className="flex flex-wrap items-end justify-end gap-x-2">
              {message.text ? (
                <p
                  className="leading-relaxed whitespace-pre-wrap"
                  data-no-translit
                >
                  <MessageText text={message.text} mine={mine} />
                </p>
              ) : null}

              {/* Havola kartochkasi — o'z qatorida, vaqt undan keyin o'ngda. */}
              {message.text && !local ? (
                <LinkPreviewCard text={message.text} mine={mine} />
              ) : null}

              <span
                className={cn(
                  "ml-auto flex shrink-0 items-center gap-1 text-fine leading-5",
                  mine ? "text-white/70" : "text-ink-faint",
                )}
              >
                {message.editedAt ? <span>tahrirlandi</span> : null}
                {created ? (
                  <span className="tabular">{formatTime(created)}</span>
                ) : null}
                {/* O'qildi belgisi — faqat o'z xabaringizda (§1.5).
                    Yuborilayotganida soat, yiqilganida hech narsa — sabab
                    pufak ostida yoziladi. */}
                {mine && message.kind !== "system" ? (
                  message.pending ? (
                    <Clock
                      className="size-3.5"
                      aria-label="Yuborilmoqda"
                      role="img"
                    />
                  ) : message.failed ? null : (
                    <ReadReceipt message={message} />
                  )
                ) : null}
              </span>
            </div>
          </>
        )}
      </div>

      {message.failed ? (
        <FailedActions
          message={message}
          onRetry={onRetry}
          onDiscard={onDiscard}
        />
      ) : null}
      </div>

      {!mine && canReply ? (
        <IconAction
          label="Javob berish"
          Icon={CornerUpLeft}
          onClick={() => onReply!(message)}
        />
      ) : null}

      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Xabar amallari"
              className="text-ink-faint hover:text-ink hover:bg-subtle self-center rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align={mine ? "end" : "start"}>
            {canEdit ? (
              <DropdownMenuItem onClick={() => onEdit?.(message)}>
                <Pencil className="size-4" />
                Tahrirlash
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(message)}
              >
                <Trash2 className="size-4" />
                O&apos;chirish
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

function IconAction({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: typeof CornerUpLeft;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-ink-faint hover:text-ink hover:bg-subtle self-center rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/**
 * Yiqilgan xabar ostidagi qator: sabab + "qayta yuborish" + "o'chirish".
 *
 * Fayl qaytadan tanlanmaydi — u xabarning o'zida (`outbox`) turadi va
 * o'sha holicha qayta ketadi.
 */
function FailedActions({
  message,
  onRetry,
  onDiscard,
}: {
  message: StaffMessage;
  onRetry?: (message: StaffMessage) => void;
  onDiscard?: (message: StaffMessage) => void;
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-fine">
      <span className="text-danger min-w-0 truncate" title={message.outbox?.error ?? undefined}>
        {message.outbox?.error || "Yuborilmadi"}
      </span>
      {onRetry ? (
        <button
          type="button"
          onClick={() => onRetry(message)}
          className="text-brand inline-flex items-center gap-1 font-semibold hover:underline"
        >
          <RotateCw className="size-3" />
          Qayta yuborish
        </button>
      ) : null}
      {onDiscard ? (
        <button
          type="button"
          onClick={() => onDiscard(message)}
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 hover:underline"
        >
          <Trash2 className="size-3" />
          O&apos;chirish
        </button>
      ) : null}
    </div>
  );
}

/**
 * `@login` eslatmalari matnda ajratib ko'rsatiladi.
 *
 * Kimga tegishli ekanini serverdan kelgan ro'yxatga solishtirmaymiz: xabar
 * matnidagi har qanday `@login` shakli belgilangan bo'lgani o'quvchi uchun
 * tabiiy va ro'yxat bo'sh kelgan holatda ham ishlaydi.
 */
/**
 * O'qildi belgisi: ✓ yuborildi, ✓✓ o'qildi.
 *
 * Yonidagi son — nechta xodim o'qigani; bosilsa ismlar ro'yxati ochiladi.
 * Buyurtma muhokamasida odam kam va ro'yxat to'liq bo'ladi, umumiy guruhda
 * esa server faqat 10 ta ism beradi — qolgani "va yana N kishi" bo'lib
 * qo'shiladi.
 */
function ReadReceipt({ message }: { message: StaffMessage }) {
  const read = message.isRead || message.readCount > 0;

  const icon = read ? (
    <CheckCheck className="size-3.5 text-white" />
  ) : (
    <Check className="size-3.5" />
  );
  const count =
    read && message.readCount > 1 ? (
      <span className="tabular text-micro font-semibold text-white">
        {message.readCount}
      </span>
    ) : null;

  const label = !read
    ? "Yuborildi"
    : message.readCount > 0
      ? `${message.readCount} kishi o'qidi`
      : "O'qildi";

  // Ism yo'q — bosadigan narsa ham yo'q.
  if (message.readers.length === 0) {
    return (
      <span
        title={label}
        aria-label={label}
        className="flex shrink-0 items-center gap-0.5"
      >
        {icon}
        {count}
      </span>
    );
  }

  const hidden = message.readCount - message.readers.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          className="-mx-0.5 flex shrink-0 items-center gap-0.5 rounded px-0.5 transition-colors hover:bg-white/20"
        >
          {icon}
          {count}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>O&apos;qiganlar</DropdownMenuLabel>
        {message.readers.map((reader, index) => (
          <p
            key={reader.userId ?? `${reader.fullName}-${index}`}
            className="text-ink px-2 py-1 text-meta"
            data-no-translit={reader.fullName ? "" : undefined}
          >
            {reader.fullName || "Noma'lum xodim"}
          </p>
        ))}
        {hidden > 0 ? (
          <p className="text-ink-faint px-2 py-1 text-fine">
            va yana {hidden} kishi
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Matn: `@login` eslatmalari ajratiladi, havolalar bosiladigan bo'ladi. */
function MessageText({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/(@[A-Za-z0-9_.]+)/g);

  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("@") && part.length > 1 ? (
          <span
            key={index}
            className={cn(
              "rounded px-1 font-semibold",
              mine ? "bg-white/20" : "bg-brand-soft text-brand",
            )}
          >
            {part}
          </span>
        ) : (
          <LinkifiedText
            key={index}
            text={part}
            linkClassName={mine ? "text-link-on-brand" : "text-link"}
          />
        ),
      )}
    </>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "image":
      return "Rasm";
    case "video":
      return "Video";
    case "audio":
      return "Ovozli xabar";
    case "file":
      return "Fayl";
    case "system":
      return "Tizim xabari";
    default:
      return "Xabar";
  }
}

/**
 * Xabardagi fayl.
 *
 * Rasm va video chatning o'zida ochiladi (`MediaLightbox`) — yangi oynaga
 * chiqib ketmaydi. Yuborilayotganida esa mahalliy nusxa (`blob:`) ustida
 * yuklash halqasi turadi va bosib bo'lmaydi: manzil hali serverda yo'q.
 */
function StaffAttachment({
  file,
  kind,
  mine,
  pending,
  progress,
  onCancel,
}: {
  file: NonNullable<StaffMessage["file"]>;
  kind: string;
  mine: boolean;
  pending: boolean;
  /** Yuklangan ulush 0..1; `null` — noaniq (server javobi kutilmoqda). */
  progress: number | null;
  onCancel?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const overlay = pending ? (
    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
      <UploadRing progress={progress} onCancel={onCancel} />
    </span>
  ) : null;

  if (kind === "image") {
    const picture = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.url}
        alt={file.name ?? "Rasm"}
        loading="lazy"
        decoding="async"
        className={cn("max-h-72 w-full object-cover", pending && "opacity-80")}
      />
    );

    return (
      <>
        {/* Yuklanayotganda o'ram tugma emas: halqadagi "bekor qilish"
            tugmasi tugma ichida tugma bo'lib qolmasin (HTML buni taqiqlaydi). */}
        {pending ? (
          <div
            role="img"
            aria-label="Rasm yuklanmoqda"
            className="relative mb-1.5 overflow-hidden rounded-lg"
          >
            {picture}
            {overlay}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Rasmni ochish"
            title="Rasmni ochish"
            className="relative mb-1.5 block w-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            {picture}
          </button>
        )}
        {open ? (
          <MediaLightbox
            open={open}
            onOpenChange={setOpen}
            src={file.url}
            kind="image"
            name={file.name}
          />
        ) : null}
      </>
    );
  }

  if (kind === "video") {
    if (pending) {
      return (
        <div className="relative mb-1.5 overflow-hidden rounded-lg bg-black/40">
          <video
            src={file.url}
            muted
            playsInline
            preload="metadata"
            className="max-h-72 w-full opacity-80"
          />
          {overlay}
        </div>
      );
    }

    return (
      <div className="relative mb-1.5">
        <video
          src={file.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full rounded-lg bg-black"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Videoni katta ochish"
          title="Videoni katta ochish"
          className="absolute top-1.5 right-1.5 rounded-md bg-black/55 p-1.5 text-white transition-colors hover:bg-black/75"
        >
          <Maximize2 className="size-3.5" />
        </button>
        {open ? (
          <MediaLightbox
            open={open}
            onOpenChange={setOpen}
            src={file.url}
            kind="video"
            name={file.name}
          />
        ) : null}
      </div>
    );
  }

  if (kind === "audio") {
    if (pending) {
      return (
        <div
          className={cn(
            "mb-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-meta",
            mine ? "bg-white/15" : "bg-subtle",
          )}
        >
          <UploadRing progress={progress} onCancel={onCancel} size={32} />
          <span className="min-w-0 flex-1 truncate">Ovozli xabar</span>
          {file.duration ? (
            <span className="tabular shrink-0 opacity-70">
              {formatDuration(file.duration)}
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className="mb-1.5">
        <audio
          src={file.url}
          controls
          preload="metadata"
          className="w-64 max-w-full"
        />
        {file.duration ? (
          <p
            className={cn(
              "tabular mt-0.5 text-fine",
              mine ? "text-white/70" : "text-ink-faint",
            )}
          >
            {formatDuration(file.duration)}
          </p>
        ) : null}
      </div>
    );
  }

  const rowClass = cn(
    "mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-meta transition-colors",
    mine ? "bg-white/15 hover:bg-white/20" : "bg-subtle hover:bg-line",
  );

  if (pending) {
    return (
      <div className={rowClass}>
        <FileText className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{file.name ?? "Fayl"}</span>
        {file.size ? (
          <span className="tabular shrink-0 opacity-70">
            {formatFileSize(file.size)}
          </span>
        ) : null}
        <UploadRing progress={progress} onCancel={onCancel} size={22} />
      </div>
    );
  }

  return (
    <a href={file.url} target="_blank" rel="noreferrer" className={rowClass}>
      <FileText className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{file.name ?? "Fayl"}</span>
      {file.size ? (
        <span className="tabular shrink-0 opacity-70">
          {formatFileSize(file.size)}
        </span>
      ) : null}
      <Download className="size-3.5 shrink-0 opacity-70" />
    </a>
  );
}
