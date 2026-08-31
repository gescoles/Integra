"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, KeyRound, Lock, CheckCircle2 } from "lucide-react";
import { HexLogo } from "../components/Logo";
import { solicitarCodigoReset, verificarCodigoReset, restablecerPassword } from "./actions";

type Paso = "email" | "codigo" | "password" | "listo";

export default function OlvidePasswordPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnviarEmail(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await solicitarCodigoReset(email);
      setPaso("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await verificarCodigoReset(email, codigo);
      setPaso("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "El código no es correcto.");
    } finally {
      setPending(false);
    }
  }

  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nuevaPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setPending(true);
    try {
      await restablecerPassword(email, codigo, nuevaPassword);
      setPaso("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <HexLogo size={48} />
          <h1 className="mt-3 text-lg font-bold text-[#0B1D4D]">Recuperar contraseña</h1>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

        {paso === "email" && (
          <form onSubmit={handleEnviarEmail} className="space-y-4">
            <p className="text-sm text-slate-500">
              Escribe el correo con el que estás registrado y te mandaremos un código para recuperar el acceso.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[#FD5249] py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        )}

        {paso === "codigo" && (
          <form onSubmit={handleVerificarCodigo} className="space-y-4">
            <p className="text-sm text-slate-500">
              Si ese correo está registrado, te habrá llegado un código de 6 cifras. Escríbelo aquí (caduca en 15 minutos).
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Código</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm tracking-widest outline-none focus:border-[#FD5249]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[#FD5249] py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending ? "Comprobando..." : "Comprobar código"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPaso("email");
                setCodigo("");
                setError(null);
              }}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Pedir otro código
            </button>
          </form>
        )}

        {paso === "password" && (
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <p className="text-sm text-slate-500">Elige tu nueva contraseña.</p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nueva contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Repetir contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[#FD5249] py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}

        {paso === "listo" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">Contraseña actualizada</p>
            <p className="text-sm text-slate-500">Ya puedes entrar con tu correo y la nueva contraseña.</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-2 w-full rounded-lg bg-[#FD5249] py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
            >
              Ir a iniciar sesión
            </button>
          </div>
        )}

        {paso !== "listo" && (
          <Link href="/login" className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
