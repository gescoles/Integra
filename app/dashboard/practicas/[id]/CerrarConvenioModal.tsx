"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X, Lock, RotateCcw } from "lucide-react";
import { cerrarConvenio, reabrirConvenio } from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

export function CerrarConvenioModal({
  fichaId,
  convenioId,
  cerrado,
  notaFinal,
  fechaCierre,
  esDirectivo,
  faltanTutorias,
}: {
  fichaId: string;
  convenioId: string;
  cerrado: boolean;
  notaFinal: string | null;
  fechaCierre: string | null;
  esDirectivo: boolean;
  faltanTutorias: string[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const bloqueadoParaProfesor = !esDirectivo && !cerrado && faltanTutorias.length > 0;

  async function handleSubmit(formData: FormData) {
    formData.set("id", convenioId);
    formData.set("practicaAlumnoId", fichaId);
    setPending(true);
    setError(null);
    try {
      await cerrarConvenio(formData);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el convenio.");
    } finally {
      setPending(false);
    }
  }

  async function handleReabrir() {
    if (!confirm(translate(locale, "practicas.confirmReabrir"))) return;
    setPending(true);
    try {
      await reabrirConvenio(convenioId, fichaId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {cerrado && !esDirectivo ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> {translate(locale, "practicas.convenioCerrado")}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            disabled={bloqueadoParaProfesor}
            title={bloqueadoParaProfesor ? translate(locale, "practicas.faltanTutoriasTooltip") : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {bloqueadoParaProfesor ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {cerrado ? translate(locale, "practicas.editarCierre") : translate(locale, "practicas.cerrarConvenio")}
          </button>
          {cerrado && esDirectivo && (
            <button
              onClick={handleReabrir}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {translate(locale, "practicas.reabrir")}
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {cerrado ? translate(locale, "practicas.editarCierre") : translate(locale, "practicas.cerrarConvenio")}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#2F6FED]">
                {translate(locale, "practicas.avisoNotaConvenio")}
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.fechaCierre")}</label>
                <input
                  name="fechaCierre"
                  type="date"
                  defaultValue={fechaCierre ? fechaCierre.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.notaFinal")}</label>
                <input
                  name="notaFinal"
                  defaultValue={notaFinal ?? ""}
                  placeholder={translate(locale, "practicas.notaFinalPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
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
                  {pending ? translate(locale, "common.guardando") : translate(locale, "practicas.confirmarCierre")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
