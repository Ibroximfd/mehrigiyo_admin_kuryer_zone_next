import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Mavjud bo'lmagan manzil ochilganda. */
export default function NotFound() {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-brand text-5xl font-semibold tracking-tight">404</p>
      <h1 className="text-ink mt-3 text-lg font-semibold">Sahifa topilmadi</h1>
      <p className="text-ink-muted mt-1.5 max-w-sm text-body text-balance">
        Siz izlagan sahifa mavjud emas yoki manzili o&apos;zgargan.
      </p>

      <Link
        href="/"
        className="bg-brand text-brand-ink hover:bg-brand-hover mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-body font-semibold transition-colors"
      >
        <ArrowLeft className="size-4" />
        Boshqaruv paneliga qaytish
      </Link>
    </div>
  );
}
