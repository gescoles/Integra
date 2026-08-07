"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, X, Pencil, Plus } from "lucide-react";
import { crearExpediente, actualizarExpediente } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type ExpedienteEdit = {
  id: string;
  sancionDias: number;
  sancionMotivo: string;
  fechaInicio: string;
  fets: string;
  testimonis: string;
  informeTutor: string;
  audienciaResumen: string;
  valoracionComision: string;
  medidasProvisionales: string;
  fechaAplicacionInicio: string;
  fechaAplicacionFin: string;
  recursoEstado: string;
  direccionNombre: string;
  coordinadorNombre: string;
};

export function ExpedienteFormModal({
  incidenciaId,
  descripcionInicial,
  expediente,
  modoCrear = false,
}: {
  incidenciaId: string;
  descripcionInicial: string;
  expediente?: ExpedienteEdit;
  modoCrear?: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(expediente);

  const fmtDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

  async function handleSubmit(formData: FormData) {
    formData.set("incidenciaId", incidenciaId);
    setPending(true);
    setError(null);
    try {
      if (isEdit && expediente) {
        formData.set("id", expediente.id);
        await actualizarExpediente(formData);
      } else {
        await crearExpediente(formData);
      }
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" /> {translate(locale, "expedientes.editarExpediente")}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          {modoCrear ? <Plus className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {modoCrear ? translate(locale, "expedientes.nuevoExpediente") : translate(locale, "expedientes.aplicarSancion")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {isEdit ? translate(locale, "expedientes.editarExpediente") : translate(locale, "expedientes.nuevoExpediente")}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-5">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#FD5249]">
                {translate(locale, "expedientes.avisoNormativaFija")}
              </p>
              <p className="text-xs text-slate-400">{translate(locale, "expedientes.avisoTodoObligatorio")}</p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "expedientes.fets")} <span className="text-red-500">*</span>
                </label>
                <p className="mb-1 text-xs text-slate-400">{translate(locale, "expedientes.fetsAyuda")}</p>
                <textarea
                  name="fets"
                  rows={5}
                  required
                  defaultValue={expediente?.fets ?? descripcionInicial}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "expedientes.procedimentSeguit")}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.fechaInicioExpediente")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="fechaInicio"
                      type="date"
                      required
                      defaultValue={fmtDate(expediente?.fechaInicio) || new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.testimonis")} <span className="text-red-500">*</span>
                    </label>
                    <p className="mb-1 text-xs text-slate-400">{translate(locale, "expedientes.testimonisAyuda")}</p>
                    <textarea name="testimonis" rows={3} required defaultValue={expediente?.testimonis ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.informeTutor")} <span className="text-red-500">*</span>
                    </label>
                    <textarea name="informeTutor" rows={3} required defaultValue={expediente?.informeTutor ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "expedientes.audienciaAlumno")} <span className="text-red-500">*</span>
                </label>
                <textarea name="audienciaResumen" rows={3} required defaultValue={expediente?.audienciaResumen ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "expedientes.valoracionComision")} <span className="text-red-500">*</span>
                </label>
                <textarea name="valoracionComision" rows={3} required defaultValue={expediente?.valoracionComision ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "expedientes.medidasProvisionales")} <span className="text-red-500">*</span>
                </label>
                <textarea name="medidasProvisionales" rows={2} required defaultValue={expediente?.medidasProvisionales ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "expedientes.resolucio")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.diasExpulsion")} <span className="text-red-500">*</span>
                    </label>
                    <input name="sancionDias" type="number" min={1} required defaultValue={expediente?.sancionDias ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.fechaAplicacionInicio")} <span className="text-red-500">*</span>
                    </label>
                    <input name="fechaAplicacionInicio" type="date" required defaultValue={fmtDate(expediente?.fechaAplicacionInicio)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.fechaAplicacionFin")} <span className="text-red-500">*</span>
                    </label>
                    <input name="fechaAplicacionFin" type="date" required defaultValue={fmtDate(expediente?.fechaAplicacionFin)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "expedientes.motivoParte")} <span className="text-red-500">*</span>
                  </label>
                  <textarea name="sancionMotivo" rows={2} required defaultValue={expediente?.sancionMotivo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "expedientes.recursos")} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 has-[:checked]:border-red-400 has-[:checked]:bg-red-50 has-[:checked]:text-red-600">
                    <input type="radio" name="recursoEstado" value="DECLARA" required defaultChecked={expediente?.recursoEstado === "DECLARA"} className="accent-red-500" />
                    {translate(locale, "expedientes.declaraRecurso")}
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-600">
                    <input type="radio" name="recursoEstado" value="RENUNCIA" required defaultChecked={expediente?.recursoEstado === "RENUNCIA"} className="accent-emerald-500" />
                    {translate(locale, "expedientes.renunciaRecurso")}
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{translate(locale, "expedientes.firmas")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.direccionCentro")} <span className="text-red-500">*</span>
                    </label>
                    <input name="direccionNombre" required defaultValue={expediente?.direccionNombre ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "expedientes.coordinadorDepartamento")} <span className="text-red-500">*</span>
                    </label>
                    <input name="coordinadorNombre" required defaultValue={expediente?.coordinadorNombre ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">{translate(locale, "expedientes.tutorFirmaAuto")}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {translate(locale, "common.guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
