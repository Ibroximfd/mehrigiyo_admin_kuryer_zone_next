"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, Lock, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BrandLogo } from "@/components/brand-logo";
import { Reveal } from "@/components/fx/reveal";
import { RouteLine } from "@/components/fx/route-line";
import { SceneBackdrop } from "@/components/fx/scene-backdrop";
import { SCENES } from "@/components/fx/scenes";
import { TiltCard } from "@/components/fx/tilt-card";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SplashScreen } from "@/components/splash-screen";
import { credentials } from "@/lib/credentials";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Kirish sahifasi — `login_page.dart` ning ko'chirmasi.
 *
 * Katta ekranda ikki ustunli (chapda brend paneli, o'ngda forma), telefonda
 * esa bitta ustunli. Bitta DOM daraxti CSS orqali ikkalasini ham beradi,
 * shuning uchun parol menejerlari chalkashmaydi.
 */

const loginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Telefon raqamni kiriting")
    .regex(/^[\d+\s()-]+$/, "Faqat raqam kiriting"),
  password: z.string().min(1, "Parolni kiriting"),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Oxirgi kirgan raqam — keyingi safar faqat parol teriladi. */
const LAST_PHONE_KEY = "last_phone";

const savedPhone = () =>
  typeof window === "undefined"
    ? ""
    : (window.localStorage.getItem(LAST_PHONE_KEY) ?? "");

/** Formadagi bezaklarni olib tashlab, backend kutgan ko'rinishga keltiradi. */
const normalizePhone = (phone: string) => phone.replace(/[\s()-]/g, "");

export default function LoginPage() {
  const status = useAuthStore((state) => state.status);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  /** Jim avto-kirish faqat bir marta uriniladi — muvaffaqiyatsiz bo'lsa
      aylanib qayta so'rayvermaydi. */
  const autoSignInTried = useRef(false);

  // Sahifa to'g'ridan-to'g'ri ochilgan bo'lishi mumkin — saqlangan sessiyani
  // shu yerda ham tekshiramiz.
  useEffect(() => {
    if (status === "unknown") restoreSession();
  }, [status, restoreSession]);

  // Kirgan operatorni u ketayotgan sahifaga qaytaramiz (`?from=`), bo'lmasa
  // boshqaruv paneliga. `app_router.dart` dagi `restore()` ning o'rni.
  useEffect(() => {
    if (status !== "authenticated") return;

    const from = new URLSearchParams(window.location.search).get("from");
    router.replace(from && from.startsWith("/") ? from : "/");
  }, [status, router]);

  /**
   * Brauzer saqlagan hisob bilan jim kirish: Chrome'da "avtomatik kirish"
   * yoniq bo'lsa operator login sahifasini bir zum ko'radi-yu, parol
   * termasdan ichkariga o'tib ketadi. Hisob topilmasa forma odatdagidek
   * qoladi va zarari yo'q.
   */
  useEffect(() => {
    if (status !== "unauthenticated" || autoSignInTried.current) return;
    autoSignInTried.current = true;

    void (async () => {
      const saved = await credentials.get();
      if (!saved) return;
      await login(normalizePhone(saved.phone), saved.password);
      // Muvaffaqiyatsiz bo'lsa jim qolamiz — operator formani ko'rib turibdi.
    })();
  }, [status, login]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: savedPhone(), password: "" },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const phone = normalizePhone(values.phone);
    const ok = await login(phone, values.password);

    if (!ok) {
      toast.error(useAuthStore.getState().error ?? "Login yoki parol xato");
      form.setFocus("password");
      form.resetField("password");
      return;
    }

    // Keyingi kirishlar qulay bo'lsin: raqamni eslab qolamiz va parolni
    // brauzer menejeriga saqlashni taklif qilamiz.
    window.localStorage.setItem(LAST_PHONE_KEY, phone);
    void credentials.save(phone, values.password);
  });

  // Raqam eslab qolingan — kursor to'g'ri parol maydoniga tushadi.
  useEffect(() => {
    if (status === "unauthenticated" && form.getValues("phone")) {
      form.setFocus("password");
    }
  }, [status, form]);

  // Sessiya hali noma'lum — login formasi "chaqnab" ketmasligi uchun splash.
  if (status !== "unauthenticated") return <SplashScreen />;

  return (
    <div className="bg-canvas relative min-h-dvh overflow-hidden">
      {/* Tungi yo'l sahnasi — kechki shahar ko'chasi; sahifaning LCP'si, shuning uchun preload. */}
      <SceneBackdrop scene={SCENES.login} preload />

      <div className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_minmax(0,28rem)] lg:gap-16 lg:px-12">
        {/* ── Brend: logotip, sarlavha, marshrut ────────────────────────── */}
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* Logo muallaq turadi (fx-float) va kursorga qarab egiladi (tilt) */}
          <div className="fx-float w-fit" style={{ animationDuration: "9s" }}>
            <TiltCard className="rounded-3xl">
              <BrandLogo
                size={240}
                priority
                className="elev-4 size-20 rounded-3xl ring-1 ring-white/10 lg:size-28"
              />
            </TiltCard>
          </div>

          <Reveal index={1}>
            <h1 className="text-ink text-display mt-6 lg:text-hero lg:mt-8">
              Mehrigiyo Bosh kuryer
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="text-ink-muted mt-3 max-w-md text-lg2 text-balance lg:mt-4">
              Yetkazish va filiallararo almashinuv paneli
            </p>
          </Reveal>

          {/* Imzo harakat — Filial → Kuryer → Mijoz; telefonda joy tor, yashirin. */}
          <Reveal index={3} className="mt-8 hidden w-full max-w-xl lg:block">
            <RouteLine />
          </Reveal>
        </section>

        {/* ── Kirish formasi — sahna ustidagi shisha karta ───────────────── */}
        <section className="glass-panel border-line elev-4 w-full max-w-[420px] justify-self-center rounded-3xl border p-7 sm:p-9 lg:justify-self-end">
          <div className="mb-6 flex justify-center lg:justify-end">
            <LocaleSwitcher />
          </div>

          <Reveal index={1}>
            <h2 className="text-ink text-display text-center">Xush kelibsiz</h2>
            <p className="text-ink-muted mt-2 text-center text-body">
              Hisobingizga kirish uchun ma&apos;lumotlarni kiriting
            </p>
          </Reveal>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <Reveal index={2}>
              <Field
                id="phone"
                label="Telefon raqam"
                error={form.formState.errors.phone?.message}
              >
                <Phone className="text-ink-faint pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2" />
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  autoFocus={!savedPhone()}
                  placeholder="998901234567"
                  aria-invalid={Boolean(form.formState.errors.phone)}
                  className={inputClass}
                  {...form.register("phone")}
                />
              </Field>
            </Reveal>

            <Reveal index={3}>
              <Field
                id="password"
                label="Parol"
                error={form.formState.errors.password?.message}
              >
                <Lock className="text-ink-faint pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  className={cn(inputClass, "pr-11")}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  className="text-ink-faint hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4.5" />
                  ) : (
                    <Eye className="size-4.5" />
                  )}
                </button>
              </Field>
            </Reveal>

            <Reveal index={4}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-rich bg-brand text-brand-ink flex h-12 w-full items-center justify-center gap-2 rounded-full text-lg2 font-semibold disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4.5 animate-spin" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  "Tizimga kirish"
                )}
              </button>
            </Reveal>
          </form>
        </section>
      </div>
    </div>
  );
}

const inputClass = cn(
  "bg-surface border-line text-ink placeholder:text-ink-faint h-12 w-full rounded-xl border",
  "pl-11 text-lg2 transition-colors",
  "hover:border-line-strong focus:border-brand focus:ring-brand/15 focus:ring-4 focus:outline-none",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
);

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-ink block text-dense font-medium">
        {label}
      </label>
      <div className="relative mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="text-danger mt-1.5 text-dense">
          {error}
        </p>
      ) : null}
    </div>
  );
}
