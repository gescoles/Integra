"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  GraduationCap,
  Calendar,
  Info,
  ChevronRight,
  BookOpen,
  Users,
  Target,
  Award,
  ListChecks,
  CalendarClock,
  Plus,
  Pencil,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { CrearCertificacionModal } from "./CrearCertificacionModal";
import { eliminarCertificacion } from "./actions";

type CursoCatalogo = {
  id: string;
  categoria: string;
  nombre: string;
  horasDefault: number | null;
  acercaDe: string | null;
  dirigidoA: string | null;
  objetivos: string | null;
  certificacionInfo: string | null;
  contenidos: string | null;
  proximasConvocatorias: string | null;
};

type Certificacion = {
  id: string;
  categoria: string;
  nombreCertificacion: string;
  cursoAcademico: string;
  cicloFormativo: string;
  horas: number | null;
  fechaInicioPreparacion: string;
  fechaFinPreparacion: string | null;
  fechaExamen: string | null;
  estado: string;
  codigoPue: string | null;
  entidadCertificadora: string | null;
  nivelMCE: string | null;
  duracionExamen: string | null;
  modalidad: string | null;
  sedeExamen: string | null;
  notas: string | null;
  creadoPorNombre: string | null;
  creadoPorId: string | null;
};

const ESTADO_BADGE: Record<string, string> = {
  PROXIMAMENTE: "bg-slate-100 text-slate-500",
  PROGRAMADA: "bg-amber-100 text-amber-700",
  EN_CURSO: "bg-blue-100 text-blue-700",
  ACTIVA: "bg-emerald-100 text-emerald-700",
  ACABADA: "bg-purple-100 text-purple-700",
};
const ESTADO_LABEL: Record<string, string> = {
  PROXIMAMENTE: "Próximamente",
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
  ACTIVA: "Activa",
  ACABADA: "Acabada",
};

function fecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fechaCorta(iso: string) {
  const d = new Date(iso);
  return { dia: d.getDate(), mes: d.toLocaleDateString("es-ES", { month: "short" }).toUpperCase().replace(".", "") };
}

export function CertificacionesClient({
  certificaciones,
  catalogo,
  categorias,
  departamentos,
  cursoAcademicoCentro,
  gruposCentro,
  profesores,
  esDirectivo,
  esSuperAdmin,
  userId,
}: {
  certificaciones: Certificacion[];
  catalogo: CursoCatalogo[];
  categorias: string[];
  departamentos: { id: string; nombre: string }[];
  cursoAcademicoCentro: string | null;
  gruposCentro: string[];
  profesores: { id: string; nombre: string; cantidad: number }[];
  esDirectivo: boolean;
  esSuperAdmin: boolean;
  userId: string | null;
}) {
  const [vista, setVista] = useState<"solicitudes" | "catalogo">("solicitudes");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");
  const [cicloFiltro, setCicloFiltro] = useState("");
  const [profesorFiltro, setProfesorFiltro] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(certificaciones[0]?.id ?? null);
  const [certAEliminar, setCertAEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const router = useRouter();

  async function handleEliminar() {
    if (!certAEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarCertificacion(certAEliminar);
      setCertAEliminar(null);
      setSeleccionadaId(null);
      router.refresh();
    } catch (e) {
      setErrorEliminar(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setEliminando(false);
    }
  }

  const cursos = useMemo(() => Array.from(new Set(certificaciones.map((c) => c.cursoAcademico))).sort(), [certificaciones]);

  const filtradas = useMemo(() => {
    let lista = certificaciones;
    if (categoriaFiltro) lista = lista.filter((c) => c.categoria === categoriaFiltro);
    if (cursoFiltro) lista = lista.filter((c) => c.cursoAcademico === cursoFiltro);
    if (cicloFiltro) lista = lista.filter((c) => c.cicloFormativo === cicloFiltro);
    if (profesorFiltro) lista = lista.filter((c) => c.creadoPorId === profesorFiltro);
    return lista;
  }, [certificaciones, categoriaFiltro, cursoFiltro, cicloFiltro, profesorFiltro]);

  const seleccionada = filtradas.find((c) => c.id === seleccionadaId) ?? filtradas[0] ?? null;

  const proximasFechas = useMemo(() => {
    const eventos: { titulo: string; certificacion: string; fecha: string }[] = [];
    for (const c of certificaciones) {
      if (c.fechaExamen) eventos.push({ titulo: "Fecha de examen", certificacion: c.nombreCertificacion, fecha: c.fechaExamen });
      if (c.fechaFinPreparacion) eventos.push({ titulo: "Fin de preparación", certificacion: c.nombreCertificacion, fecha: c.fechaFinPreparacion });
      eventos.push({ titulo: "Inicio de preparación", certificacion: c.nombreCertificacion, fecha: c.fechaInicioPreparacion });
    }
    const hoy = new Date().toISOString();
    return eventos
      .filter((e) => e.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5);
  }, [certificaciones]);

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm" style={{ width: "fit-content" }}>
        <button
          onClick={() => setVista("solicitudes")}
          className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${vista === "solicitudes" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
        >
          Solicitudes de certificación
        </button>
        <button
          onClick={() => setVista("catalogo")}
          className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${vista === "catalogo" ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"}`}
        >
          Catálogo de cursos
        </button>
      </div>

      {vista === "solicitudes" && (
      <>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-red-400" /> Categoría
          </label>
          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <GraduationCap className="h-3.5 w-3.5 text-blue-400" /> Curso
          </label>
          <select value={cursoFiltro} onChange={(e) => setCursoFiltro(e.target.value)} className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]">
            <option value="">Todos</option>
            {cursos.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {esDirectivo && (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Ciclo formativo</label>
              <select value={cicloFiltro} onChange={(e) => setCicloFiltro(e.target.value)} className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]">
                <option value="">Todos los ciclos</option>
                {gruposCentro.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Profesor</label>
              <select value={profesorFiltro} onChange={(e) => setProfesorFiltro(e.target.value)} className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]">
                <option value="">Todos los profesores</option>
                {profesores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.cantidad})</option>
                ))}
              </select>
            </div>
          </>
        )}
        <CrearCertificacionModal categorias={categorias} departamentos={departamentos} cursoAcademicoCentro={cursoAcademicoCentro} gruposCentro={gruposCentro} />
        {esSuperAdmin && (
          <a
            href="/api/superadmin/exportar-certificaciones"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
          </a>
        )}
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        <Info className="h-4 w-4 shrink-0" />
        {esDirectivo ? "Puedes ver todas las certificaciones del centro y filtrar por ciclo o profesor." : "Todos los docentes pueden consultar certificaciones filtrando por categoría y curso."}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1D4D]">Certificaciones disponibles ({filtradas.length})</h3>
          </div>
          <div className="space-y-1.5">
            {filtradas.map((c) => (
              <button
                key={c.id}
                onClick={() => setSeleccionadaId(c.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${
                  seleccionada?.id === c.id ? "border-[#FD5249] bg-red-50" : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                  {c.categoria.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{c.nombreCertificacion}</p>
                  <p className="truncate text-xs text-slate-400">{c.categoria} · {c.cursoAcademico}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ESTADO_BADGE[c.estado]}`}>{ESTADO_LABEL[c.estado]}</span>
              </button>
            ))}
            {filtradas.length === 0 && <p className="px-2 py-8 text-center text-sm text-slate-400">No hay certificaciones con estos filtros.</p>}
          </div>
          {filtradas.length > 0 && <p className="mt-3 text-center text-[11px] text-slate-400">Mostrando 1 a {filtradas.length} de {filtradas.length} certificaciones</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          {!seleccionada ? (
            <p className="py-16 text-center text-sm text-slate-400">Elige una certificación de la lista para ver el detalle.</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                    {seleccionada.categoria.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0B1D4D]">{seleccionada.nombreCertificacion}</h2>
                    <p className="text-xs text-slate-400">{seleccionada.categoria}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTADO_BADGE[seleccionada.estado]}`}>{ESTADO_LABEL[seleccionada.estado]}</span>
                  {(esDirectivo || seleccionada.creadoPorId === userId) && (
                    <>
                    <CrearCertificacionModal
                      categorias={categorias}
                      departamentos={departamentos}
                      cursoAcademicoCentro={cursoAcademicoCentro}
                      gruposCentro={gruposCentro}
                      certificacionId={seleccionada.id}
                      trigger={
                        <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                      }
                    />
                    <button
                      onClick={() => setCertAEliminar(seleccionada.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                    </>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Dato label="Categoría" valor={seleccionada.categoria} />
                <Dato label="Curso / Ciclo" valor={seleccionada.cursoAcademico} />
                <Dato label="Grupo asignado" valor={seleccionada.cicloFormativo} />
                <Dato label="Horas" valor={seleccionada.horas ? String(seleccionada.horas) : null} />
                <Dato label="Fecha de inicio de preparación" valor={fecha(seleccionada.fechaInicioPreparacion)} />
                <Dato label="Fecha de fin de preparación" valor={fecha(seleccionada.fechaFinPreparacion)} />
                <Dato label="Fecha de examen" valor={fecha(seleccionada.fechaExamen)} />
                <Dato label="Estado" valor={ESTADO_LABEL[seleccionada.estado]} />
                <Dato label="Responsable" valor={seleccionada.creadoPorNombre} />
              </dl>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Datos del examen</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Dato label="Duración del examen" valor={seleccionada.duracionExamen} />
                  <Dato label="Modalidad" valor={seleccionada.modalidad} />
                  <Dato label="Sede del examen" valor={seleccionada.sedeExamen} />
                </dl>
              </div>

              {seleccionada.notas && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Notas / Observaciones</h3>
                  <p className="text-sm text-slate-500">{seleccionada.notas}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#0B1D4D]">
            <Calendar className="h-4 w-4 text-red-400" /> Próximas fechas clave
          </h3>
          <div className="space-y-2.5">
            {proximasFechas.map((e, i) => {
              const { dia, mes } = fechaCorta(e.fecha);
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <span className="text-sm font-bold leading-none">{dia}</span>
                    <span className="text-[9px] font-bold leading-none">{mes}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">{e.titulo}</p>
                    <p className="truncate text-[11px] text-slate-400">{e.certificacion}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>
              );
            })}
            {proximasFechas.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No hay fechas próximas.</p>}
          </div>
        </div>
      </div>
      </>
      )}

      {vista === "catalogo" && (
        <CatalogoCursosVista
          catalogo={catalogo}
          categorias={categorias}
          departamentos={departamentos}
          cursoAcademicoCentro={cursoAcademicoCentro}
          gruposCentro={gruposCentro}
        />
      )}

      {certAEliminar && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-6" onClick={() => setCertAEliminar(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="text-base font-bold text-[#0B1D4D]">¿Eliminar esta certificación?</h3>
            <p className="mt-2 text-sm text-slate-500">Esta acción no se puede deshacer.</p>
            {errorEliminar && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorEliminar}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCertAEliminar(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleEliminar} disabled={eliminando} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogoCursosVista({
  catalogo,
  categorias,
  departamentos,
  cursoAcademicoCentro,
  gruposCentro,
}: {
  catalogo: CursoCatalogo[];
  categorias: string[];
  departamentos: { id: string; nombre: string }[];
  cursoAcademicoCentro: string | null;
  gruposCentro: string[];
}) {
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [cursoElegidoId, setCursoElegidoId] = useState<string | null>(catalogo[0]?.id ?? null);
  const [tabCurso, setTabCurso] = useState<"acerca" | "dirigido" | "objetivos" | "certificacion" | "contenidos" | "convocatorias">("acerca");

  const filtrados = categoriaFiltro ? catalogo.filter((c) => c.categoria === categoriaFiltro) : catalogo;
  const curso = filtrados.find((c) => c.id === cursoElegidoId) ?? filtrados[0] ?? null;

  const TABS_CURSO = [
    { key: "acerca" as const, label: "Acerca de este curso", icon: BookOpen },
    { key: "dirigido" as const, label: "Dirigido a", icon: Users },
    { key: "objetivos" as const, label: "Objetivos", icon: Target },
    { key: "certificacion" as const, label: "Certificación", icon: Award },
    { key: "contenidos" as const, label: "Contenidos", icon: ListChecks },
    { key: "convocatorias" as const, label: "Próximas convocatorias", icon: CalendarClock },
  ];

  const contenidoPorTab: Record<string, string | null> = curso
    ? {
        acerca: curso.acercaDe,
        dirigido: curso.dirigidoA,
        objetivos: curso.objetivos,
        certificacion: curso.certificacionInfo,
        contenidos: curso.contenidos,
        convocatorias: curso.proximasConvocatorias,
      }
    : {};

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="space-y-1.5">
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCursoElegidoId(c.id);
                setTabCurso("acerca");
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${
                curso?.id === c.id ? "border-[#FD5249] bg-red-50" : "border-slate-100 hover:bg-slate-50"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                {c.categoria.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{c.nombre}</p>
                <p className="truncate text-xs text-slate-400">{c.categoria}{c.horasDefault ? ` · ${c.horasDefault}h` : ""}</p>
              </div>
            </button>
          ))}
          {filtrados.length === 0 && <p className="px-2 py-8 text-center text-sm text-slate-400">No hay cursos en esta categoría todavía.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {!curso ? (
          <p className="py-16 text-center text-sm text-slate-400">Elige un curso de la lista para consultar su información.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">{curso.nombre}</h2>
                <p className="text-sm text-slate-400">{curso.categoria}{curso.horasDefault ? ` · ${curso.horasDefault} horas` : ""}</p>
              </div>
              <CrearCertificacionModal
                categorias={categorias}
                departamentos={departamentos}
                cursoAcademicoCentro={cursoAcademicoCentro}
                gruposCentro={gruposCentro}
                categoriaInicial={curso.categoria}
                nombreInicial={curso.nombre}
                trigger={
                  <button className="flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]">
                    <Plus className="h-4 w-4" /> Programar Certificación
                  </button>
                }
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-100">
              {TABS_CURSO.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTabCurso(t.key)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    tabCurso === t.key ? "border-[#FD5249] text-[#FD5249]" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            <div className="whitespace-pre-line text-sm text-slate-600">
              {contenidoPorTab[tabCurso] || "Todavía no hay información en este apartado para este curso."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{valor || "—"}</dd>
    </div>
  );
}
