"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  Users,
  X,
  Phone,
  Mail,
  RefreshCw,
  MessageCircle,
  GraduationCap,
  Eye,
  Trash2,
  ClipboardCheck,
  ClipboardList,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import {
  TUTORIA_STATUS_LABELS,
  TUTORIA_STATUS_COLORS,
} from "../constants";
import {
  RIESGO_COLORS,
} from "./alumnoConstants";
import { deleteTutoriaAlumno, cerrarTutoria, deleteAlumno } from "./alumnoActions";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Contacto = { id: string; relacion: string; telefono: string | null; email: string | null };

type AlumnoRow = {
  id: string;
  nombre: string;
  curso: string;
  edad: number | null;
  riesgo: string;
  avatarUrl: string | null;
  profesorId: string;
  profesorName: string;
  createdAt: string;
  contactos: Contacto[];
};

type TutoriaRow = {
  id: string;
  sessionDate: string;
  studentName: string;
  cicloModulo: string | null;
  alumnoId: string | null;
  profesorId: string;
  profesorName: string;
  conQuien: string | null;
  medio: string | null;
  causa: string;
  status: string;
  notas: string | null;
  proximoSeguimiento: string | null;
};

type Profesor = { id: string; name: string };

type Stats = {
  tutoriasHoy: number;
  tutoriasHoyFamilia: number;
  tutoriasHoyAlumno: number;
  pendientesSeguimiento: number;
  alumnosConAlertas: number;
  profesoresActivos: number;
};

const PAGE_SIZE = 8;

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function CentroTutoriasClient({
  tutorias,
  alumnos,
  profesores,
  stats,
  schoolId,
  isSuperAdmin = false,
}: {
  tutorias: TutoriaRow[];
  alumnos: AlumnoRow[];
  profesores: Profesor[];
  stats: Stats;
  schoolId: string;
  isSuperAdmin?: boolean;
}) {
  const { locale } = useLocale();
  const [profesorFilter, setProfesorFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [cursoFilter, setCursoFilter] = useState("Todos");
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [viewingTutoria, setViewingTutoria] = useState<TutoriaRow | null>(null);
  const [cerrandoModo, setCerrandoModo] = useState(false);
  const [cerrarNotas, setCerrarNotas] = useState("");
  const [cerrarFecha, setCerrarFecha] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminPending, startAdminTransition] = useTransition();

  function handleAdminDeleteTutoria(id: string) {
    if (!confirm("¿Eliminar esta tutoría? No se puede deshacer.")) return;
    startAdminTransition(async () => {
      try {
        await deleteTutoriaAlumno(id);
        setViewingTutoria(null);
      } catch (e) {
        setAdminError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  function handleAdminCerrar(id: string) {
    if (!cerrarNotas.trim()) {
      setAdminError("Escribe un resumen de lo tratado en la sesión.");
      return;
    }
    const fd = new FormData();
    fd.set("id", id);
    fd.set("notas", cerrarNotas);
    if (cerrarFecha) fd.set("proximoSeguimiento", cerrarFecha);
    startAdminTransition(async () => {
      try {
        await cerrarTutoria(fd);
        setViewingTutoria(null);
        setCerrandoModo(false);
        setCerrarNotas("");
        setCerrarFecha("");
      } catch (e) {
        setAdminError(e instanceof Error ? e.message : "No se pudo cerrar la tutoría.");
      }
    });
  }
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [vistaResumen, setVistaResumen] = useState(false);

  const profesorActual = profesores.find((p) => p.id === profesorFilter) ?? null;

  const cursos = useMemo(() => Array.from(new Set(alumnos.map((a) => a.curso))).sort(), [alumnos]);

  const alumnosDelProfesor = useMemo(
    () => (profesorFilter ? alumnos.filter((a) => a.profesorId === profesorFilter) : alumnos),
    [alumnos, profesorFilter]
  );

  const alumnosFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return alumnosDelProfesor.filter((a) => {
      if (q && !a.nombre.toLowerCase().includes(q) && !a.curso.toLowerCase().includes(q)) return false;
      if (cursoFilter !== "Todos" && a.curso !== cursoFilter) return false;
      return true;
    });
  }, [alumnosDelProfesor, search, cursoFilter]);

  function contarPorTipo(alumnoId: string, tipo: "FAMILIA" | "ALUMNO" | "AMBOS") {
    return tutorias.filter((t) => t.alumnoId === alumnoId && t.conQuien === tipo).length;
  }

  // Resumen por alumno (solo Coordinación/Dirección/SuperAdmin, cuando hay un
  // profesor seleccionado): un alumno por fila, con sus totales de tutorías.
  const resumenAlumnos = useMemo(() => {
    if (!profesorActual) return [];
    return alumnosDelProfesor
      .map((a) => {
        const tutoriasAlumnoResumen = tutorias.filter((t) => t.alumnoId === a.id);
        const conFamilia = tutoriasAlumnoResumen.filter((t) => t.conQuien === "FAMILIA").length;
        const conAlumno = tutoriasAlumnoResumen.filter((t) => t.conQuien === "ALUMNO").length;
        const conAmbos = tutoriasAlumnoResumen.filter((t) => t.conQuien === "AMBOS").length;
        const ultima = tutoriasAlumnoResumen.sort(
          (x, y) => new Date(y.sessionDate).getTime() - new Date(x.sessionDate).getTime()
        )[0];
        return {
          alumno: a,
          conFamilia,
          conAlumno,
          conAmbos,
          total: tutoriasAlumnoResumen.length,
          ultima: ultima ? ultima.sessionDate : null,
        };
      })
      .sort((a, b) => a.alumno.nombre.localeCompare(b.alumno.nombre));
  }, [alumnosDelProfesor, tutorias, profesorActual]);

  const resumenStats = useMemo(() => {
    const conFamilia = resumenAlumnos.reduce((sum, r) => sum + r.conFamilia, 0);
    const conAlumno = resumenAlumnos.reduce((sum, r) => sum + r.conAlumno, 0);
    const conAmbos = resumenAlumnos.reduce((sum, r) => sum + r.conAmbos, 0);
    const total = resumenAlumnos.reduce((sum, r) => sum + r.total, 0);
    return { alumnosAsignados: resumenAlumnos.length, conFamilia, conAlumno, conAmbos, total };
  }, [resumenAlumnos]);

  const tutoriasFiltradas = useMemo(() => {
    const q = search.toLowerCase();
    return tutorias
      .filter((t) => {
        if (profesorFilter && t.profesorId !== profesorFilter) return false;
        if (q && !t.studentName.toLowerCase().includes(q) && !(t.cicloModulo ?? "").toLowerCase().includes(q))
          return false;
        if (estadoFilter !== "Todos" && t.status !== estadoFilter) return false;
        if (cursoFilter !== "Todos" && t.cicloModulo !== cursoFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  }, [tutorias, profesorFilter, search, estadoFilter, cursoFilter]);

  const tutoriasVisibles = tutoriasFiltradas.slice(0, visibleCount);

  const selectedAlumno = alumnos.find((a) => a.id === selectedAlumnoId) ?? null;
  const tutoriasAlumno = selectedAlumno
    ? tutorias
        .filter((t) => t.alumnoId === selectedAlumno.id)
        .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
    : [];
  const ultimaNota = tutoriasAlumno.find((t) => t.status === "COMPLETADA" && t.notas) ?? null;
  // La tutoría más reciente (ya viene ordenada por fecha desc) que tenga un
  // próximo seguimiento indicado — así siempre coincide con lo que se ve al
  // abrir esa tutoría con el icono del ojo.
  const proximoSeguimientoAlumno = tutoriasAlumno.find((t) => t.proximoSeguimiento) ?? null;

  const madre = selectedAlumno?.contactos.find((c) => c.relacion === "Madre");
  const padre = selectedAlumno?.contactos.find((c) => c.relacion === "Padre");

  function clearFilters() {
    setSearch("");
    setProfesorFilter("");
    setEstadoFilter("Todos");
    setCursoFilter("Todos");
    setVisibleCount(PAGE_SIZE);
    setVistaResumen(false);
  }

  return (
    <div>
      {/* Tarjetas de estadísticas */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Calendar className="h-5 w-5 text-[#2F6FED]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.statHoy")}</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.tutoriasHoy}</div>
            <div className="text-xs text-slate-400">
              {stats.tutoriasHoyFamilia} {translate(locale, "tutorias.conFamilia")} · {stats.tutoriasHoyAlumno} {translate(locale, "tutorias.conAlumno")}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.statPendientes")}</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.pendientesSeguimiento}</div>
            <div className="text-xs text-slate-400">{translate(locale, "tutorias.requierenAccion")}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.statAlertas")}</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.alumnosConAlertas}</div>
            <div className="text-xs text-slate-400">{translate(locale, "tutorias.riesgoMedioAlto")}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.statProfesoresActivos")}</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.profesoresActivos}</div>
            <div className="text-xs text-slate-400">{translate(locale, "tutorias.conTutoriasEsteMes")}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "tutorias.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
          />
        </div>

        <select
          value={profesorFilter}
          onChange={(e) => {
            setProfesorFilter(e.target.value);
            setSelectedAlumnoId(null);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="">{translate(locale, "tutorias.todosProfesores")}</option>
          {profesores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">{translate(locale, "tutorias.todosEstados")}</option>
          {Object.keys(TUTORIA_STATUS_LABELS).map((value) => (
            <option key={value} value={value}>
              {translate(locale, `status.${value}` as never)}
            </option>
          ))}
        </select>

        <select
          value={cursoFilter}
          onChange={(e) => setCursoFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">{translate(locale, "tutorias.todosCursos")}</option>
          {cursos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F6FED] hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {translate(locale, "tutorias.limpiarFiltros")}
        </button>

        <a
          href={`/api/tutorias/export?school=${schoolId}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <FileSpreadsheet className="h-4 w-4" /> {translate(locale, "tutorias.descargarExcel")}
        </a>

        {profesorActual && (
          <button
            onClick={() => setVistaResumen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
              vistaResumen
                ? "border-[#2F6FED] bg-blue-50 text-[#2F6FED]"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {vistaResumen ? translate(locale, "tutorias.verDetalle") : translate(locale, "tutorias.verResumenPorAlumno")}
          </button>
        )}
      </div>

      {/* 3 columnas: alumnos | tutorías | detalle */}
      {!(vistaResumen && profesorActual) && (
      <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
        {/* Columna 1: alumnos del profesor */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">
            {translate(locale, "tutorias.colAlumno")}s {profesorActual ? `de ${profesorActual.name}` : translate(locale, "tutorias.deCentro")} ({alumnosFiltrados.length})
          </h3>
          {alumnosFiltrados.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">{translate(locale, "tutorias.sinAlumnosFiltros")}</p>
          ) : (
            <div className="max-h-[600px] space-y-1 overflow-y-auto">
              {alumnosFiltrados.map((a) => {
                const conFamilia = contarPorTipo(a.id, "FAMILIA");
                const conAlumno = contarPorTipo(a.id, "ALUMNO");
                const conAmbos = contarPorTipo(a.id, "AMBOS");
                const total = conFamilia + conAlumno + conAmbos;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAlumnoId(a.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors ${
                      selectedAlumnoId === a.id ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100">
                      {a.avatarUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt={a.nombre} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-semibold text-slate-700"
                      >
                        {a.nombre}
                      </div>
                      <div className="text-xs text-slate-400">{a.curso}</div>
                    </div>
                    <span
                      title={translate(locale, "tutorias.totalTutorias")}
                      className="shrink-0 rounded-full bg-[#0B1D4D] px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      {total}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna 2: tabla de tutorías */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1D4D]">
              {translate(locale, "tutorias.title")} {profesorActual ? `(${profesorActual.name})` : translate(locale, "tutorias.deTodoElCentroParent")}
            </h3>
            <span className="text-xs text-slate-400">
              {translate(locale, "tutorias.mostrando")} {tutoriasVisibles.length} {translate(locale, "tutorias.de")} {tutoriasFiltradas.length}
            </span>
          </div>

          {tutoriasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              {translate(locale, "tutorias.sinTutoriasFiltros")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colFecha")}</th>
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colAlumno")}</th>
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colProfesor")}</th>
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colTipo")}</th>
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colEstado")}</th>
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colCausa")}</th>
                    <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colSeguimiento")}</th>
                    <th className="pb-2 font-medium">{translate(locale, "tutorias.colVer")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tutoriasVisibles.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => t.alumnoId && setSelectedAlumnoId(t.alumnoId)}
                      className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-600">{fmtFecha(t.sessionDate)}</div>
                        <div className="text-[11px] text-slate-400">{fmtHora(t.sessionDate)}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-700">
                          {t.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400">{t.cicloModulo}</div>
                      </td>
                      <td className="py-3 pr-3 text-slate-500">
                        {t.profesorName}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          {t.conQuien === "FAMILIA" && <Users className="h-3 w-3" />}
                          {t.conQuien === "ALUMNO" && <GraduationCap className="h-3 w-3" />}
                          {t.conQuien === "AMBOS" && (
                            <span className="flex items-center gap-0.5">
                              <Users className="h-3 w-3" />
                              <GraduationCap className="h-3 w-3" />
                            </span>
                          )}
                          {t.conQuien ? translate(locale, `conQuien.${t.conQuien}` as never) : "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TUTORIA_STATUS_COLORS[t.status]}`}
                        >
                          {translate(locale, `status.${t.status}` as never)}
                        </span>
                      </td>
                      <td className="max-w-[220px] py-3 pr-3 text-slate-500">
                        <span className="line-clamp-2">{t.causa || "—"}</span>
                      </td>
                      <td className="py-3 pr-3 text-slate-500">
                        {t.proximoSeguimiento ? fmtFecha(t.proximoSeguimiento) : "—"}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingTutoria(t);
                          }}
                          title={translate(locale, "tutorias.verResumenCompleto")}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#2F6FED]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleCount < tutoriasFiltradas.length && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#2F6FED] hover:bg-blue-50"
                  >
                    Cargar más
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna 3: detalle del alumno seleccionado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!selectedAlumno ? (
            <div className="flex h-full min-h-[300px] items-center justify-center text-center text-xs text-slate-400">
              {translate(locale, "tutorias.seleccionaFicha")}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1D4D]">Detalle del alumno</h3>
                <div className="flex items-center gap-1.5">
                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        if (
                          !confirm(
                            `¿Eliminar a ${selectedAlumno.nombre}? Se borrarán también todas sus tutorías. Esta acción no se puede deshacer.`
                          )
                        )
                          return;
                        startAdminTransition(async () => {
                          try {
                            await deleteAlumno(selectedAlumno.id);
                            setSelectedAlumnoId(null);
                          } catch (e) {
                            setAdminError(e instanceof Error ? e.message : "No se pudo eliminar.");
                          }
                        });
                      }}
                      disabled={adminPending}
                      title={translate(locale, "tutorias.eliminarAlumno")}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlumnoId(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {selectedAlumno.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedAlumno.avatarUrl}
                      alt={selectedAlumno.nombre}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="truncate text-sm font-bold text-[#0B1D4D]"
                  >
                    {selectedAlumno.nombre}
                  </div>
                  <div className="text-xs text-slate-400">
                    {selectedAlumno.curso}
                    {selectedAlumno.edad ? ` · ${selectedAlumno.edad} años` : ""}
                  </div>
                </div>
              </div>

              <span
                className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${RIESGO_COLORS[selectedAlumno.riesgo]}`}
              >
                {translate(locale, `riesgo.${selectedAlumno.riesgo}` as never)}
              </span>

              <div className="mt-3 space-y-0.5 text-xs text-slate-500">
                <div>
                  Tutor/a: <span className="font-medium text-slate-700">{selectedAlumno.profesorName}</span>
                </div>
                <div>Desde {fmtFecha(selectedAlumno.createdAt)}</div>
              </div>

              {ultimaNota && (
                <div className="mt-4">
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Última nota
                  </h4>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MessageCircle className="h-3 w-3" />
                      {fmtFecha(ultimaNota.sessionDate)} ·{" "}
                      {ultimaNota.conQuien ? translate(locale, `conQuien.${ultimaNota.conQuien}` as never) : "—"}
                    </div>
                    <p className="whitespace-pre-wrap">{ultimaNota.notas}</p>
                  </div>
                  <button
                    onClick={() => setSearch(selectedAlumno.nombre)}
                    className="mt-1.5 text-[11px] font-semibold text-[#2F6FED] hover:underline"
                  >
                    Ver todas las notas en la tabla →
                  </button>
                </div>
              )}

              {(madre || padre) && (
                <div className="mt-4">
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Contactos de la familia
                  </h4>
                  <div className="space-y-2">
                    {[madre, padre].filter(Boolean).map((c) => (
                      <div key={c!.relacion} className="text-xs">
                        <div className="font-medium text-slate-600">{c!.relacion}</div>
                        {c!.telefono && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="h-3 w-3" /> {c!.telefono}
                          </div>
                        )}
                        {c!.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="h-3 w-3" /> {c!.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {translate(locale, "tutorias.resumenTutorias")}
                </h4>
                <div className="rounded-lg bg-blue-50 p-2.5 text-center">
                  <div className="text-xl font-bold text-[#0B1D4D]">{tutoriasAlumno.length}</div>
                  <div className="text-[10px] font-medium text-slate-500">{translate(locale, "tutorias.totalTutorias")}</div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <div className="text-base font-bold text-[#0B1D4D]">
                      {contarPorTipo(selectedAlumno.id, "FAMILIA")}
                    </div>
                    <div className="text-[9px] leading-tight text-slate-400">{translate(locale, "tutorias.conFamiliaLabel")}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <div className="text-base font-bold text-[#0B1D4D]">
                      {contarPorTipo(selectedAlumno.id, "ALUMNO")}
                    </div>
                    <div className="text-[9px] leading-tight text-slate-400">{translate(locale, "tutorias.conAlumnoLabel")}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <div className="text-base font-bold text-[#0B1D4D]">
                      {contarPorTipo(selectedAlumno.id, "AMBOS")}
                    </div>
                    <div className="text-[9px] leading-tight text-slate-400">{translate(locale, "conQuien.AMBOS")}</div>
                  </div>
                </div>

                <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-[13px] font-bold text-[#0B1D4D]">
                    {proximoSeguimientoAlumno?.proximoSeguimiento
                      ? fmtFecha(proximoSeguimientoAlumno.proximoSeguimiento)
                      : "—"}
                  </div>
                  <div className="text-[10px] text-slate-400">{translate(locale, "tutorias.proximoSeguimiento")}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Vista resumen por alumno: solo Coordinación/Dirección/SuperAdmin,
          cuando hay un profesor seleccionado. No sustituye nada de lo de
          arriba, es una vista alternativa que se activa con el botón. */}
      {vistaResumen && profesorActual && (
        <div>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-[#2F6FED]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.alumnosAsignados")}</div>
                <div className="text-2xl font-bold text-[#0B1D4D]">{resumenStats.alumnosAsignados}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.tutoriasConFamilias")}</div>
                <div className="text-2xl font-bold text-[#0B1D4D]">{resumenStats.conFamilia}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-[#2F6FED]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.tutoriasConAlumnos")}</div>
                <div className="text-2xl font-bold text-[#0B1D4D]">{resumenStats.conAlumno}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.tutoriasConAmbosStat")}</div>
                <div className="text-2xl font-bold text-[#0B1D4D]">{resumenStats.conAmbos}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <ClipboardList className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{translate(locale, "tutorias.totalTutorias")}</div>
                <div className="text-2xl font-bold text-[#0B1D4D]">{resumenStats.total}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {resumenAlumnos.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">
                {translate(locale, "tutorias.sinAlumnosFiltros")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colAlumno")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.cursoGrupo")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.colProfesor")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.tutoriasConFamilia")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.tutoriasConAlumno")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.tutoriasConAmbos")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.totalTutorias")}</th>
                      <th className="pb-2 pr-3 font-medium">{translate(locale, "tutorias.ultimaTutoria")}</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {resumenAlumnos.map((r) => (
                      <tr
                        key={r.alumno.id}
                        onClick={() => {
                          setSelectedAlumnoId(r.alumno.id);
                          setVistaResumen(false);
                        }}
                        className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                              {r.alumno.avatarUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={r.alumno.avatarUrl}
                                  alt={r.alumno.nombre}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <span
                              className="font-semibold text-slate-700"
                            >
                              {r.alumno.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-slate-500">{r.alumno.curso}</td>
                        <td className="py-3 pr-3 text-slate-500">{r.alumno.profesorName}</td>
                        <td className="py-3 pr-3 font-semibold text-[#2F6FED]">{r.conFamilia}</td>
                        <td className="py-3 pr-3 font-semibold text-emerald-600">{r.conAlumno}</td>
                        <td className="py-3 pr-3 font-semibold text-violet-600">{r.conAmbos}</td>
                        <td className="py-3 pr-3 font-bold text-[#0B1D4D]">{r.total}</td>
                        <td className="py-3 pr-3 text-slate-400">{r.ultima ? fmtFecha(r.ultima) : "—"}</td>
                        <td className="py-3 text-right text-slate-300">›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-slate-400">
                  {translate(locale, "tutorias.mostrandoAlumnosAsignados")
                    .replace("{count}", String(resumenAlumnos.length))
                    .replace("{nombre}", profesorActual.name)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: ver el resumen completo de una tutoría (solo lectura) */}
      {viewingTutoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {translate(locale, "tutorias.tutoriaDe")} {viewingTutoria.studentName}
              </h2>
              <button
                onClick={() => setViewingTutoria(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <span
              className={`mb-4 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${TUTORIA_STATUS_COLORS[viewingTutoria.status]}`}
            >
              {translate(locale, `status.${viewingTutoria.status}` as never)}
            </span>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.colFecha")}</div>
                  <div className="text-slate-700">
                    {fmtFecha(viewingTutoria.sessionDate)} · {fmtHora(viewingTutoria.sessionDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.colProfesor")}</div>
                  <div className="text-slate-700">{viewingTutoria.profesorName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.conQuienLabel")}</div>
                  <div className="text-slate-700">
                    {viewingTutoria.conQuien ? translate(locale, `conQuien.${viewingTutoria.conQuien}` as never) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.proximoSeguimiento")}</div>
                  <div className="text-slate-700">
                    {viewingTutoria.proximoSeguimiento ? fmtFecha(viewingTutoria.proximoSeguimiento) : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.colCausa")}</div>
                <div className="text-slate-700">{viewingTutoria.causa || "—"}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">{translate(locale, "tutorias.resumenTutoriaLabel")}</div>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
                  {viewingTutoria.notas || translate(locale, "tutorias.tutoriaNoCerrada")}
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {adminError && (
                  <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    {adminError}
                  </div>
                )}

                {cerrandoModo ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        {translate(locale, "tutorias.resumenTutoriaLabel")}
                      </label>
                      <textarea
                        value={cerrarNotas}
                        onChange={(e) => setCerrarNotas(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder={translate(locale, "tutorias.resumenPlaceholder")}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        {translate(locale, "tutorias.proximoSeguimientoOpcional")}
                      </label>
                      <input
                        type="date"
                        value={cerrarFecha}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setCerrarFecha(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setCerrandoModo(false)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {translate(locale, "common.cancelar")}
                      </button>
                      <button
                        onClick={() => handleAdminCerrar(viewingTutoria.id)}
                        disabled={adminPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {adminPending ? translate(locale, "common.guardando") : translate(locale, "tutorias.guardarYCompletar")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    {viewingTutoria.status === "PENDIENTE" ? (
                      <button
                        onClick={() => setCerrandoModo(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" /> {translate(locale, "tutorias.cerrarTutoria")}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">{translate(locale, "tutorias.tutoriaYaCompletada")}</span>
                    )}
                    <button
                      onClick={() => handleAdminDeleteTutoria(viewingTutoria.id)}
                      disabled={adminPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {translate(locale, "tutorias.eliminarTutoria")}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  setViewingTutoria(null);
                  setCerrandoModo(false);
                  setAdminError(null);
                }}
                className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
              >
                {translate(locale, "common.cerrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
