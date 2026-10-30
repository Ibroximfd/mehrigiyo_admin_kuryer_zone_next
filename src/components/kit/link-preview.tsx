"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Play } from "lucide-react";
import { useMemo, useState } from "react";

import { urlsIn } from "@/lib/linkify";
import { asString, isRecord } from "@/lib/parse";
import { cn } from "@/lib/utils";

/**
 * Havola kartochkasi — Telegram'dagi kabi.
 *
 * Xabarda YouTube, Instagram, TikTok yoki Telegram havolasi bo'lsa matn
 * ostida sayt nomi, sarlavha va rasmli kartochka chiziladi; YouTube esa
 * shu yerning o'zida ijro etiladi. Kim yuborganidan qat'i nazar — mijoz,
 * operator, otziv kutubxonasi — ko'rinish bitta.
 *
 * Nega faqat shu to'rttasi: brauzerdan begona saytning sarlavhasini olib
 * bo'lmaydi (CORS). Tanish provayderlar uchun havolaning o'zidan yetarli
 * narsa chiqadi (YouTube rasmi `i.ytimg.com` dan, Telegram kanali `@nom`),
 * sarlavha esa oEmbed (`noembed.com`) orqali keyin to'ldiriladi — kelmasa
 * ham kartochka rasmi va nomi bilan turaveradi. Boshqa saytlar uchun
 * server tomonida `link-preview` endpointi kerak bo'ladi.
 */

export type LinkProvider = "youtube" | "instagram" | "tiktok" | "telegram";

export type LinkCard = {
  href: string;
  provider: LinkProvider;
  siteName: string;
  /** Havolaning o'zidan ma'lum sarlavha (`@kanal`, `Reel`) — tarmoqsiz. */
  title: string | null;
  /** Rasm — YouTube uchun darhol, boshqalarga oEmbed'dan. */
  image: string | null;
  /** Joyida ijro etish manzili (faqat YouTube). */
  embedUrl: string | null;
  /** oEmbed orqali sarlavha va rasm so'raladimi. */
  fetchable: boolean;
};

const YOUTUBE_HOSTS = new Set(["youtube.com", "youtu.be", "youtube-nocookie.com"]);
const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "telegram.dog"]);

function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www|m|music|vm|vt)\./, "");
}

/** YouTube video identifikatori — `watch?v=`, `youtu.be/`, `shorts/`, `live/`. */
export function youtubeVideoId(href: string): string | null {
  try {
    const url = new URL(href);
    const host = hostOf(url);
    if (!YOUTUBE_HOSTS.has(host)) return null;

    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.slice(1).split("/")[0] ?? null;
    } else if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      id = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** `t=1757s` / `t=90` — videoni shu soniyadan boshlash. */
function youtubeStart(href: string): number | null {
  try {
    const raw = new URL(href).searchParams.get("t");
    if (!raw) return null;
    const plain = raw.match(/^(\d+)s?$/);
    if (plain) return Number(plain[1]);
    const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!parts) return null;
    return (
      Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0)
    );
  } catch {
    return null;
  }
}

/** O'rnatiladigan pleyer manzili — otziv oynasi ham shundan foydalanadi. */
export function youtubeEmbedUrl(href: string): string | null {
  const id = youtubeVideoId(href);
  if (!id) return null;
  const start = youtubeStart(href);
  return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
}

/** Havolani tanib, kartochka uchun sinxron ma'lumot beradi. */
export function describeLink(href: string): LinkCard | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = hostOf(url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeVideoId(href);
    if (!id) return null;
    return {
      href,
      provider: "youtube",
      siteName: "YouTube",
      title: null,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embedUrl: youtubeEmbedUrl(href),
      fetchable: true,
    };
  }

  if (host === "instagram.com") {
    const [first, second] = segments;
    const title =
      first === "p"
        ? "Post"
        : first === "reel" || first === "reels"
          ? "Reel"
          : first === "stories" && second
            ? `@${second} · Story`
            : first
              ? `@${first}`
              : null;
    return {
      href,
      provider: "instagram",
      siteName: "Instagram",
      title,
      image: null,
      embedUrl: null,
      fetchable: false,
    };
  }

  if (host === "tiktok.com") {
    const user = segments.find((part) => part.startsWith("@")) ?? null;
    return {
      href,
      provider: "tiktok",
      siteName: "TikTok",
      title: user,
      image: null,
      embedUrl: null,
      fetchable: true,
    };
  }

  if (TELEGRAM_HOSTS.has(host)) {
    const [first] = segments;
    const title =
      !first
        ? null
        : first.startsWith("+") || first === "joinchat"
          ? "Taklif havolasi"
          : `@${first.replace(/^@/, "")}`;
    return {
      href,
      provider: "telegram",
      siteName: "Telegram",
      title,
      image: null,
      embedUrl: null,
      fetchable: false,
    };
  }

  return null;
}

/** Matndagi birinchi tanish havola — kartochka bittagina chiziladi. */
export function firstLinkCard(text: string): LinkCard | null {
  for (const href of urlsIn(text)) {
    const card = describeLink(href);
    if (card) return card;
  }
  return null;
}

type OembedData = {
  title: string | null;
  author: string | null;
  image: string | null;
};

/**
 * oEmbed ma'lumoti — sarlavha, muallif, rasm.
 *
 * `noembed.com` CORS bilan javob beradi (YouTube'ning o'z oEmbed'i
 * bermaydi). Xizmat javob bermasa xato emas — bo'sh natija: kartochka
 * sinxron ma'lumot bilan qolaveradi.
 */
async function fetchOembed(href: string, signal: AbortSignal): Promise<OembedData> {
  const empty: OembedData = { title: null, author: null, image: null };
  try {
    const response = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(href)}`,
      { signal, mode: "cors", credentials: "omit" },
    );
    if (!response.ok) return empty;
    const json: unknown = await response.json();
    if (!isRecord(json) || json.error) return empty;
    return {
      title: asString(json.title) || null,
      author: asString(json.author_name) || null,
      image: asString(json.thumbnail_url) || null,
    };
  } catch {
    return empty;
  }
}

/**
 * Xabar matni uchun havola kartochkasi.
 *
 * `flex-wrap` qatorda `w-full` — matn birinchi qatorda, kartochka o'z
 * qatorida, vaqt esa oxirgi qatorda o'ngda qoladi (Telegram tartibi).
 * Tanish havola bo'lmasa hech narsa chizilmaydi.
 */
export function LinkPreviewCard({
  text,
  mine,
  className,
}: {
  text: string;
  /** Brend fonli (o'z) pufakda ranglar oq tusga o'tadi. */
  mine: boolean;
  className?: string;
}) {
  const card = useMemo(() => firstLinkCard(text), [text]);

  const oembed = useQuery({
    queryKey: ["link-preview", card?.href ?? ""],
    queryFn: ({ signal }) => fetchOembed(card!.href, signal),
    enabled: card?.fetchable === true,
    // Havola o'zgarmaydi — bir marta olingani sessiya davomida yetadi.
    staleTime: Infinity,
    gcTime: 60 * 60_000,
    retry: false,
  });

  const [playing, setPlaying] = useState(false);

  if (!card) return null;

  const title = oembed.data?.title ?? card.title;
  const author = oembed.data?.author ?? null;
  const image = card.image ?? oembed.data?.image ?? null;
  const embed = card.embedUrl;

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <div
      onClick={stop}
      className={cn(
        "mt-1.5 w-full overflow-hidden rounded-lg border-l-[3px] py-1.5 pr-2 pl-2.5",
        mine ? "border-white/70 bg-white/12" : "border-link bg-subtle",
        className,
      )}
    >
      <a
        href={card.href}
        target="_blank"
        rel="noopener noreferrer"
        title="Havolani ochish"
        className="block no-underline"
      >
        <p
          className={cn(
            "text-meta font-semibold",
            mine ? "text-link-on-brand" : "text-link",
          )}
        >
          {card.siteName}
        </p>
        {title ? (
          <p
            className={cn(
              "line-clamp-2 text-dense font-semibold",
              mine ? "text-white" : "text-ink",
            )}
            data-no-translit
          >
            {title}
          </p>
        ) : null}
        {author ? (
          <p
            className={cn(
              "line-clamp-1 text-meta",
              mine ? "text-white/80" : "text-ink-muted",
            )}
            data-no-translit
          >
            {author}
          </p>
        ) : null}
      </a>

      {playing && embed ? (
        <div className="mt-1.5 aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
            title={title ?? "YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="size-full border-0"
          />
        </div>
      ) : image ? (
        embed ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            title="Shu yerda ko'rish"
            className="group/thumb relative mt-1.5 block aspect-video w-full overflow-hidden rounded-lg bg-black"
          >
            <Thumbnail src={image} />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-14 items-center justify-center rounded-xl bg-[#ff0033] text-white shadow-lg transition-transform group-hover/thumb:scale-105">
                <Play className="size-5 fill-current" />
              </span>
            </span>
          </button>
        ) : (
          <a
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-1.5 block aspect-video w-full overflow-hidden rounded-lg bg-black"
          >
            <Thumbnail src={image} />
            <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-micro font-medium text-white">
              <ExternalLink className="size-3" />
              Ochish
            </span>
          </a>
        )
      ) : null}
    </div>
  );
}

function Thumbnail({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="size-full object-cover"
    />
  );
}
