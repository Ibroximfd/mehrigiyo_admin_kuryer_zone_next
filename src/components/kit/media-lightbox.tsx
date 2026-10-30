"use client";

import { Download, ExternalLink, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Rasm va videoni chatning **o'zida** ochadi.
 *
 * Ilgari rasm `<a target="_blank">` bilan yangi oynada ochilardi — bu
 * suhbatdan chiqib ketish degani, manzil noto'g'ri bo'lganda esa (backend
 * nisbiy yo'l bergan payt) Next'ning 404 sahifasi chiqardi. Endi qorong'i
 * fon ustida ochiladi, `Esc` yoki fonga bosish yopadi; asl faylni yangi
 * oynada ochish va yuklab olish havolalari sarlavhada qoladi.
 *
 * `ui/dialog` dagi `DialogContent` ataylab ishlatilmadi: u oynani
 * markazdagi oq kartaga o'raydi va fonni juda yengil qoraytiradi — rasm
 * uchun butun ekran va to'q fon kerak.
 */
export function MediaLightbox({
  open,
  onOpenChange,
  src,
  kind,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  kind: "image" | "video";
  name?: string | null;
}) {
  const title = name || (kind === "video" ? "Video" : "Rasm");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/85 duration-150 supports-backdrop-filter:backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onClick={(event) => {
            // Rasm atrofidagi bo'sh joyga bosish — yopish.
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
          className="data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 flex flex-col items-center justify-center p-3 outline-none duration-150 sm:p-6"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          <div
            className="flex max-h-full max-w-full flex-col overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 bg-black/70 px-3 py-2 text-white">
              <span className="min-w-0 truncate text-meta" data-no-translit>
                {title}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  title="Yangi oynada ochish"
                  aria-label="Yangi oynada ochish"
                  className="rounded-md p-1.5 transition-colors hover:bg-white/15"
                >
                  <ExternalLink className="size-4" />
                </a>
                <a
                  href={src}
                  download={name || true}
                  title="Yuklab olish"
                  aria-label="Yuklab olish"
                  className="rounded-md p-1.5 transition-colors hover:bg-white/15"
                >
                  <Download className="size-4" />
                </a>
                <DialogPrimitive.Close
                  aria-label="Yopish"
                  title="Yopish"
                  className="rounded-md p-1.5 transition-colors hover:bg-white/15"
                >
                  <X className="size-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {kind === "video" ? (
              <video
                src={src}
                controls
                autoPlay
                playsInline
                className={cn(
                  "max-h-[calc(100vh-7rem)] max-w-full bg-black",
                  "min-h-40 min-w-64",
                )}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={title}
                className="max-h-[calc(100vh-7rem)] max-w-full object-contain"
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
