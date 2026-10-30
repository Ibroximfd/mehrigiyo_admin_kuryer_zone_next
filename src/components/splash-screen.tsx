import { BrandLogo } from "@/components/brand-logo";

/**
 * Saqlangan sessiya tekshirilayotganda ko'rsatiladi. Shu ekran tufayli
 * allaqachon kirgan operatorga login formasi bir zumga ham ko'rinmaydi.
 */
export function SplashScreen() {
  return (
    <div className="bg-rail flex min-h-dvh flex-col items-center justify-center gap-8">
      <BrandLogo
        size={96}
        priority
        className="size-20 rounded-2xl ring-1 ring-white/10"
      />

      <div
        role="status"
        aria-label="Yuklanmoqda"
        className="border-rail-line border-t-accent size-6 animate-spin rounded-full border-2"
      />
    </div>
  );
}
