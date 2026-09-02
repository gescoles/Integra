"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCog, ClipboardList, FileText, Trash2, Paperclip, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { crearAlumnoPI, asignarPsicopedagogaCentro, asignarDirectorPIEmail, crearActuacion, eliminarActuacion } from "./actions";
import { PIDocumentoPanel } from "./PIDocumentoForm";
import { EliminarExpedientePIModal } from "./EliminarExpedientePIModal";

type AlumnoDelCentro = {
  id: string;
  nombre: string;
  curso: string;
  departamento: string | null;
  tutorNombre: string;
  tutorId: string;
  fechaNacimiento: string | null;
  tieneExpedientePI: boolean;
};
type AlumnoPI = {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  alumnoCurso: string;
  tutorId: string;
  tutorNombre: string;
  horasDedicadas: number;
  diagnostico: string;
  tienePI: boolean | null;
  totalActuaciones: number;
  documentoId: string | null;
  estadoDocumento: string | null;
  psicopedagogaNombre: string;
};

const CON_QUIEN_ACTUACION_LABEL: Record<string, string> = {
  ALUMNO: "Alumne",
  FAMILIA: "Família",
  ALUMNO_FAMILIA: "Alumne+família",
  TUTOR: "Tutor",
};

const MEDIO_ACTUACION_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial",
  MAIL: "Mail",
  TELEFONICA: "Telefónica",
  APP_IMES: "App iMes",
};

const ESTADO_LABEL: Record<string, { texto: string; color: string }> = {
  BORRADOR: { texto: "Borrador", color: "bg-slate-100 text-slate-600" },
  PENDIENTE_TUTOR: { texto: "Pendiente firma tutor", color: "bg-amber-100 text-amber-700" },
  PENDIENTE_DIRECTOR: { texto: "Pendiente firma director", color: "bg-amber-100 text-amber-700" },
  PENDIENTE_TUTOR_DIRECTOR: { texto: "Pendiente firma tutor/director", color: "bg-amber-100 text-amber-700" },
  PENDIENTE_FAMILIA: { texto: "Pendiente firma família/alumno", color: "bg-amber-100 text-amber-700" },
  LISTO_PARA_ENVIAR: { texto: "Listo para enviar", color: "bg-blue-100 text-blue-700" },
  CERRADO: { texto: "Cerrado", color: "bg-emerald-100 text-emerald-700" },
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";

export function PsicopedagogiaClient({
  schoolId,
  alumnosPI,
  alumnosDelCentro,
  currentUserId,
  esPsicopedagoga,
  esDirectivo,
  esDirectorFijo,
  isSuperAdmin,
  psicopedagogaActual,
  profesoresParaPsico,
  directorPIEmailActual,
  cursoAcademicoCentro,
}: {
  schoolId: string;
  alumnosPI: AlumnoPI[];
  alumnosDelCentro: AlumnoDelCentro[];
  currentUserId: string;
  esPsicopedagoga: boolean;
  esDirectivo: boolean;
  esDirectorFijo: boolean;
  isSuperAdmin: boolean;
  psicopedagogaActual: { id: string; nombre: string } | null;
  profesoresParaPsico: { id: string; nombre: string; rol?: string }[];
  directorPIEmailActual: string | null;
  cursoAcademicoCentro: string;
}) {
  const router = useRouter();
  const [expedienteAbiertoId, setExpedienteAbiertoId] = useState<string | null>(null);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroTutor, setFiltroTutor] = useState("");

  const puedeVerTodo = esPsicopedagoga || esDirectivo || esDirectorFijo;
  const alumnosVisibles = (puedeVerTodo
    ? alumnosPI
    : alumnosPI.filter((a) => a.tutorId === currentUserId || esDirectorFijo)
  ).filter((a) => {
    if (filtroAlumno && a.alumnoNombre !== filtroAlumno) return false;
    if (filtroTutor && a.tutorNombre !== filtroTutor) return false;
    return true;
  });

  // Las opciones del filtro son los alumnos/profesores que ya tienen un
  // expediente de Psicopedagogia abierto — no se escribe a mano.
  const alumnosConPINombres = useMemo(() => Array.from(new Set(alumnosPI.map((a) => a.alumnoNombre))).sort(), [alumnosPI]);
  const tutoresConPINombres = useMemo(() => Array.from(new Set(alumnosPI.map((a) => a.tutorNombre))).sort(), [alumnosPI]);

  return (
    <div>
      {isSuperAdmin && (
        <>
          <AsignarPsicopedagogaPanel schoolId={schoolId} psicopedagogaActual={psicopedagogaActual} profesoresParaPsico={profesoresParaPsico} />
          <AsignarDirectorEmailPanel schoolId={schoolId} directorPIEmailActual={directorPIEmailActual} />
        </>
      )}

      {esPsicopedagoga && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => setModalNuevoAbierto(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <Plus className="h-4 w-4" /> Nuevo expediente (PI)
          </button>
        </div>
      )}

      {puedeVerTodo && (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Filtrar por alumno</label>
            <select value={filtroAlumno} onChange={(e) => setFiltroAlumno(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
              <option value="">Todos los alumnos</option>
              {alumnosConPINombres.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Filtrar por profesor/tutor</label>
            <select value={filtroTutor} onChange={(e) => setFiltroTutor(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
              <option value="">Todos los profesores</option>
              {tutoresConPINombres.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mb-2 hidden items-center gap-2 px-4 sm:flex">
        <div className="flex flex-1 items-center gap-3">
          <div className="h-4 w-4 shrink-0" />
          <div className="grid flex-1 grid-cols-6 gap-x-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>Nombre</span>
            <span>Ciclo</span>
            <span>PI (Sí/No)</span>
            <span>Horas actuación</span>
            <span>Actuaciones</span>
            <span>Estado</span>
          </div>
        </div>
        <div className="h-4 w-8 shrink-0" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {alumnosVisibles.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-slate-400">
            {esPsicopedagoga ? "Todavía no has creado ningún expediente." : "No tienes ningún PI pendiente."}
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {alumnosVisibles.map((a) => (
              <AlumnoPICard
                key={a.id}
                alumno={a}
                currentUserId={currentUserId}
                esPsicopedagoga={esPsicopedagoga}
                esDirectorFijo={esDirectorFijo}
                profesoresDelCentro={profesoresParaPsico}
                cursoAcademicoCentro={cursoAcademicoCentro}
                abiertoInicialmente={a.id === expedienteAbiertoId}
              />
            ))}
          </div>
        )}
      </div>

      {modalNuevoAbierto && (
        <NuevoExpedienteModal
          alumnosDelCentro={alumnosDelCentro.filter((a) => !a.tieneExpedientePI)}
          onClose={() => setModalNuevoAbierto(false)}
          onCreado={(id) => {
            setModalNuevoAbierto(false);
            router.refresh();
            setExpedienteAbiertoId(id);
          }}
        />
      )}
    </div>
  );
}

function AsignarPsicopedagogaPanel({
  schoolId,
  psicopedagogaActual,
  profesoresParaPsico,
}: {
  schoolId: string;
  psicopedagogaActual: { id: string; nombre: string } | null;
  profesoresParaPsico: { id: string; nombre: string; rol?: string }[];
}) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState(psicopedagogaActual?.id ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    try {
      await asignarPsicopedagogaCentro(schoolId, seleccionado || null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
      <div className="mb-2 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-bold text-[#0B1D4D]">Psicopedagoga del centro</h3>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        La persona asignada aquí puede crear expedientes y PIs de cualquier alumno del centro.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={seleccionado} onChange={(e) => setSeleccionado(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="">Sin asignar</option>
          {profesoresParaPsico.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}{p.rol ? ` (${p.rol})` : ""}</option>
          ))}
        </select>
        <button onClick={handleGuardar} disabled={guardando} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {guardando ? <ButtonSpinner /> : "Guardar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AsignarDirectorEmailPanel({ schoolId, directorPIEmailActual }: { schoolId: string; directorPIEmailActual: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(directorPIEmailActual ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      await asignarDirectorPIEmail(schoolId, email || null);
      setExito("Correo del director guardado.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
      <h3 className="mb-2 text-sm font-bold text-[#0B1D4D]">Correo del director/a que firma los PI</h3>
      <p className="mb-3 text-xs text-slate-500">
        Obligatorio para poder solicitar firmas — sin este correo puesto, la psicopedagoga no podrá pedir firmas del director.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="director@tucentro.com"
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
        />
        <button onClick={handleGuardar} disabled={guardando} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {guardando ? <ButtonSpinner /> : "Guardar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {exito && <p className="mt-2 text-xs text-emerald-600">{exito}</p>}
    </div>
  );
}

function NuevoExpedienteModal({
  alumnosDelCentro,
  onClose,
  onCreado,
}: {
  alumnosDelCentro: AlumnoDelCentro[];
  onClose: () => void;
  onCreado: (id: string) => void;
}) {
  const [alumnoId, setAlumnoId] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tienePI, setTienePI] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alumno = alumnosDelCentro.find((a) => a.id === alumnoId) ?? null;

  async function handleCrear() {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("alumnoId", alumnoId);
    formData.set("diagnostico", diagnostico);
    formData.set("tienePI", tienePI);
    try {
      const id = await crearAlumnoPI(formData);
      onCreado(id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-base font-bold text-[#0B1D4D]">Nuevo expediente de Psicopedagogia</h3>

        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Alumno</label>
        <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className={`${inputClass} mb-3`}>
          <option value="">Elige un alumno...</option>
          {alumnosDelCentro.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre} — {a.curso}</option>
          ))}
        </select>

        {alumno && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p><strong>Tutor:</strong> {alumno.tutorNombre}</p>
            <p><strong>Ciclo:</strong> {alumno.curso}</p>
            <p><strong>Departamento:</strong> {alumno.departamento ?? "—"}</p>
          </div>
        )}

        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Diagnóstico / información</label>
        <textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} rows={3} className={`${inputClass} mb-3`} />

        <label className="mb-1.5 block text-xs font-semibold text-slate-700">¿Tiene PI?</label>
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setTienePI("SI")} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${tienePI === "SI" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>Sí</button>
          <button type="button" onClick={() => setTienePI("NO")} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${tienePI === "NO" ? "border-slate-500 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-500"}`}>No</button>
          <button type="button" onClick={() => setTienePI("")} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${tienePI === "" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"}`}>Vacío</button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleCrear} disabled={pending} className="rounded-lg bg-[#FD5249] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60">
            {pending ? <ButtonSpinner /> : "Crear expediente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlumnoPICard({
  alumno,
  currentUserId,
  esPsicopedagoga,
  esDirectorFijo,
  profesoresDelCentro,
  cursoAcademicoCentro,
  abiertoInicialmente,
}: {
  alumno: AlumnoPI;
  currentUserId: string;
  esPsicopedagoga: boolean;
  esDirectorFijo: boolean;
  profesoresDelCentro: { id: string; nombre: string; rol?: string }[];
  cursoAcademicoCentro: string;
  abiertoInicialmente: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(abiertoInicialmente);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const estado = alumno.estadoDocumento ? ESTADO_LABEL[alumno.estadoDocumento] : null;

  return (
    <div>
      <div className="flex w-full items-center gap-2 px-4 py-3 hover:bg-slate-50">
        <button onClick={() => setExpanded((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
          <div className="grid flex-1 grid-cols-2 items-center gap-x-3 gap-y-1 sm:grid-cols-6">
            <span className="font-semibold text-slate-700">{alumno.alumnoNombre}</span>
            <span className="text-xs font-bold text-slate-600">{alumno.alumnoCurso}</span>
            <span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  alumno.tienePI === true ? "bg-emerald-100 text-emerald-700" : alumno.tienePI === false ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-600"
                }`}
              >
                {alumno.tienePI === true ? "Sí" : alumno.tienePI === false ? "No" : "Vacío"}
              </span>
            </span>
            <span className="text-xs font-bold text-slate-600">{alumno.horasDedicadas.toLocaleString("es-ES")} h</span>
            <span className="text-xs font-bold text-slate-600">{alumno.totalActuaciones} actuaciones</span>
            <span>
              {estado ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${estado.color}`}>{estado.texto}</span>
              ) : (
                <span className="text-xs text-slate-400">Sin documento</span>
              )}
            </span>
          </div>
        </button>
        {esPsicopedagoga && (
          <button onClick={() => setMostrarModalEliminar(true)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Eliminar expediente">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-5">
          <ExpedienteDetalle
            expediente={alumno}
            currentUserId={currentUserId}
            esPsicopedagoga={esPsicopedagoga}
            esDirectorFijo={esDirectorFijo}
            profesoresDelCentro={profesoresDelCentro}
            cursoAcademicoCentro={cursoAcademicoCentro}
            onVolver={() => {
              setExpanded(false);
              router.refresh();
            }}
          />
        </div>
      )}
      {mostrarModalEliminar && (
        <EliminarExpedientePIModal
          alumnoNombre={alumno.alumnoNombre}
          alumnoPiId={alumno.id}
          onClose={() => setMostrarModalEliminar(false)}
          onEliminado={() => {
            setMostrarModalEliminar(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ExpedienteDetalle({
  expediente,
  currentUserId,
  esPsicopedagoga,
  esDirectorFijo,
  profesoresDelCentro,
  cursoAcademicoCentro,
  onVolver,
}: {
  expediente: AlumnoPI;
  currentUserId: string;
  esPsicopedagoga: boolean;
  esDirectorFijo: boolean;
  profesoresDelCentro: { id: string; nombre: string }[];
  cursoAcademicoCentro: string;
  onVolver: () => void;
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [conQuien, setConQuien] = useState("");
  const [medio, setMedio] = useState("");
  const [informacionExtra, setInformacionExtra] = useState("");
  const [horasDedicadas, setHorasDedicadas] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actuaciones, setActuaciones] = useState<{ id: string; fecha: string; conQuien: string; medio: string; informacionExtra: string; horasDedicadas: number }[] | null>(null);
  const [documentos, setDocumentos] = useState<{ id: string; nombre: string; url: string; tamano: number | null; subidoPorNombre: string | null; createdAt: string }[] | null>(null);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [tutorNombreReal, setTutorNombreReal] = useState<string>("");
  const [fechaNacimientoAlumno, setFechaNacimientoAlumno] = useState<string>("");

  async function recargarDetalle() {
    const { obtenerAlumnoPIDetalle } = await import("./actions");
    const d = await obtenerAlumnoPIDetalle(expediente.id);
    setActuaciones(d?.actuaciones ?? []);
    setDocumentos(d?.documentos ?? []);
    if (d?.tutorNombre) setTutorNombreReal(d.tutorNombre);
    if (d?.alumnoFechaNacimiento) setFechaNacimientoAlumno(d.alumnoFechaNacimiento.slice(0, 10));
  }

  // Cargamos el detalle completo (actuaciones y documentos) al entrar,
  // y cada vez que se cambia de expediente.
  useEffect(() => {
    setActuaciones(null);
    setDocumentos(null);
    recargarDetalle();
  }, [expediente.id]);

  async function handleSubirDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendoDocumento(true);
    setError(null);
    const formData = new FormData();
    formData.set("archivo", file);
    try {
      const { subirDocumentoAlumnoPI } = await import("./actions");
      await subirDocumentoAlumnoPI(expediente.id, formData);
      await recargarDetalle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendoDocumento(false);
    }
  }

  async function handleEliminarDocumento(id: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    const { eliminarDocumentoAlumnoPI } = await import("./actions");
    await eliminarDocumentoAlumnoPI(id);
    await recargarDetalle();
  }

  async function handleNuevaActuacion(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha || !conQuien || !medio || !informacionExtra || !horasDedicadas) {
      setError("Rellena la fecha, con quién, el medio, la información extra y las horas dedicadas.");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("fecha", fecha);
    formData.set("conQuien", conQuien);
    formData.set("medio", medio);
    formData.set("informacionExtra", informacionExtra);
    formData.set("horasDedicadas", horasDedicadas);
    try {
      await crearActuacion(expediente.id, formData);
      setConQuien("");
      setMedio("");
      setInformacionExtra("");
      setHorasDedicadas("");
      await recargarDetalle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la actuación.");
    } finally {
      setPending(false);
    }
  }

  async function handleEliminarActuacion(id: string) {
    if (!confirm("¿Eliminar esta actuación?")) return;
    await eliminarActuacion(id);
    await recargarDetalle();
  }

  return (
    <div>
      <button onClick={onVolver} className="mb-4 text-xs font-semibold text-slate-400 hover:text-[#FD5249]">
        ← Volver al listado
      </button>

      <h2 className="mb-1 text-lg font-bold text-[#0B1D4D]">{expediente.alumnoNombre}</h2>
      <p className="mb-5 text-sm text-slate-500">{expediente.alumnoCurso} · Horas dedicadas: {expediente.horasDedicadas.toLocaleString("es-ES")} h</p>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-1 text-xs font-semibold text-slate-500">Diagnóstico / información</p>
        <p className="text-sm text-slate-700">{expediente.diagnostico}</p>
      </div>

      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
        <ClipboardList className="h-4 w-4 text-[#FD5249]" /> Registro de actuaciones
      </h3>

      {esPsicopedagoga && (
        <form onSubmit={handleNuevaActuacion} className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Con Quien</label>
            <select value={conQuien} onChange={(e) => setConQuien(e.target.value)} className={inputClass}>
              <option value="">Selecciona...</option>
              <option value="ALUMNO">Alumne</option>
              <option value="FAMILIA">Família</option>
              <option value="ALUMNO_FAMILIA">Alumne+família</option>
              <option value="TUTOR">Tutor</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Medio</label>
            <select value={medio} onChange={(e) => setMedio(e.target.value)} className={inputClass}>
              <option value="">Selecciona...</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="MAIL">Mail</option>
              <option value="TELEFONICA">Telefónica</option>
              <option value="APP_IMES">App iMes</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Horas dedicadas</label>
            <input type="number" min="0" step="0.25" value={horasDedicadas} onChange={(e) => setHorasDedicadas(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Información extra</label>
            <input value={informacionExtra} onChange={(e) => setInformacionExtra(e.target.value)} className={inputClass} />
          </div>
          {error && <p className="text-xs text-red-600 sm:col-span-6">{error}</p>}
          <button type="submit" disabled={pending} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60 sm:col-span-6">
            {pending ? <ButtonSpinner /> : <Plus className="h-4 w-4" />} Añadir actuación
          </button>
        </form>
      )}

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {actuaciones === null ? (
          <p className="px-4 py-8 text-center text-xs text-slate-400">Cargando...</p>
        ) : actuaciones.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay ninguna actuación registrada.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {actuaciones.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {new Date(a.fecha).toLocaleDateString("es-ES")} · {CON_QUIEN_ACTUACION_LABEL[a.conQuien] ?? a.conQuien} · {MEDIO_ACTUACION_LABEL[a.medio] ?? a.medio} · {a.horasDedicadas.toLocaleString("es-ES")} h
                  </p>
                  <p className="text-sm text-slate-700">{a.informacionExtra}</p>
                </div>
                {esPsicopedagoga && (
                  <button onClick={() => handleEliminarActuacion(a.id)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
        <Paperclip className="h-4 w-4 text-[#FD5249]" /> Documentos adjuntos
      </h3>
      {esPsicopedagoga && (
        <label className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]">
          {subiendoDocumento ? <ButtonSpinner /> : <Upload className="h-4 w-4" />} Subir documento
          <input type="file" onChange={handleSubirDocumento} disabled={subiendoDocumento} className="hidden" />
        </label>
      )}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {documentos === null ? (
          <p className="px-4 py-8 text-center text-xs text-slate-400">Cargando...</p>
        ) : documentos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay ningún documento adjunto.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {documentos.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:text-[#FD5249]">
                  {d.nombre}
                </a>
                <span className="shrink-0 text-xs text-slate-400">
                  {d.tamano ? `${Math.round(d.tamano / 1024)} KB · ` : ""}{new Date(d.createdAt).toLocaleDateString("es-ES")}
                </span>
                {esPsicopedagoga && (
                  <button onClick={() => handleEliminarDocumento(d.id)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
        <FileText className="h-4 w-4 text-[#FD5249]" /> Documentación del PI
      </h3>
      <PIDocumentoPanel
        alumnoPiId={expediente.id}
        alumnoNombre={expediente.alumnoNombre}
        alumnoCurso={expediente.alumnoCurso}
        tutorId={expediente.tutorId}
        tutorNombreReal={tutorNombreReal}
        fechaNacimientoAlumno={fechaNacimientoAlumno}
        documentoId={expediente.documentoId}
        currentUserId={currentUserId}
        esPsicopedagoga={esPsicopedagoga}
        esDirectorFijo={esDirectorFijo}
        profesoresDelCentro={profesoresDelCentro}
        cursoAcademicoCentro={cursoAcademicoCentro}
      />
    </div>
  );
}
