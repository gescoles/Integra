"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import {
  TUTORIA_STATUS_LABELS,
  TUTORIA_STATUS_COLORS,
} from "../constants";
import {
  RIESGO_LABELS,
  RIESGO_COLORS,
  CON_QUIEN_LABELS,
} from "./alumnoConstants";

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
}: {
  tutorias: TutoriaRow[];
  alumnos: AlumnoRow[];
  profesores: Profesor[];
  stats: Stats;
}) {
  const [profesorFilter, setProfesorFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [cursoFilter, setCursoFilter] = useState("Todos");
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  function contarPorTipo(alumnoId: string, tipo: "FAMILIA" | "ALUMNO") {
    return tutorias.filter((t) => t.alumnoId === alumnoId && t.conQuien === tipo).length;
  }

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
  const ultimaNota = tutoriasAlumno[0] ?? null;
  const proximoSeguimientoAlumno = tutoriasAlumno
    .filter((t) => t.proximoSeguimiento)
    .sort((a, b) => new Date(a.proximoSeguimiento!).getTime() - new Date(b.proximoSeguimiento!).getTime())[0];

  const madre = selectedAlumno?.contactos.find((c) => c.relacion === "Madre");
  const padre = selectedAlumno?.contactos.find((c) => c.relacion === "Padre");

  function clearFilters() {
    setSearch("");
    setProfesorFilter("");
    setEstadoFilter("Todos");
    setCursoFilter("Todos");
    setVisibleCount(PAGE_SIZE);
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
            <div className="text-xs font-semibold text-slate-500">Tutorías hoy</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.tutoriasHoy}</div>
            <div className="text-xs text-slate-400">
              {stats.tutoriasHoyFamilia} con familia · {stats.tutoriasHoyAlumno} con alumno
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Pendientes de seguimiento</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.pendientesSeguimiento}</div>
            <div className="text-xs text-slate-400">Requieren acción</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Alumnos con alertas</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.alumnosConAlertas}</div>
            <div className="text-xs text-slate-400">Riesgo medio o alto</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Profesores activos</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{stats.profesoresActivos}</div>
            <div className="text-xs text-slate-400">Con tutorías este mes</div>
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
            placeholder="Buscar por alumno, curso o palabra clave..."
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
          <option value="">Todos los profesores</option>
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
          <option value="Todos">Todos los estados</option>
          {Object.entries(TUTORIA_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={cursoFilter}
          onChange={(e) => setCursoFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">Todos los cursos / ciclos</option>
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
          <RefreshCw className="h-3.5 w-3.5" /> Limpiar filtros
        </button>
      </div>

      {/* 3 columnas: alumnos | tutorías | detalle */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
        {/* Columna 1: alumnos del profesor */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">
            Alumnos {profesorActual ? `de ${profesorActual.name}` : "de todo el centro"} ({alumnosFiltrados.length})
          </h3>
          {alumnosFiltrados.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Sin alumnos con estos filtros.</p>
          ) : (
            <div className="max-h-[600px] space-y-1 overflow-y-auto">
              {alumnosFiltrados.map((a) => {
                const conFamilia = contarPorTipo(a.id, "FAMILIA");
                const conAlumno = contarPorTipo(a.id, "ALUMNO");
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
                      <div className="truncate text-sm font-semibold text-slate-700">{a.nombre}</div>
                      <div className="text-xs text-slate-400">{a.curso}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                        {conFamilia}
                      </span>
                      <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#2F6FED]">
                        {conAlumno}
                      </span>
                    </div>
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
              Tutorías {profesorActual ? `(${profesorActual.name})` : "(todo el centro)"}
            </h3>
            <span className="text-xs text-slate-400">
              Mostrando {tutoriasVisibles.length} de {tutoriasFiltradas.length}
            </span>
          </div>

          {tutoriasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              No hay tutorías que coincidan con estos filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Alumno</th>
                    <th className="pb-2 pr-3 font-medium">Profesor</th>
                    <th className="pb-2 pr-3 font-medium">Tipo</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium">Nota breve</th>
                    <th className="pb-2 font-medium">Seguimiento</th>
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
                        <div className="font-semibold text-slate-700">{t.studentName}</div>
                        <div className="text-[11px] text-slate-400">{t.cicloModulo}</div>
                      </td>
                      <td className="py-3 pr-3 text-slate-500">{t.profesorName}</td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          {t.conQuien === "FAMILIA" ? (
                            <Users className="h-3 w-3" />
                          ) : (
                            <GraduationCap className="h-3 w-3" />
                          )}
                          {t.conQuien ? CON_QUIEN_LABELS[t.conQuien] : "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TUTORIA_STATUS_COLORS[t.status]}`}
                        >
                          {TUTORIA_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="max-w-[220px] py-3 pr-3 text-slate-500">
                        <span className="line-clamp-2">{t.notas ?? "—"}</span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {t.proximoSeguimiento ? fmtFecha(t.proximoSeguimiento) : "—"}
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
              Selecciona un alumno de la lista o de la tabla para ver su ficha.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1D4D]">Detalle del alumno</h3>
                <button
                  onClick={() => setSelectedAlumnoId(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
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
                  <div className="truncate text-sm font-bold text-[#0B1D4D]">{selectedAlumno.nombre}</div>
                  <div className="text-xs text-slate-400">
                    {selectedAlumno.curso}
                    {selectedAlumno.edad ? ` · ${selectedAlumno.edad} años` : ""}
                  </div>
                </div>
              </div>

              <span
                className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${RIESGO_COLORS[selectedAlumno.riesgo]}`}
              >
                {RIESGO_LABELS[selectedAlumno.riesgo]}
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
                      {ultimaNota.conQuien ? CON_QUIEN_LABELS[ultimaNota.conQuien] : "—"}
                    </div>
                    <p className="line-clamp-4">{ultimaNota.notas}</p>
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
                  Resumen de tutorías
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <div className="text-lg font-bold text-[#0B1D4D]">{tutoriasAlumno.length}</div>
                    <div className="text-[10px] text-slate-400">Total</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <div className="text-lg font-bold text-[#0B1D4D]">
                      {contarPorTipo(selectedAlumno.id, "FAMILIA")}
                    </div>
                    <div className="text-[10px] text-slate-400">Con familia</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <div className="text-lg font-bold text-[#0B1D4D]">
                      {contarPorTipo(selectedAlumno.id, "ALUMNO")}
                    </div>
                    <div className="text-[10px] text-slate-400">Con alumno</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <div className="text-[13px] font-bold text-[#0B1D4D]">
                      {proximoSeguimientoAlumno?.proximoSeguimiento
                        ? fmtFecha(proximoSeguimientoAlumno.proximoSeguimiento)
                        : "—"}
                    </div>
                    <div className="text-[10px] text-slate-400">Próx. seguimiento</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
