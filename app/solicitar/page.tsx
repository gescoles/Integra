"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { AssemblingLogo } from "../dashboard/components/AssemblingLogo";
import { enviarSolicitud } from "./actions";

function FormularioSolicitud() {
  const params = useSearchParams();
  const tipoInicial = params.get("tipo") === "registro" ? "registro" : "demo";
  const [tipo, setTipo] = useState<"demo" | "registro">(tipoInicial);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setEnviando(true);
    setError(null);
    formData.set("tipo", tipo);
    try {
      await enviarSolicitud(formData);
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
        <h1 className="text-2xl font-bold text-[#0B1D4D]">¡Solicitud enviada!</h1>
        <p className="mt-3 text-slate-500">
          Hemos recibido tus datos. Nuestro equipo se pondrá en contacto contigo en menos de 48h.
        </p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#FD5249]">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      {enviando && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <AssemblingLogo size={140} />
            <div className="flex items-center gap-1 text-sm font-semibold text-[#0B1D4D]">
              <span>Enviando tu solicitud</span>
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D] [animation-delay:-0.3s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D] [animation-delay:-0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#0B1D4D]" />
              </span>
            </div>
          </div>
        </div>
      )}

      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-[#FD5249]">
        <ArrowLeft className="h-4 w-4" /> Volver al inicio
      </Link>

      <h1 className="text-3xl font-black text-[#0B1D4D]">Hablemos de tu centro</h1>
      <p className="mt-2 text-slate-500">Rellena tus datos y nuestro equipo se pondrá en contacto contigo.</p>

      <div className="mt-6 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTipo("demo")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            tipo === "demo" ? "bg-white text-[#0B1D4D] shadow-sm" : "text-slate-500"
          }`}
        >
          Solicitar demo
        </button>
        <button
          type="button"
          onClick={() => setTipo("registro")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            tipo === "registro" ? "bg-white text-[#0B1D4D] shadow-sm" : "text-slate-500"
          }`}
        >
          Registrar mi centro
        </button>
      </div>

      {error && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <form action={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nombre del centro</label>
          <input
            name="centro"
            required
            placeholder="Ej. INS Montroig"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tu nombre</label>
            <input
              name="responsable"
              required
              placeholder="Nombre y apellidos"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tu cargo</label>
            <input
              name="cargo"
              required
              placeholder="Ej. Director/a"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teléfono</label>
            <input
              name="telefono"
              type="tel"
              required
              placeholder="+34 600 000 000"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="tucorreo@centro.edu"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Número aproximado de alumnos <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            name="numAlumnos"
            placeholder="Ej. 300"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Cuéntanos algo más <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            name="mensaje"
            rows={4}
            placeholder="¿Qué te gustaría resolver con Docentium?"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-[#FD5249] py-3.5 text-sm font-bold text-white hover:bg-[#D7463E] disabled:opacity-60"
        >
          {enviando ? "Enviando..." : tipo === "demo" ? "Solicitar demo" : "Registrar mi centro"}
        </button>
      </form>
    </div>
  );
}

export default function SolicitarPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <Suspense fallback={<div className="py-24 text-center text-slate-400">Cargando...</div>}>
        <FormularioSolicitud />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
