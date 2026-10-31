"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

const SIZES = { sm: "size-8 rounded-md", md: "size-10 rounded-lg", lg: "size-12 rounded-xl" } as const;
const PIXELS = { sm: 32, md: 40, lg: 48 } as const;

function initialsOf(name: string): string {
  const letters = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  return letters;
}

/**
 * Mahsulot rasmi: rasm bo'lmasa (sklad `item` larida yo'q) yoki yuklanmasa —
 * nomning bosh harflari, nom ham bo'lmasa — ikonka. Rang tokenlardan.
 */
export function ProductThumb({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = cn("bg-subtle text-ink-muted border-line relative flex shrink-0 items-center justify-center overflow-hidden border", SIZES[size], className);
  if (src && !failed) {
    return (
      <span className={box}>
        <Image
          src={src}
          alt=""
          width={PIXELS[size]}
          height={PIXELS[size]}
          unoptimized
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  const initials = initialsOf(name);
  return (
    <span aria-hidden className={box}>
      {initials ? <span className="text-fine font-semibold" data-no-translit>{initials}</span> : <Package className="size-4" />}
    </span>
  );
}

/** Bir nechta mahsulot — ustma-ust kichik rasmlar, ko'pi bilan uchtasi. */
export function ProductThumbs({ items, className }: { items: Array<{ name: string; imageUrl?: string | null }>; className?: string }) {
  if (items.length === 0) return null;
  return (
    <span aria-hidden className={cn("flex shrink-0 -space-x-2", className)}>
      {items.slice(0, 3).map((item, index) => (
        <ProductThumb key={`${item.name}-${index}`} src={item.imageUrl} name={item.name} size="sm" className="ring-surface ring-2" />
      ))}
    </span>
  );
}
