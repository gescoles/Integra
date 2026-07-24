"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Logo } from "../components/Logo";

function NetworkBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 500 900"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="#2F6FED" strokeOpacity="0.25" strokeWidth="1">
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
      <g fill="#2F6FED" fillOpacity="0.45">
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
      className={`absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-white/60 backdrop-blur-sm ${className}`}
      style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
    >
      <Icon className="h-6 w-6 text-[#2F6FED]" strokeWidth={1.75} />
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Left panel */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 lg:flex lg:flex-col lg:justify-center lg:px-16">
          <NetworkBackground />
          <BadgeIcon icon={GraduationCap} className="left-24 bottom-[18%]" />
          <BadgeIcon icon={Users} className="right-16 bottom-[24%]" />

          <div className="relative z-10 max-w-md">
            <Logo />
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
            className="flex items-center gap-2 text-sm font-semibold text-[#2F6FED] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#0B1D4D]">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500">Accede a tu cuenta de Integra</p>

              <form
                className="mt-7 space-y-5"
                onSubmit={(e) => e.preventDefault()}
              >
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Correo electrónico
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-[#2F6FED]">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-[#2F6FED]">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
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
                    className="h-4 w-4 rounded border-slate-300 accent-[#2F6FED]"
                  />
                  Recordarme
                </label>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#2F6FED] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#255ed1]"
                >
                  Iniciar sesión
                </button>
              </form>

              <div className="mt-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">¿Necesitas ayuda?</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <Headphones className="h-4 w-4 text-[#2F6FED]" />
                <a href="#" className="font-medium text-[#2F6FED] hover:underline">
                  Contacta con soporte o consulta nuestra guía de ayuda
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-4 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 text-[#2F6FED]" />
        Tu información está protegida con los más altos estándares de seguridad.
      </div>
    </main>
  );
}
