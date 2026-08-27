"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Search, Lock, Send } from "lucide-react";
import { crearIncidencia, crearExpediente, enviarExpediente } from "./actions";
import { SignaturePad } from "./SignaturePad";
import { ButtonSpinner } from "../components/ButtonSpinner";

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
];

const PASOS = ["Alumno/a", "Incidencia", "Hechos y procedimiento", "Resolución", "Recursoo y firmas"] as const;

function fmtDateTimeLocal(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AbrirExpedienteWizard({
  alumnos,
  profesores,
  alumnoFijo,
}: {
  alumnos: AlumnoOption[];
  profesores: ProfesorOption[];
  alumnoFijo?: AlumnoOption;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoOption | null>(alumnoFijo ?? null);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [familiaInformada, setFamiliaInformada] = useState(false);

  const [sancionDias, setSancionDias] = useState("");
  const [fechaInicioSancion, setFechaInicioSancion] = useState("");

  const [firmaDireccion, setFirmaDireccion] = useState<string | null>(null);
  const [firmaTutor, setFirmaTutor] = useState<string | null>(null);
  const [firmaCoordinador, setFirmaCoordinador] = useState<string | null>(null);
  const [firmaAlumno, setFirmaAlumno] = useState<string | null>(null);

  const tutorId = useMemo(() => alumnoSeleccionado?.profesorId ?? "", [alumnoSeleccionado]);
  const tutorNombre = useMemo(() => profesores.find((p) => p.id === tutorId)?.name ?? null, [tutorId, profesores]);

  const alumnosFiltrados = useMemo(() => {
    const q = busquedaAlumno.trim().toLowerCase();
    if (!q) return alumnos.slice(0, 8);
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(q) || a.curso.toLowerCase().includes(q)).slice(0, 8);
  }, [alumnos, busquedaAlumno]);

  // Igual que en el formulario de expediente: nunca toISOString() para
  // esto, que convierte a UTC y puede restar un día según la zona horaria.
  function fmtFechaLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const fechaFinCalculada = useMemo(() => {
    const dias = Number(sancionDias);
    if (!fechaInicioSancion || !Number.isFinite(dias) || dias < 1) return "";
    const d = new Date(`${fechaInicioSancion}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return fmtFechaLocal(d);
  }, [sancionDias, fechaInicioSancion]);

  function handleClose() {
    setOpen(false);
    setPaso(0);
    setError(null);
    if (!alumnoFijo) setAlumnoSeleccionado(null);
    setFamiliaInformada(false);
    setSancionDias("");
    setFechaInicioSancion("");
    setFirmaDireccion(null);
    setFirmaTutor(null);
    setFirmaCoordinador(null);
    setFirmaAlumno(null);
    formRef.current?.reset();
  }

  function validarPasoActual(): string | null {
    if (!formRef.current) return null;
    const form = formRef.current;

    if (paso === 0) {
      if (!alumnoSeleccionado) return "Elige un alumno/a para continuar.";
      if (!tutorId) return "Este alumno/a no tiene tutor/a asignado — asígnaselo desde Tutorías antes de continuar.";
    }
    if (paso === 1) {
      for (const name of ["tipoIncidencia", "fecha", "descripcion", "lugar", "observaciones", "medidasAplicadas"]) {
        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        if (el && !el.value.trim()) return "Rellena los campos obligatorios (marcados con *) antes de continuar.";
      }
    }
    if (paso === 2) {
      for (const name of ["fets", "fechaInicio", "testimonis", "informeTutor"]) {
        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el && !el.value.trim()) return "Rellena los campos obligatorios (marcados con *) antes de continuar.";
      }
    }
    if (paso === 3) {
      for (const name of ["audienciaResumen", "valoracionComision", "medidasProvisionales", "sancionMotivo"]) {
        const el = form.elements.namedItem(name) as HTMLTextAreaElement | null;
        if (el && !el.value.trim()) return "Rellena los campos obligatorios (marcados con *) antes de continuar.";
      }
      if (!fechaFinCalculada) return "Pon los días de expulsión y la fecha de inicio para calcular la fecha de vuelta.";
    }
    if (paso === 4) {
      const recurso = form.elements.namedItem("recursoEstado") as RadioNodeList | null;
      if (!recurso || !(recurso as unknown as HTMLInputElement).value) return "Elige si se declara o se renuncia al recurso.";
      for (const name of ["direccionNombre", "coordinadorNombre"]) {
        const el = form.elements.namedItem(name) as HTMLInputElement | null;
        if (el && !el.value.trim()) return "Rellena los campos obligatorios (marcados con *) antes de continuar.";
      }
    }
    return null;
  }

  function handleSiguiente() {
    const err = validarPasoActual();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  function handleAnterior() {
    setError(null);
    setPaso((p) => Math.max(p - 1, 0));
  }

  async function handleFinalizar() {
    const err = validarPasoActual();
    if (err) {
      setError(err);
      return;
    }
    if (!firmaDireccion || !firmaTutor || !firmaCoordinador || !firmaAlumno) {
      setError("Faltan firmas: hacen falta las de Dirección, Tutor/a, Coordinador/a y del alumno/a antes de enviar.");
      return;
    }
    if (!formRef.current || !alumnoSeleccionado) return;

    setPending(true);
    setError(null);
    try {
      const formData = new FormData(formRef.current);
      formData.set("alumnoId", alumnoSeleccionado.id);
      formData.set("tutorId", tutorId);
      formData.set("familiaInformada", familiaInformada ? "on" : "off");
      formData.set("esParteDeExpediente", "true");

      const { id: incidenciaId } = await crearIncidencia(formData);

      const formExpediente = new FormData(formRef.current);
      formExpediente.set("incidenciaId", incidenciaId);
      formExpediente.set("fechaAplicacionFin", fechaFinCalculada);
      const { id: expedienteId } = await crearExpediente(formExpediente);

      const formEnvio = new FormData();
      formEnvio.set("id", expedienteId);
      formEnvio.set("firmaDireccion", firmaDireccion);
      formEnvio.set("firmaTutor", firmaTutor);
      formEnvio.set("firmaCoordinador", firmaCoordinador);
      formEnvio.set("firmaAlumno", firmaAlumno);
      await enviarExpediente(formEnvio);

      router.refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el expediente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
      >
        Abrir expediente
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
            {/* Cabecera con los pasos, fija */}
            <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0B1D4D]">Abrir expediente</h2>
                <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {PASOS.map((p, i) => (
                  <div key={p} className="flex flex-1 items-center gap-1.5">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        i < paso ? "bg-emerald-500 text-white" : i === paso ? "bg-[#FD5249] text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < PASOS.length - 1 && <div className={`h-0.5 flex-1 ${i < paso ? "bg-emerald-500" : "bg-slate-100"}`} />}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{PASOS[paso]}</p>
            </div>

            {/* Contenido del paso actual, con scroll interno */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <form ref={formRef} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* Paso 0: Alumno */}
                <div className={paso === 0 ? "block space-y-4" : "hidden"}>
                  {alumnoFijo ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      {alumnoFijo.avatarUrl && <img src={alumnoFijo.avatarUrl} alt="" className="h-10 w-10 rounded-full" />}
                      <div>
                        <p className="text-sm font-bold text-[#0B1D4D]">{alumnoFijo.nombre}</p>
                        <p className="text-xs text-slate-400">{alumnoFijo.curso}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Alumno/a <span className="text-red-500">*</span>
                      </label>
                      {alumnoSeleccionado ? (
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {alumnoSeleccionado.avatarUrl && <img src={alumnoSeleccionado.avatarUrl} alt="" className="h-8 w-8 rounded-full" />}
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{alumnoSeleccionado.nombre}</p>
                              <p className="text-xs text-slate-400">{alumnoSeleccionado.curso}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setAlumnoSeleccionado(null)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              value={busquedaAlumno}
                              onChange={(e) => setBusquedaAlumno(e.target.value)}
                              onFocus={() => setBuscadorAbierto(true)}
                              onBlur={() => setTimeout(() => setBuscadorAbierto(false), 150)}
                              placeholder="Busca por nombre o curso..."
                              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
                            />
                          </div>
                          {buscadorAbierto && (
                            <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                              {alumnosFiltrados.length === 0 ? (
                                <p className="px-3 py-3 text-sm text-slate-400">Sin resultados.</p>
                              ) : (
                                alumnosFiltrados.map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onMouseDown={() => {
                                      setAlumnoSeleccionado(a);
                                      setBusquedaAlumno("");
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                  >
                                    {a.avatarUrl && <img src={a.avatarUrl} alt="" className="h-7 w-7 rounded-full" />}
                                    <span className="font-medium text-slate-700">{a.nombre}</span>
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

                  {alumnoSeleccionado && (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tutor/a</label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {tutorNombre ?? "Este alumno no tiene tutor/a asignado"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Paso 1: Incidencia */}
                <div className={paso === 1 ? "block space-y-4" : "hidden"}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Tipo de incidencia <span className="text-red-500">*</span>
                      </label>
                      <select name="tipoIncidencia" defaultValue="" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                        <option value="" disabled>—</option>
                        {TIPOS_INCIDENCIA.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prioridad</label>
                      <select name="prioridad" defaultValue="MEDIA" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Fecha <span className="text-red-500">*</span>
                      </label>
                      <input name="fecha" type="datetime-local" defaultValue={fmtDateTimeLocal()} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Lugar <span className="text-red-500">*</span>
                      </label>
                      <input name="lugar" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Descripción <span className="text-red-500">*</span>
                    </label>
                    <textarea name="descripcion" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Observaciones <span className="text-red-500">*</span>
                    </label>
                    <textarea name="observaciones" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Medidas aplicadas <span className="text-red-500">*</span>
                    </label>
                    <textarea name="medidasAplicadas" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={familiaInformada} onChange={(e) => setFamiliaInformada(e.target.checked)} className="rounded border-slate-300 accent-[#FD5249]" />
                      Familia informada
                    </label>
                    {familiaInformada && (
                      <input name="familiaInformadaComunicacion" placeholder="Cómo se ha informado..." className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
                    )}
                  </div>
                </div>

                {/* Paso 2: Hechos y procedimiento */}
                <div className={paso === 2 ? "block space-y-4" : "hidden"}>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Hechos que motivan la apertura <span className="text-red-500">*</span>
                    </label>
                    <textarea name="fets" rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Fecha de apertura del expediente <span className="text-red-500">*</span>
                    </label>
                    <input name="fechaInicio" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Testimonios y pruebas <span className="text-red-500">*</span>
                    </label>
                    <textarea name="testimonis" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Informe del tutor/a <span className="text-red-500">*</span>
                    </label>
                    <textarea name="informeTutor" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                </div>

                {/* Paso 3: Resoluciónn */}
                <div className={paso === 3 ? "block space-y-4" : "hidden"}>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Audiencia al alumno/a <span className="text-red-500">*</span>
                    </label>
                    <textarea name="audienciaResumen" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Valoración de la Comisión <span className="text-red-500">*</span>
                    </label>
                    <textarea name="valoracionComision" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Medidas provisionales <span className="text-red-500">*</span>
                    </label>
                    <textarea name="medidasProvisionales" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Días de expulsión <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="sancionDias"
                        min={1}
                        value={sancionDias}
                        onChange={(e) => setSancionDias(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                      />
                    </div>
                    <div />
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Fecha de inicio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="fechaAplicacionInicio"
                        value={fechaInicioSancion}
                        onChange={(e) => setFechaInicioSancion(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha de vuelta</label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {fechaFinCalculada ? new Date(`${fechaFinCalculada}T00:00:00`).toLocaleDateString("es-ES") : "—"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Motivo del parte <span className="text-red-500">*</span>
                    </label>
                    <textarea name="sancionMotivo" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                  </div>
                </div>

                {/* Paso 4: Recursoo y firmas */}
                <div className={paso === 4 ? "block space-y-4" : "hidden"}>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Recurso <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 has-[:checked]:border-red-400 has-[:checked]:bg-red-50 has-[:checked]:text-red-600">
                        <input type="radio" name="recursoEstado" value="DECLARA" className="accent-red-500" />
                        Se declara
                      </label>
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-600">
                        <input type="radio" name="recursoEstado" value="RENUNCIA" className="accent-emerald-500" />
                        Se renuncia
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Dirección del centro <span className="text-red-500">*</span>
                      </label>
                      <input name="direccionNombre" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Coordinador de Departamento <span className="text-red-500">*</span>
                      </label>
                      <input name="coordinadorNombre" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Firmas necesarias</h3>
                    <SignaturePad label="Dirección del centro" onChange={setFirmaDireccion} />
                    <SignaturePad label="Tutor/a" onChange={setFirmaTutor} />
                    <SignaturePad label="Coordinador de Departamento" onChange={setFirmaCoordinador} />
                    <SignaturePad label="Alumno/a" onChange={setFirmaAlumno} />
                  </div>
                </div>
              </form>
            </div>

            {/* Navegación, siempre fija y visible */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={paso === 0 ? handleClose : handleAnterior}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                {paso === 0 ? "Cancelar" : "Anterior"}
              </button>

              {paso < PASOS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSiguiente}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  <Send className="h-4 w-4" />
                  Crear y enviar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
