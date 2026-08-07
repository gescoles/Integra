"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X, Search } from "lucide-react";
import { crearIncidencia, actualizarIncidencia } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type AlumnoOption = { id: string; nombre: string; curso: string; avatarUrl: string | null; profesorId?: string };
type ProfesorOption = { id: string; name: string };

const TIPOS_INCIDENCIA = [
  "Conducta inapropiada",
  "Retraso injustificado",
  "Uso indebido del móvil",
  "Falta de material",
  "Desacato al profesorado",
  "Daños materiales",
  "Alteración en clase",
  "Falta de respeto",
  "Absentismo",
  "Otro",
];

type IncidenciaEdit = {
  id: string;
  tutorId: string;
  tipoIncidencia: string;
  prioridad: string;
  fecha: string;
  lugar: string | null;
  descripcion: string;
  observaciones: string | null;
  medidasAplicadas: string | null;
  familiaInformada: boolean;
  familiaInformadaComunicacion: string | null;
};

export function IncidenciaFormModal({
  alumnos,
  profesores,
  incidencia,
  alumnoFijo,
  etiquetaBoton,
}: {
  alumnos: AlumnoOption[];
  profesores: ProfesorOption[];
  incidencia?: IncidenciaEdit;
  alumnoFijo?: { id: string; nombre: string; curso: string; avatarUrl: string | null };
  etiquetaBoton?: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoOption | null>(alumnoFijo ?? null);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [familiaInformada, setFamiliaInformada] = useState(incidencia?.familiaInformada ?? false);
  const [tutorSeleccionado, setTutorSeleccionado] = useState(incidencia?.tutorId ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(incidencia);

  const alumnosFiltrados = useMemo(() => {
    const q = busquedaAlumno.trim().toLowerCase();
    if (!q) return alumnos.slice(0, 30);
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(q) || a.curso.toLowerCase().includes(q)).slice(0, 30);
  }, [alumnos, busquedaAlumno]);

  function handleClose() {
    setOpen(false);
    setError(null);
    if (!alumnoFijo) {
      setAlumnoSeleccionado(null);
      setTutorSeleccionado(incidencia?.tutorId ?? "");
    }
    formRef.current?.reset();
  }

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  async function handleSubmit(formData: FormData) {
    if (!isEdit) {
      if (!alumnoSeleccionado) {
        setError(translate(locale, "practicas.eligeAlumno"));
        return;
      }
      formData.set("alumnoId", alumnoSeleccionado.id);
    }
    formData.set("familiaInformada", familiaInformada ? "on" : "off");
    setPending(true);
    setError(null);
    try {
      if (isEdit && incidencia) {
        formData.set("id", incidencia.id);
        await actualizarIncidencia(formData);
      } else {
        await crearIncidencia(formData);
      }
      router.refresh();
      handleClose();
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" /> {translate(locale, "expedientes.editar")}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          <Plus className="h-4 w-4" /> {etiquetaBoton ?? translate(locale, "expedientes.nuevaIncidencia")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {isEdit ? translate(locale, "expedientes.editarIncidencia") : translate(locale, "expedientes.nuevaIncidencia")}
              </h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              {!isEdit && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "expedientes.alumno")} <span className="text-red-500">*</span>
                  </label>
                  {alumnoSeleccionado ? (
                    <div className="flex items-center justify-between rounded-lg border border-[#FD5249] bg-blue-50 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-200">
                          {alumnoSeleccionado.avatarUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={alumnoSeleccionado.avatarUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{alumnoSeleccionado.nombre}</div>
                          <div className="text-xs text-slate-400">{alumnoSeleccionado.curso}</div>
                        </div>
                      </div>
                      {!alumnoFijo && (
                        <button type="button" onClick={() => setAlumnoSeleccionado(null)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={busquedaAlumno}
                        onChange={(e) => setBusquedaAlumno(e.target.value)}
                        onFocus={() => setBuscadorAbierto(true)}
                        onBlur={() => setTimeout(() => setBuscadorAbierto(false), 150)}
                        placeholder={translate(locale, "practicas.buscarAlumnoPlaceholder")}
                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
                      />
                      {buscadorAbierto && (
                        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {alumnosFiltrados.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-slate-400">{translate(locale, "practicas.sinAlumnosCoinciden")}</div>
                          ) : (
                            alumnosFiltrados.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onMouseDown={() => {
                                  setAlumnoSeleccionado(a);
                                  setBusquedaAlumno("");
                                  if (a.profesorId) setTutorSeleccionado(a.profesorId);
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                              >
                                <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-slate-200">
                                  {a.avatarUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  )}
                                </div>
                                <span className="text-sm text-slate-700">{a.nombre}</span>
                                <span className="text-xs text-slate-400">{a.curso}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "expedientes.tipoIncidencia")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tipoIncidencia"
                    required
                    defaultValue={incidencia?.tipoIncidencia ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="" disabled>—</option>
                    {TIPOS_INCIDENCIA.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "expedientes.prioridad")}</label>
                  <select name="prioridad" defaultValue={incidencia?.prioridad ?? "MEDIA"} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                    <option value="BAJA">{translate(locale, "expedientes.baja")}</option>
                    <option value="MEDIA">{translate(locale, "expedientes.media")}</option>
                    <option value="ALTA">{translate(locale, "expedientes.alta")}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "expedientes.tutorResponsable")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tutorId"
                    required
                    value={tutorSeleccionado}
                    onChange={(e) => setTutorSeleccionado(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="" disabled>—</option>
                    {profesores.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "expedientes.fecha")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="fecha"
                    type="datetime-local"
                    required
                    defaultValue={incidencia ? fmtDateTime(incidencia.fecha) : fmtDateTime(new Date().toISOString())}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "expedientes.lugar")}</label>
                  <input name="lugar" defaultValue={incidencia?.lugar ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "expedientes.descripcion")} <span className="text-red-500">*</span>
                </label>
                <textarea name="descripcion" rows={3} required defaultValue={incidencia?.descripcion ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "expedientes.observaciones")}</label>
                <textarea name="observaciones" rows={2} defaultValue={incidencia?.observaciones ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "expedientes.medidasAplicadas")}</label>
                <textarea name="medidasAplicadas" rows={2} defaultValue={incidencia?.medidasAplicadas ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={familiaInformada}
                    onChange={(e) => setFamiliaInformada(e.target.checked)}
                    className="rounded border-slate-300 accent-[#FD5249]"
                  />
                  {translate(locale, "expedientes.familiaInformada")}
                </label>
                {familiaInformada && (
                  <input
                    name="familiaInformadaComunicacion"
                    defaultValue={incidencia?.familiaInformadaComunicacion ?? ""}
                    placeholder={translate(locale, "expedientes.familiaInformadaPlaceholder")}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                  />
                )}
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
