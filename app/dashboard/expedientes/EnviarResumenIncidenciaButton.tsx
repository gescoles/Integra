"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { enviarResumenIncidencia } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function EnviarResumenIncidenciaButton({ incidenciaId }: { incidenciaId: string }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    enviarResumenIncidencia(incidenciaId, email)
      .then(() => {
        setEnviado(true);
        setTimeout(() => {
          setOpen(false);
          setEnviado(false);
          setEmail("");
        }, 1200);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo enviar."))
      .finally(() => setPending(false));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
      >
        <Mail className="h-3.5 w-3.5" /> {translate(locale, "expedientes.enviarAlumno")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0B1D4D]">{translate(locale, "expedientes.enviarAlumno")}</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {enviado ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-600">{translate(locale, "expedientes.resumenEnviado")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "expedientes.emailAlumno")}</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alumno@ejemplo.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    {translate(locale, "common.cancelar")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                  >
                    {pending && <ButtonSpinner />}
                    {translate(locale, "common.guardar")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
