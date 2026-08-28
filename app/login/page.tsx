"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Headphones,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { HexLogo } from "../components/Logo";
import { AssemblingLogo } from "../dashboard/components/AssemblingLogo";

function NetworkBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 500 900"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="#FD5249" strokeOpacity="0.25" strokeWidth="1">
        <line x1="40" y1="330" x2="130" y2="410" />
        <line x1="130" y1="410" x2="90" y2="520" />
        <line x1="90" y1="520" x2="180" y2="590" />
        <line x1="180" y1="590" x2="140" y2="700" />
        <line x1="140" y1="700" x2="230" y2="770" />
        <line x1="230" y1="770" x2="330" y2="800" />
        <line x1="330" y1="800" x2="410" y2="740" />
        <line x1="180" y1="590" x2="290" y2="620" />
        <line x1="130" y1="410" x2="230" y2="450" />
      </g>
      <g fill="#FD5249" fillOpacity="0.45">
        <circle cx="40" cy="330" r="4" />
        <circle cx="130" cy="410" r="4" />
        <circle cx="90" cy="520" r="4" />
        <circle cx="180" cy="590" r="4" />
        <circle cx="140" cy="700" r="4" />
        <circle cx="230" cy="770" r="4" />
        <circle cx="330" cy="800" r="4" />
        <circle cx="410" cy="740" r="4" />
        <circle cx="290" cy="620" r="4" />
        <circle cx="230" cy="450" r="4" />
      </g>
    </svg>
  );
}

function BadgeIcon({
  icon: Icon,
  className,
}: {
  icon: typeof BookOpen;
  className?: string;
}) {
  return (
    <div
      className={`absolute flex h-14 w-14 items-center justify-center rounded-full border border-blue-200 bg-white/60 backdrop-blur-sm ${className}`}
    >
      <Icon className="h-6 w-6 text-[#FD5249]" strokeWidth={1.75} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    // Dejamos "loading" activo (mostrando el overlay de "Entrando...") hasta
    // que la navegación al dashboard se complete; así no hay ningún momento
    // en el que la pantalla parezca congelada entre el login y el panel.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm">
          <AssemblingLogo size={140} />
          <p className="text-sm font-medium text-slate-500">Entrando a tu panel…</p>
        </div>
      )}
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Left panel */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 lg:flex lg:flex-col lg:justify-start lg:px-16 lg:pt-20">
          <NetworkBackground />
          <BadgeIcon icon={BookOpen} className="left-16 top-[62%]" />
          <BadgeIcon icon={GraduationCap} className="left-28 bottom-[10%]" />
          <BadgeIcon icon={Users} className="right-16 bottom-[16%]" />

          <div className="relative z-10 max-w-md">
            <div className="flex items-center gap-3">
              <HexLogo size={56} />
              <div>
                <div className="text-2xl font-bold text-[#0B1D4D]">Docentium</div>
                <div className="text-sm text-slate-500">
                  Gestión inteligente para centros educativos
                </div>
              </div>
            </div>
            <h1 className="mt-10 text-3xl font-extrabold text-[#0B1D4D]">
              Bienvenido de nuevo
            </h1>
            <p className="mt-3 text-[15px] text-slate-600">
              Inicia sesión para continuar gestionando tu centro educativo de
              forma simple, segura y eficiente.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col px-6 py-8 lg:px-16 lg:py-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-[#FD5249] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#0B1D4D]">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500">Accede a tu cuenta de Docentium</p>

              <form
                className="mt-7 space-y-5"
                onSubmit={handleSubmit}
              >
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Correo electrónico
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-[#FD5249]">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-[#FD5249]">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 accent-[#FD5249]"
                  />
                  Recordarme
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FD5249] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E] disabled:opacity-70"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Entrando..." : "Iniciar sesión"}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">o</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  signIn("azure-ad", { callbackUrl: "/dashboard" });
                }}
                className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <svg width="18" height="18" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                  <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                  <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                  <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                </svg>
                Iniciar sesión con Microsoft
              </button>

              <div className="mt-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">¿Necesitas ayuda?</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <Headphones className="h-4 w-4 text-[#FD5249]" />
                <a href="#" className="font-medium text-[#FD5249] hover:underline">
                  Contacta con soporte o consulta nuestra guía de ayuda
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-4 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 text-[#FD5249]" />
        Tu información está protegida con los más altos estándares de seguridad.
      </div>
    </main>
  );
}
