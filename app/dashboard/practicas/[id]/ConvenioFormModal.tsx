"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import { crearConvenio, actualizarConvenio } from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

type Convenio = {
  id: string;
  tipologia: string | null;
  estadoAcuerdo: string | null;
  convalida: boolean;
  quienAltaBajaSS: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  periodo: string | null;
  empresaCif: string | null;
  empresaNombre: string | null;
  tutorEmpresaNombre: string | null;
  tutorEmpresaTelefono: string | null;
  tutorEmpresaCorreo: string | null;
  observaciones: string | null;
};

export function ConvenioFormModal({
  fichaId,
  convenio,
}: {
  fichaId: string;
  convenio?: Convenio;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(convenio);

  function handleClose() {
    setOpen(false);
    setError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(formData: FormData) {
    formData.set("practicaAlumnoId", fichaId);
    setPending(true);
    setError(null);
    try {
      if (isEdit && convenio) {
        formData.set("id", convenio.id);
        await actualizarConvenio(formData);
      } else {
        await crearConvenio(formData);
      }
      router.refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <>
      {isEdit ? (
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          <Plus className="h-4 w-4" /> {translate(locale, "practicas.nuevoConvenio")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {isEdit ? translate(locale, "practicas.editarConvenio") : translate(locale, "practicas.nuevoConvenio")}
              </h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tipologia")}</label>
                  <select name="tipologia" defaultValue={convenio?.tipologia ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                    <option value="">—</option>
                    <option value="FCT">FCT</option>
                    <option value="Formación dual">Formación dual</option>
                    <option value="Beca de colaboración">Beca de colaboración</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.estadoAcuerdo")}</label>
                  <select name="estadoAcuerdo" defaultValue={convenio?.estadoAcuerdo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                    <option value="">—</option>
                    <option value="Pendiente de firma">Pendiente de firma</option>
                    <option value="Firmado">Firmado</option>
                    <option value="En trámite">En trámite</option>
                    <option value="Anulado">Anulado</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.fechaInicio")}</label>
                  <input name="fechaInicio" type="date" defaultValue={fmtDate(convenio?.fechaInicio ?? null)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.fechaFin")}</label>
                  <input name="fechaFin" type="date" defaultValue={fmtDate(convenio?.fechaFin ?? null)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.periodo")}</label>
                  <select name="periodo" defaultValue={convenio?.periodo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                    <option value="">—</option>
                    <option value="1r trimestre">1r trimestre</option>
                    <option value="2n trimestre">2n trimestre</option>
                    <option value="3r trimestre">3r trimestre</option>
                    <option value="Intensivo (jornada completa)">Intensivo (jornada completa)</option>
                    <option value="Ordinario (horas semanales)">Ordinario (horas semanales)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.quienAltaBaja")}</label>
                  <input name="quienAltaBajaSS" defaultValue={convenio?.quienAltaBajaSS ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="convalida" defaultChecked={convenio?.convalida} className="rounded border-slate-300 accent-[#FD5249]" />
                {translate(locale, "practicas.convalida")}
              </label>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "practicas.seccionEmpresa")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.empresaNombre")}</label>
                    <input name="empresaNombre" defaultValue={convenio?.empresaNombre ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.empresaCif")}</label>
                    <input name="empresaCif" defaultValue={convenio?.empresaCif ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tutorEmpresaNombre")}</label>
                    <input name="tutorEmpresaNombre" defaultValue={convenio?.tutorEmpresaNombre ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tutorEmpresaTelefono")}</label>
                    <input name="tutorEmpresaTelefono" defaultValue={convenio?.tutorEmpresaTelefono ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tutorEmpresaCorreo")}</label>
                    <input name="tutorEmpresaCorreo" type="email" defaultValue={convenio?.tutorEmpresaCorreo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "salidas.observaciones")}</label>
                <textarea name="observaciones" rows={3} defaultValue={convenio?.observaciones ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {pending ? translate(locale, "common.guardando") : translate(locale, "common.guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
