"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X, PenLine } from "lucide-react";
import { enviarExpediente } from "./actions";
import { SignaturePad } from "./SignaturePad";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function EnviarExpedienteButton({ expedienteId }: { expedienteId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firmaDireccion, setFirmaDireccion] = useState<string | null>(null);
  const [firmaTutor, setFirmaTutor] = useState<string | null>(null);
  const [firmaCoordinador, setFirmaCoordinador] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    if (!firmaDireccion || !firmaTutor || !firmaCoordinador) {
      setError(translate(locale, "expedientes.avisoFaltanFirmas"));
      return;
    }
    formData.set("id", expedienteId);
    formData.set("firmaDireccion", firmaDireccion);
    formData.set("firmaTutor", firmaTutor);
    formData.set("firmaCoordinador", firmaCoordinador);

    setError(null);
    setPending(true);
    try {
      await enviarExpediente(formData);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        <Send className="h-3.5 w-3.5" />
        {translate(locale, "expedientes.enviarAlTutor")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-emerald-600" />
                <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "expedientes.revisarYFirmar")}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-5">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <p className="text-xs text-slate-500">{translate(locale, "expedientes.avisoRevisarAntes")}</p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "expedientes.emailAlumno")}</label>
                <input
                  name="emailAlumno"
                  type="email"
                  placeholder="alumno@ejemplo.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
                <p className="mt-1 text-xs text-slate-400">{translate(locale, "expedientes.emailAlumnoAyuda")}</p>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "expedientes.firmasNecesarias")}</h3>
                <SignaturePad label={translate(locale, "expedientes.direccionCentro")} onChange={setFirmaDireccion} />
                <SignaturePad label={translate(locale, "expedientes.firmaTutor")} onChange={setFirmaTutor} />
                <SignaturePad label={translate(locale, "expedientes.coordinadorDepartamento")} onChange={setFirmaCoordinador} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {translate(locale, "expedientes.enviarAlTutor")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
