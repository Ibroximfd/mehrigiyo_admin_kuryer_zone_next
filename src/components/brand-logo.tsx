import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Mehrigiyo logotipi — Flutter'dagi `Image.asset('assets/images/web_logo.jpg')`
 * ning o'rni. Fayl `public/web_logo.jpg` da yotadi, shuning uchun manzili
 * to'g'ridan-to'g'ri `/web_logo.jpg`.
 *
 * Ko'rinadigan o'lchamni `className` beradi (masalan `size-24`), `size` esa
 * rasmning tabiiy o'lchamini bildiradi — brauzer shunga qarab yuklaydi.
 */
export function BrandLogo({
  size = 96,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/web_logo.jpg"
      alt="Mehrigiyo"
      width={size}
      height={size}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
