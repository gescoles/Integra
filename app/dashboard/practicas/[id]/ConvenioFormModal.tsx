"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import { crearConvenio, actualizarConvenio, obtenerDepartamentosDelCentro, obtenerModulosPorGrupo, guardarModulosConvenio, obtenerCiclosDelCentro } from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

type ModuloConvenio = { moduloProfesionalId: string; horasEmpresa: number };
type Convenio = {
  id: string;
  tipologia: string | null;
  estadoAcuerdo: string | null;
  horasConvalidadas: number;
  anyCurso: string | null;
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
  departamentoId: string | null;
  cicloGrupo: string | null;
  modulos: ModuloConvenio[];
};

const GRUPOS_CON_MODULOS_FALLBACK: string[] = [];

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

  // Departamento / ciclo / módulos, seleccionables ya desde la creación.
  const [departamentos, setDepartamentos] = useState<{ id: string; nombre: string }[]>([]);
  const [gruposCentro, setGruposCentro] = useState<string[]>(GRUPOS_CON_MODULOS_FALLBACK);
  const [departamentoId, setDepartamentoId] = useState(convenio?.departamentoId ?? "");
  const [cicloGrupo, setCicloGrupo] = useState(convenio?.cicloGrupo ?? "");
  const [catalogo, setCatalogo] = useState<{ id: string; codigo: string; nombre: string; horasEmpresa: number }[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [seleccion, setSeleccion] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    convenio?.modulos.forEach((m) => (inicial[m.moduloProfesionalId] = m.horasEmpresa));
    return inicial;
  });

  useEffect(() => {
    if (open) {
      obtenerDepartamentosDelCentro().then(setDepartamentos);
      obtenerCiclosDelCentro().then(setGruposCentro);
    }
  }, [open]);

  useEffect(() => {
    if (!cicloGrupo) {
      setCatalogo([]);
      return;
    }
    setCargandoCatalogo(true);
    obtenerModulosPorGrupo(cicloGrupo)
      .then(setCatalogo)
      .finally(() => setCargandoCatalogo(false));
  }, [cicloGrupo]);

  const totalHoras = useMemo(() => Object.values(seleccion).reduce((s, h) => s + (Number(h) || 0), 0), [seleccion]);

  function toggleModulo(m: { id: string; horasEmpresa: number }) {
    setSeleccion((prev) => {
      const next = { ...prev };
      if (m.id in next) delete next[m.id];
      else next[m.id] = m.horasEmpresa;
      return next;
    });
  }

  function cambiarHoras(moduloId: string, horas: number) {
    setSeleccion((prev) => ({ ...prev, [moduloId]: horas }));
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(formData: FormData) {
    formData.set("practicaAlumnoId", fichaId);
    formData.set("departamentoId", departamentoId);
    formData.set("cicloGrupo", cicloGrupo);
    setPending(true);
    setError(null);
    try {
      let convenioId: string;
      if (isEdit && convenio) {
        formData.set("id", convenio.id);
        await actualizarConvenio(formData);
        convenioId = convenio.id;
      } else {
        const result = await crearConvenio(formData);
        convenioId = result.id;
      }

      await guardarModulosConvenio(
        convenioId,
        Object.entries(seleccion).map(([moduloProfesionalId, horasEmpresa]) => ({ moduloProfesionalId, horasEmpresa: Number(horasEmpresa) }))
      );

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
          <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
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

              <div className="grid grid-cols-2 gap-6">
                {/* Columna izquierda: datos generales */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Datos generales</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {translate(locale, "practicas.tipologia")} <span className="text-red-500">*</span>
                      </label>
                      <select name="tipologia" required defaultValue={convenio?.tipologia ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                        <option value="" disabled>Selecciona...</option>
                        <option value="EE">EE</option>
                        <option value="Formación dual">Formación dual</option>
                        <option value="Beca de colaboración">Beca de colaboración</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {translate(locale, "practicas.estadoAcuerdo")} <span className="text-red-500">*</span>
                      </label>
                      <select name="estadoAcuerdo" required defaultValue={convenio?.estadoAcuerdo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                        <option value="" disabled>Selecciona...</option>
                        <option value="Pendiente de firma">Pendiente de firma</option>
                        <option value="Firmado">Firmado</option>
                        <option value="En trámite">En trámite</option>
                        <option value="Anulado">Anulado</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {translate(locale, "practicas.fechaInicio")} <span className="text-red-500">*</span>
                      </label>
                      <input name="fechaInicio" type="date" required defaultValue={fmtDate(convenio?.fechaInicio ?? null)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {translate(locale, "practicas.fechaFin")} <span className="text-red-500">*</span>
                      </label>
                      <input name="fechaFin" type="date" required defaultValue={fmtDate(convenio?.fechaFin ?? null)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {translate(locale, "practicas.periodo")} <span className="text-red-500">*</span>
                      </label>
                      <select name="periodo" required defaultValue={convenio?.periodo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                        <option value="" disabled>Selecciona...</option>
                        <option value="Estàndard">Estándar</option>
                        <option value="Intensiu">Intensivo</option>
                        <option value="Especial">Especial</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {translate(locale, "practicas.quienAltaBaja")} <span className="text-red-500">*</span>
                      </label>
                      <input name="quienAltaBajaSS" required defaultValue={convenio?.quienAltaBajaSS ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Año del ciclo <span className="text-red-500">*</span>
                      </label>
                      <select name="anyCurso" required defaultValue={convenio?.anyCurso ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                        <option value="" disabled>Selecciona...</option>
                        <option value="Primer">Primer año</option>
                        <option value="Segon">Segundo año</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Horas convalidadas <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="horasConvalidadas"
                        type="number"
                        min={0}
                        required
                        defaultValue={convenio?.horasConvalidadas ?? 0}
                        placeholder="0 si no convalida cap hora"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">Pon 0 si este convenio no convalida ninguna hora.</p>
                    </div>
                  </div>
                </div>

                {/* Columna derecha: departamento y módulos */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Departamento y módulos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Departamento <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={departamentoId}
                        onChange={(e) => setDepartamentoId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                      >
                        <option value="" disabled>Elige un departamento...</option>
                        {departamentos.map((d) => (
                          <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Ciclo formativo <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={cicloGrupo}
                        onChange={(e) => setCicloGrupo(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                      >
                        <option value="" disabled>Elige un ciclo...</option>
                        {gruposCentro.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    {cargandoCatalogo ? (
                      <div className="py-4 text-center text-xs text-slate-400">Cargando módulos...</div>
                    ) : !cicloGrupo ? (
                      <div className="py-4 text-center text-xs text-slate-400">Elige un ciclo para ver sus módulos.</div>
                    ) : catalogo.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Todavía no hay módulos cargados para este ciclo. Un SuperAdmin puede añadirlos desde &quot;Gestionar módulos&quot;, en Prácticas.
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-100">
                        <table className="w-full text-left text-xs">
                          <tbody>
                            {catalogo.map((m) => {
                              const marcado = m.id in seleccion;
                              return (
                                <tr key={m.id} className={`border-t border-slate-50 first:border-t-0 ${marcado ? "bg-orange-50/40" : ""}`}>
                                  <td className="w-8 px-2 py-1.5">
                                    <input type="checkbox" checked={marcado} onChange={() => toggleModulo(m)} className="h-4 w-4 accent-[#FD5249]" />
                                  </td>
                                  <td className="px-2 py-1.5 text-slate-400">{m.codigo}</td>
                                  <td className="px-2 py-1.5 text-slate-600">{m.nombre}</td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      value={marcado ? seleccion[m.id] : m.horasEmpresa}
                                      onChange={(e) => cambiarHoras(m.id, Number(e.target.value))}
                                      disabled={!marcado}
                                      className="w-14 rounded-md border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-[#FD5249] disabled:bg-slate-50 disabled:text-slate-300"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                  )}
                </div>
                {Object.keys(seleccion).length > 0 && (
                  <p className="mt-2 text-right text-xs font-semibold text-slate-500">
                    {Object.keys(seleccion).length} módulo(s) · Total: {totalHoras}h en la empresa
                  </p>
                )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Información de la empresa</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          {translate(locale, "practicas.empresaNombre")} <span className="text-red-500">*</span>
                        </label>
                        <input name="empresaNombre" required defaultValue={convenio?.empresaNombre ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          {translate(locale, "practicas.empresaCif")} <span className="text-red-500">*</span>
                        </label>
                        <input name="empresaCif" required defaultValue={convenio?.empresaCif ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Información del tutor de empresa</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          {translate(locale, "practicas.tutorEmpresaNombre")} <span className="text-red-500">*</span>
                        </label>
                        <input name="tutorEmpresaNombre" required defaultValue={convenio?.tutorEmpresaNombre ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          {translate(locale, "practicas.tutorEmpresaTelefono")} <span className="text-red-500">*</span>
                        </label>
                        <input name="tutorEmpresaTelefono" required defaultValue={convenio?.tutorEmpresaTelefono ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          {translate(locale, "practicas.tutorEmpresaCorreo")} <span className="text-red-500">*</span>
                        </label>
                        <input name="tutorEmpresaCorreo" type="email" required defaultValue={convenio?.tutorEmpresaCorreo ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Información adicional del convenio <span className="font-normal text-slate-400">(opcional)</span>
                </label>
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
