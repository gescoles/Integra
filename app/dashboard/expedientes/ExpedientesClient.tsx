"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  FileDown,
  Unlock,
  CheckCircle2,
  Flag,
  ChevronRight,
  ChevronDown,
  Calendar,
  MapPin,
  Users,
  Trash2,
  Eye,
  Mail,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { cambiarEstadoIncidencia, eliminarIncidencia } from "./actions";
import { IncidenciaFormModal } from "./IncidenciaFormModal";
import { ExpedienteFormModal } from "./ExpedienteFormModal";
import { EnviarExpedienteButton } from "./EnviarExpedienteButton";
import { EnviarResumenIncidenciaButton } from "./EnviarResumenIncidenciaButton";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Evento = { id: string; tipo: string; descripcion: string; autorNombre: string; createdAt: string };
type ExpedienteRow = {
  id: string;
  numero: string;
  estado: string;
  fechaInicio: string;
  fets: string;
  testimonis: string;
  informeTutor: string;
  audienciaResumen: string;
  valoracionComision: string;
  medidasProvisionales: string;
  sancionDias: number;
  sancionMotivo: string;
  fechaAplicacionInicio: string;
  fechaAplicacionFin: string;
  recursoEstado: string;
  direccionNombre: string;
  coordinadorNombre: string;
  enviadoEn: string | null;
};
type Row = {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  alumnoCurso: string;
  alumnoAvatarUrl: string | null;
  creadorId: string;
  creadorNombre: string;
  tutorId: string;
  tutorNombre: string;
  tipoIncidencia: string;
  prioridad: string;
  estado: string;
  fecha: string;
  lugar: string | null;
  descripcion: string;
  observaciones: string | null;
  medidasAplicadas: string | null;
  familiaInformada: boolean;
  familiaInformadaFecha: string | null;
  familiaInformadaComunicacion: string | null;
  expedientes: ExpedienteRow[];
  createdAt: string;
  eventos: Evento[];
};
type AlumnoOption = { id: string; nombre: string; curso: string; avatarUrl: string | null };
type ProfesorOption = { id: string; name: string };

const PRIORIDAD_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  ALTA: { label: "Alta", dot: "bg-red-500", text: "text-red-600" },
  MEDIA: { label: "Media", dot: "bg-amber-500", text: "text-amber-600" },
  BAJA: { label: "Baja", dot: "bg-emerald-500", text: "text-emerald-600" },
};

const ESTADO_CONFIG: Record<string, { label: string; badge: string }> = {
  ABIERTA: { label: "Abierta", badge: "bg-amber-50 text-amber-600" },
  EN_SEGUIMIENTO: { label: "En seguimiento", badge: "bg-blue-50 text-[#FD5249]" },
  CERRADA: { label: "Cerrada", badge: "bg-emerald-50 text-emerald-600" },
};

function tiempoRelativo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `Hoy, ${new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hoy, ${new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return `Ayer, ${new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

export function ExpedientesClient({
  rows,
  alumnos,
  profesores,
  currentUserId,
  esDirectivo,
}: {
  rows: Row[];
  alumnos: AlumnoOption[];
  profesores: ProfesorOption[];
  currentUserId: string;
  esDirectivo: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"TODAS" | "ABIERTA" | "EN_SEGUIMIENTO" | "CERRADA">("TODAS");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(rows[0]?.id ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date().toDateString();
  const ayer = new Date(Date.now() - 86400000).toDateString();
  const totalHoy = rows.filter((r) => new Date(r.createdAt).toDateString() === hoy).length;
  const totalAyer = rows.filter((r) => new Date(r.createdAt).toDateString() === ayer).length;
  const abiertas = rows.filter((r) => r.estado === "ABIERTA").length;
  const cerradas = rows.filter((r) => r.estado === "CERRADA").length;
  const altaPrioridad = rows.filter((r) => r.prioridad === "ALTA" && r.estado !== "CERRADA").length;
  const total = rows.length || 1;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (tab !== "TODAS" && r.estado !== tab) return false;
      if (q && !r.alumnoNombre.toLowerCase().includes(q) && !r.alumnoCurso.toLowerCase().includes(q) && !r.tipoIncidencia.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, tab]);

  // Conteo TOTAL de incidencias por alumno (sin filtrar), para saber cuándo
  // se ha llegado a 3 y activar la opción de parte/expulsión.
  const totalPorAlumno = useMemo(() => {
    const mapa = new Map<string, number>();
    rows.forEach((r) => mapa.set(r.alumnoId, (mapa.get(r.alumnoId) ?? 0) + 1));
    return mapa;
  }, [rows]);

  // Agrupamos la lista filtrada por alumno, para poder desplegar sus
  // incidencias cuando tiene más de una.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Row[]>();
    filtered.forEach((r) => {
      if (!mapa.has(r.alumnoId)) mapa.set(r.alumnoId, []);
      mapa.get(r.alumnoId)!.push(r);
    });
    return Array.from(mapa.values());
  }, [filtered]);

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  function toggleExpandido(alumnoId: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(alumnoId)) next.delete(alumnoId);
      else next.add(alumnoId);
      return next;
    });
  }

  const seleccionada = rows.find((r) => r.id === seleccionadaId) ?? filtered[0] ?? null;

  function handleCambiarEstado(estado: "EN_SEGUIMIENTO" | "CERRADA" | "ABIERTA") {
    if (!seleccionada) return;
    setError(null);
    setPending(true);
    cambiarEstadoIncidencia(seleccionada.id, estado)
      .then(() => router.refresh())
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo actualizar."))
      .finally(() => setPending(false));
  }

  function handleEliminar() {
    if (!seleccionada) return;
    if (!confirm(translate(locale, "expedientes.confirmEliminar"))) return;
    setPending(true);
    eliminarIncidencia(seleccionada.id)
      .then(() => {
        setSeleccionadaId(null);
        router.refresh();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo eliminar."))
      .finally(() => setPending(false));
  }

  const puedeGestionarSeleccionada =
    !!seleccionada && (esDirectivo || seleccionada.tutorId === currentUserId || seleccionada.creadorId === currentUserId);

  return (
    <div>
      {/* Estadísticas */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <FileText className="h-4 w-4 text-[#FD5249]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{totalHoy}</div>
          <div className="text-xs text-slate-400">{translate(locale, "expedientes.totalHoy")}</div>
          <span className="mt-1 inline-block text-[10px] font-semibold text-slate-400">
            {totalHoy - totalAyer >= 0 ? "+" : ""}
            {totalHoy - totalAyer} {translate(locale, "expedientes.vsAyer")}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <Unlock className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{abiertas}</div>
          <div className="text-xs text-slate-400">{translate(locale, "expedientes.abiertas")}</div>
          <span className="mt-1 inline-block text-[10px] font-semibold text-slate-400">
            {Math.round((abiertas / total) * 100)}% {translate(locale, "expedientes.delTotal")}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
            <CheckCircle2 className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{cerradas}</div>
          <div className="text-xs text-slate-400">{translate(locale, "expedientes.resueltas")}</div>
          <span className="mt-1 inline-block text-[10px] font-semibold text-slate-400">
            {Math.round((cerradas / total) * 100)}% {translate(locale, "expedientes.delTotal")}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <Flag className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{altaPrioridad}</div>
          <div className="text-xs text-slate-400">{translate(locale, "expedientes.altaPrioridad")}</div>
          {altaPrioridad > 0 && (
            <span className="mt-1 inline-block text-[10px] font-semibold text-red-500">{translate(locale, "expedientes.requierenAtencion")}</span>
          )}
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <IncidenciaFormModal alumnos={alumnos} profesores={profesores} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Lista */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translate(locale, "expedientes.buscarPlaceholder")}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <div className="mb-3 flex gap-1 overflow-x-auto text-xs">
            {(["TODAS", "ABIERTA", "EN_SEGUIMIENTO", "CERRADA"] as const).map((t) => {
              const count = t === "TODAS" ? rows.length : rows.filter((r) => r.estado === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 font-semibold ${
                    tab === t ? "bg-[#FD5249] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t === "TODAS" ? translate(locale, "expedientes.todas") : ESTADO_CONFIG[t].label} {count}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-14 text-center text-sm text-slate-400">
              {translate(locale, "expedientes.sinIncidencias")}
            </div>
          ) : (
            <div className="max-h-[600px] space-y-1.5 overflow-y-auto">
              {grupos.map((grupo) => {
                const primera = grupo[0];
                const totalAlumno = totalPorAlumno.get(primera.alumnoId) ?? grupo.length;
                const varias = grupo.length > 1;
                const expandido = expandidos.has(primera.alumnoId);
                const filasAMostrar = varias && !expandido ? [] : grupo;

                return (
                  <div key={primera.alumnoId}>
                    <button
                      onClick={() => (varias ? toggleExpandido(primera.alumnoId) : setSeleccionadaId(primera.id))}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${
                        !varias && seleccionada?.id === primera.id ? "border-[#FD5249] bg-blue-50/50" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {primera.alumnoAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={primera.alumnoAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          primera.alumnoNombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-700">{primera.alumnoNombre}</span>
                          {totalAlumno >= 3 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                              <ShieldAlert className="h-2.5 w-2.5" /> {totalAlumno}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{primera.alumnoCurso}</div>
                        {!varias && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs">
                            <span className={`h-1.5 w-1.5 rounded-full ${PRIORIDAD_CONFIG[primera.prioridad].dot}`} />
                            <span className="truncate text-slate-500">{primera.tipoIncidencia}</span>
                          </div>
                        )}
                        {varias && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {grupo.length} {translate(locale, "expedientes.incidenciasPlural")}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {varias ? (
                          expandido ? <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-300" /> : <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
                        ) : (
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
                        )}
                        <div className="mt-1 text-[10px] text-slate-400">{tiempoRelativo(primera.createdAt)}</div>
                      </div>
                    </button>

                    {varias && expandido && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-slate-100 pl-3">
                        {filasAMostrar.map((r) => {
                          const prio = PRIORIDAD_CONFIG[r.prioridad];
                          const activa = seleccionada?.id === r.id;
                          return (
                            <button
                              key={r.id}
                              onClick={() => setSeleccionadaId(r.id)}
                              className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left ${
                                activa ? "border-[#FD5249] bg-blue-50/50" : "border-transparent hover:bg-slate-50"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${prio.dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-slate-600">{r.tipoIncidencia}</div>
                                <div className={`text-[10px] font-semibold ${ESTADO_CONFIG[r.estado].badge.replace("bg-", "text-").split(" ")[0]}`}>
                                  {ESTADO_CONFIG[r.estado].label}
                                </div>
                              </div>
                              <div className="shrink-0 text-[10px] text-slate-400">{tiempoRelativo(r.createdAt)}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 text-center text-xs text-slate-400">
            {translate(locale, "tutorias.mostrando")} {filtered.length} {translate(locale, "tutorias.de")} {rows.length}
          </div>
        </div>

        {/* Detalle */}
        {!seleccionada ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-sm text-slate-400">
            {translate(locale, "expedientes.eligeUna")}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">
                {translate(locale, "expedientes.incidencia")} #{seleccionada.id.slice(-8).toUpperCase()}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORIDAD_CONFIG[seleccionada.prioridad].text} bg-slate-50`}>
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORIDAD_CONFIG[seleccionada.prioridad].dot}`} />
                {translate(locale, "expedientes.prioridadLabel")} {PRIORIDAD_CONFIG[seleccionada.prioridad].label}
              </span>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                  {seleccionada.alumnoAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={seleccionada.alumnoAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    seleccionada.alumnoNombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{seleccionada.alumnoNombre}</div>
                  <div className="text-xs text-slate-400">{seleccionada.alumnoCurso}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.tutorResponsable")}</div>
                <div className="text-sm text-slate-600">{seleccionada.tutorNombre}</div>
              </div>
              <div className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_CONFIG[seleccionada.estado].badge}`}>
                {ESTADO_CONFIG[seleccionada.estado].label}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.tipoIncidencia")}</div>
                <div className="text-slate-700">{seleccionada.tipoIncidencia}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.fecha")}</div>
                  <div className="text-slate-700">{new Date(seleccionada.fecha).toLocaleString("es-ES")}</div>
                </div>
              </div>
              {seleccionada.lugar && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.lugar")}</div>
                    <div className="text-slate-700">{seleccionada.lugar}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.creadoPor")}</div>
                  <div className="text-slate-700">{seleccionada.creadorNombre}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.descripcion")}</div>
                <p className="text-sm text-slate-600">{seleccionada.descripcion}</p>
              </div>
              {seleccionada.observaciones && (
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.observaciones")}</div>
                  <p className="text-sm text-slate-600">{seleccionada.observaciones}</p>
                </div>
              )}
              {seleccionada.medidasAplicadas && (
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.medidasAplicadas")}</div>
                  <p className="text-sm text-slate-600">{seleccionada.medidasAplicadas}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "expedientes.familiaInformada")}:</div>
                {seleccionada.familiaInformada ? (
                  <span className="text-xs font-semibold text-emerald-600">
                    {translate(locale, "expedientes.si")}
                    {seleccionada.familiaInformadaComunicacion && ` · ${seleccionada.familiaInformadaComunicacion}`}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">{translate(locale, "expedientes.no")}</span>
                )}
              </div>
            </div>

            {/* Aviso de 3+ incidencias: siempre visible a partir de la 3ª,
                pero ya NO es lo único que permite abrir un expediente. */}
            {(totalPorAlumno.get(seleccionada.alumnoId) ?? 0) >= 3 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-600">
                  <ShieldAlert className="h-3.5 w-3.5" /> {translate(locale, "expedientes.avisoTresIncidencias")}
                </div>
                {esDirectivo && (
                  <div className="mt-2">
                    <IncidenciaFormModal
                      alumnos={alumnos}
                      profesores={profesores}
                      alumnoFijo={{
                        id: seleccionada.alumnoId,
                        nombre: seleccionada.alumnoNombre,
                        curso: seleccionada.alumnoCurso,
                        avatarUrl: seleccionada.alumnoAvatarUrl,
                      }}
                      etiquetaBoton={translate(locale, "expedientes.anadirOtraIncidencia")}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Expedientes: Coordinación/Dirección/SuperAdmin pueden abrir
                uno cuando quieran, sin depender de llegar a las 3
                incidencias. El resto de roles solo ven los que ya existan
                (para descargarlos), sin poder crear ninguno. */}
            {(esDirectivo || seleccionada.expedientes.length > 0) && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <ShieldAlert className="h-3.5 w-3.5" /> {translate(locale, "expedientes.expedientesTitulo")}
                </div>

                {seleccionada.expedientes.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {seleccionada.expedientes.map((exp) => (
                      <div key={exp.id} className="rounded-lg border border-white bg-white/70 p-3">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">Exp. {exp.numero}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                exp.estado === "ENVIADO" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              {exp.estado === "ENVIADO" ? translate(locale, "expedientes.enviado") : translate(locale, "expedientes.borrador")}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {translate(locale, "expedientes.expulsionDe")} {exp.sancionDias} {translate(locale, "expedientes.dias")}
                          </span>
                        </div>
                        <p className="mb-2 text-xs text-slate-500">{exp.sancionMotivo}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/api/expedientes/pdf?id=${exp.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <FileDown className="h-3 w-3" /> PDF
                          </a>
                          <a
                            href={`/api/expedientes/docx?id=${exp.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <FileText className="h-3 w-3" /> Word
                          </a>
                          {esDirectivo && exp.estado !== "ENVIADO" && (
                            <>
                              <ExpedienteFormModal
                                incidenciaId={seleccionada.id}
                                descripcionInicial={seleccionada.descripcion}
                                expediente={exp}
                              />
                              <EnviarExpedienteButton expedienteId={exp.id} />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {esDirectivo && (
                  <ExpedienteFormModal
                    incidenciaId={seleccionada.id}
                    descripcionInicial={seleccionada.descripcion}
                    modoCrear={seleccionada.expedientes.length > 0}
                  />
                )}
              </div>
            )}

            {/* Historial */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Clock className="h-3.5 w-3.5" /> {translate(locale, "expedientes.historial")}
              </div>
              <div className="space-y-3">
                {seleccionada.eventos.map((ev) => (
                  <div key={ev.id} className="flex gap-2.5">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#FD5249]" />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-600">{ev.descripcion}</div>
                      <div className="text-slate-400">
                        {translate(locale, "expedientes.por")} {ev.autorNombre} · {new Date(ev.createdAt).toLocaleString("es-ES")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            {puedeGestionarSeleccionada && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <IncidenciaFormModal
                  alumnos={alumnos}
                  profesores={profesores}
                  alumnoFijo={{ id: seleccionada.alumnoId, nombre: seleccionada.alumnoNombre, curso: seleccionada.alumnoCurso, avatarUrl: seleccionada.alumnoAvatarUrl }}
                  incidencia={{
                    id: seleccionada.id,
                    tutorId: seleccionada.tutorId,
                    tipoIncidencia: seleccionada.tipoIncidencia,
                    prioridad: seleccionada.prioridad,
                    fecha: seleccionada.fecha,
                    lugar: seleccionada.lugar,
                    descripcion: seleccionada.descripcion,
                    observaciones: seleccionada.observaciones,
                    medidasAplicadas: seleccionada.medidasAplicadas,
                    familiaInformada: seleccionada.familiaInformada,
                    familiaInformadaComunicacion: seleccionada.familiaInformadaComunicacion,
                  }}
                />
                {seleccionada.estado !== "EN_SEGUIMIENTO" && seleccionada.estado !== "CERRADA" && (
                  <button
                    onClick={() => handleCambiarEstado("EN_SEGUIMIENTO")}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-[#FD5249] hover:bg-blue-50 disabled:opacity-60"
                  >
                    <Eye className="h-3.5 w-3.5" /> {translate(locale, "expedientes.marcarSeguimiento")}
                  </button>
                )}
                {seleccionada.estado !== "CERRADA" ? (
                  <button
                    onClick={() => handleCambiarEstado("CERRADA")}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {translate(locale, "expedientes.cerrarIncidencia")}
                  </button>
                ) : (
                  esDirectivo && (
                    <button
                      onClick={() => handleCambiarEstado("ABIERTA")}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {translate(locale, "expedientes.reabrir")}
                    </button>
                  )
                )}
                {seleccionada.estado === "CERRADA" && (
                  <EnviarResumenIncidenciaButton incidenciaId={seleccionada.id} />
                )}
                {esDirectivo && (
                  <button
                    onClick={handleEliminar}
                    disabled={pending}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
